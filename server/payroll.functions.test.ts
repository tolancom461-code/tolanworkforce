import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from './db';
import { 
  groups, 
  workers, 
  attendanceEvents, 
  groupSchedules 
} from '../drizzle/schema';
import { sql } from 'drizzle-orm';

describe('Payroll Functions', () => {
  let testGroupId: number;
  let testWorkerId: number;
  const testDate = new Date('2024-01-25');

  beforeAll(async () => {
    // Create test group
    const groupResult = await db.insert(groups).values({
      code: 'TEST-GROUP-001',
      name: 'Test Group',
      dailyRate: 500,
      workHours: 8,
      isActive: true,
    }).returning({ id: groups.id });
    
    testGroupId = groupResult[0].id;

    // Create test worker
    const workerResult = await db.insert(workers).values({
      code: 'TEST-WORKER-001',
      fullName: 'Test Worker',
      groupId: testGroupId,
      dailyRate: 500,
      status: 'active',
    }).returning({ id: workers.id });
    
    testWorkerId = workerResult[0].id;

    // Create group schedule for Thursday (day_of_week = 4)
    await db.insert(groupSchedules).values({
      groupId: testGroupId,
      dayOfWeek: 4,
      startTime: '06:00',
      endTime: '14:00',
      requiredHours: 8,
      isActive: true,
    });
  });

  afterAll(async () => {
    // Cleanup - delete test data
    await db.delete(attendanceEvents).where(sql`worker_id = ${testWorkerId}`);
    await db.delete(workers).where(sql`id = ${testWorkerId}`);
    await db.delete(groupSchedules).where(sql`group_id = ${testGroupId}`);
    await db.delete(groups).where(sql`id = ${testGroupId}`);
  });

  describe('calculate_daily_payroll', () => {
    it('should calculate payroll for complete attendance', async () => {
      // Insert check-in and check-out
      await db.insert(attendanceEvents).values([
        {
          workerId: testWorkerId,
          eventType: 'check_in',
          eventTime: new Date('2024-01-25 06:00:00'),
          method: 'qr_code',
        },
        {
          workerId: testWorkerId,
          eventType: 'check_out',
          eventTime: new Date('2024-01-25 14:00:00'),
          method: 'qr_code',
        },
      ]);

      // Call function
      const result = await db.execute(
        sql`SELECT * FROM calculate_daily_payroll(${testWorkerId}, '2024-01-25')`
      );

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      
      const payroll = result[0];
      expect(payroll.worker_id).toBe(testWorkerId);
      expect(payroll.work_date).toBe('2024-01-25');
      expect(payroll.scheduled_hours).toBe(8);
      expect(payroll.actual_hours).toBe(8);
      expect(payroll.late_minutes).toBe(0);
      expect(payroll.early_departure_minutes).toBe(0);
      expect(payroll.calculated_pay).toBe(500);
      expect(payroll.status).toBe('COMPLETED');
    });

    it('should handle late arrival', async () => {
      // Insert late check-in
      await db.insert(attendanceEvents).values([
        {
          workerId: testWorkerId,
          eventType: 'check_in',
          eventTime: new Date('2024-01-26 06:30:00'),
          method: 'qr_code',
        },
        {
          workerId: testWorkerId,
          eventType: 'check_out',
          eventTime: new Date('2024-01-26 14:00:00'),
          method: 'qr_code',
        },
      ]);

      const result = await db.execute(
        sql`SELECT * FROM calculate_daily_payroll(${testWorkerId}, '2024-01-26')`
      );

      expect(result).toBeDefined();
      const payroll = result[0];
      expect(payroll.late_minutes).toBe(30);
      expect(payroll.actual_hours).toBe(7.5);
    });

    it('should handle early departure', async () => {
      // Insert early check-out
      await db.insert(attendanceEvents).values([
        {
          workerId: testWorkerId,
          eventType: 'check_in',
          eventTime: new Date('2024-01-27 06:00:00'),
          method: 'qr_code',
        },
        {
          workerId: testWorkerId,
          eventType: 'check_out',
          eventTime: new Date('2024-01-27 13:00:00'),
          method: 'qr_code',
        },
      ]);

      const result = await db.execute(
        sql`SELECT * FROM calculate_daily_payroll(${testWorkerId}, '2024-01-27')`
      );

      expect(result).toBeDefined();
      const payroll = result[0];
      expect(payroll.early_departure_minutes).toBe(60);
      expect(payroll.actual_hours).toBe(7);
    });

    it('should handle missing check-out', async () => {
      // Insert only check-in
      await db.insert(attendanceEvents).values({
        workerId: testWorkerId,
        eventType: 'check_in',
        eventTime: new Date('2024-01-28 06:00:00'),
        method: 'qr_code',
      });

      const result = await db.execute(
        sql`SELECT * FROM calculate_daily_payroll(${testWorkerId}, '2024-01-28')`
      );

      expect(result).toBeDefined();
      const payroll = result[0];
      expect(payroll.is_auto_completed).toBe(true);
      expect(payroll.status).toBe('PENDING_REVIEW');
    });

    it('should handle missing check-in', async () => {
      // Insert only check-out
      await db.insert(attendanceEvents).values({
        workerId: testWorkerId,
        eventType: 'check_out',
        eventTime: new Date('2024-01-29 14:00:00'),
        method: 'qr_code',
      });

      const result = await db.execute(
        sql`SELECT * FROM calculate_daily_payroll(${testWorkerId}, '2024-01-29')`
      );

      expect(result).toBeDefined();
      const payroll = result[0];
      expect(payroll.is_auto_completed).toBe(true);
      expect(payroll.status).toBe('PENDING_REVIEW');
    });

    it('should return empty for non-existent worker', async () => {
      const result = await db.execute(
        sql`SELECT * FROM calculate_daily_payroll(99999, '2024-01-25')`
      );

      expect(result).toBeDefined();
      expect(result.length).toBe(0);
    });
  });

  describe('detect_missing_punches', () => {
    it('should detect complete attendance', async () => {
      // Insert complete attendance
      await db.insert(attendanceEvents).values([
        {
          workerId: testWorkerId,
          eventType: 'check_in',
          eventTime: new Date('2024-02-01 06:00:00'),
          method: 'qr_code',
        },
        {
          workerId: testWorkerId,
          eventType: 'check_out',
          eventTime: new Date('2024-02-01 14:00:00'),
          method: 'qr_code',
        },
      ]);

      const result = await db.execute(
        sql`SELECT * FROM detect_missing_punches(${testWorkerId}, '2024-02-01')`
      );

      expect(result).toBeDefined();
      const detection = result[0];
      expect(detection.has_check_in).toBe(true);
      expect(detection.has_check_out).toBe(true);
      expect(detection.issue_type).toBe('COMPLETE');
      expect(detection.needs_review).toBe(false);
    });

    it('should detect missing check-in', async () => {
      // Insert only check-out
      await db.insert(attendanceEvents).values({
        workerId: testWorkerId,
        eventType: 'check_out',
        eventTime: new Date('2024-02-02 14:00:00'),
        method: 'qr_code',
      });

      const result = await db.execute(
        sql`SELECT * FROM detect_missing_punches(${testWorkerId}, '2024-02-02')`
      );

      expect(result).toBeDefined();
      const detection = result[0];
      expect(detection.has_check_in).toBe(false);
      expect(detection.has_check_out).toBe(true);
      expect(detection.issue_type).toBe('MISSING_CHECK_IN');
      expect(detection.needs_review).toBe(true);
    });

    it('should detect missing check-out', async () => {
      // Insert only check-in
      await db.insert(attendanceEvents).values({
        workerId: testWorkerId,
        eventType: 'check_in',
        eventTime: new Date('2024-02-03 06:00:00'),
        method: 'qr_code',
      });

      const result = await db.execute(
        sql`SELECT * FROM detect_missing_punches(${testWorkerId}, '2024-02-03')`
      );

      expect(result).toBeDefined();
      const detection = result[0];
      expect(detection.has_check_in).toBe(true);
      expect(detection.has_check_out).toBe(false);
      expect(detection.issue_type).toBe('MISSING_CHECK_OUT');
      expect(detection.needs_review).toBe(true);
    });

    it('should detect no punch', async () => {
      const result = await db.execute(
        sql`SELECT * FROM detect_missing_punches(${testWorkerId}, '2024-02-04')`
      );

      expect(result).toBeDefined();
      const detection = result[0];
      expect(detection.has_check_in).toBe(false);
      expect(detection.has_check_out).toBe(false);
      expect(detection.issue_type).toBe('NO_PUNCH');
      expect(detection.needs_review).toBe(true);
    });
  });

  describe('calculate_group_payroll', () => {
    it('should calculate group payroll summary', async () => {
      // Insert attendance for all workers in group
      await db.insert(attendanceEvents).values([
        {
          workerId: testWorkerId,
          eventType: 'check_in',
          eventTime: new Date('2024-02-05 06:00:00'),
          method: 'qr_code',
        },
        {
          workerId: testWorkerId,
          eventType: 'check_out',
          eventTime: new Date('2024-02-05 14:00:00'),
          method: 'qr_code',
        },
      ]);

      const result = await db.execute(
        sql`SELECT * FROM calculate_group_payroll(${testGroupId}, '2024-02-05')`
      );

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      
      const summary = result[0];
      expect(summary.group_id).toBe(testGroupId);
      expect(summary.total_employees).toBeGreaterThan(0);
      expect(summary.total_hours_worked).toBeGreaterThan(0);
      expect(summary.total_payroll).toBeGreaterThan(0);
    });

    it('should count employees with issues', async () => {
      // Insert incomplete attendance
      await db.insert(attendanceEvents).values({
        workerId: testWorkerId,
        eventType: 'check_in',
        eventTime: new Date('2024-02-06 06:00:00'),
        method: 'qr_code',
      });

      const result = await db.execute(
        sql`SELECT * FROM calculate_group_payroll(${testGroupId}, '2024-02-06')`
      );

      expect(result).toBeDefined();
      const summary = result[0];
      expect(summary.employees_with_issues).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple check-ins on same day', async () => {
      // Insert multiple check-ins (should use first one)
      await db.insert(attendanceEvents).values([
        {
          workerId: testWorkerId,
          eventType: 'check_in',
          eventTime: new Date('2024-02-07 06:00:00'),
          method: 'qr_code',
        },
        {
          workerId: testWorkerId,
          eventType: 'check_in',
          eventTime: new Date('2024-02-07 06:30:00'),
          method: 'qr_code',
        },
        {
          workerId: testWorkerId,
          eventType: 'check_out',
          eventTime: new Date('2024-02-07 14:00:00'),
          method: 'qr_code',
        },
      ]);

      const result = await db.execute(
        sql`SELECT * FROM calculate_daily_payroll(${testWorkerId}, '2024-02-07')`
      );

      expect(result).toBeDefined();
      const payroll = result[0];
      // Should use first check-in (06:00)
      expect(payroll.late_minutes).toBe(0);
    });

    it('should handle multiple check-outs on same day', async () => {
      // Insert multiple check-outs (should use last one)
      await db.insert(attendanceEvents).values([
        {
          workerId: testWorkerId,
          eventType: 'check_in',
          eventTime: new Date('2024-02-08 06:00:00'),
          method: 'qr_code',
        },
        {
          workerId: testWorkerId,
          eventType: 'check_out',
          eventTime: new Date('2024-02-08 13:00:00'),
          method: 'qr_code',
        },
        {
          workerId: testWorkerId,
          eventType: 'check_out',
          eventTime: new Date('2024-02-08 14:00:00'),
          method: 'qr_code',
        },
      ]);

      const result = await db.execute(
        sql`SELECT * FROM calculate_daily_payroll(${testWorkerId}, '2024-02-08')`
      );

      expect(result).toBeDefined();
      const payroll = result[0];
      // Should use last check-out (14:00)
      expect(payroll.actual_hours).toBe(8);
    });

    it('should handle zero hours worked', async () => {
      // Insert check-in and check-out at same time
      const sameTime = new Date('2024-02-09 06:00:00');
      await db.insert(attendanceEvents).values([
        {
          workerId: testWorkerId,
          eventType: 'check_in',
          eventTime: sameTime,
          method: 'qr_code',
        },
        {
          workerId: testWorkerId,
          eventType: 'check_out',
          eventTime: sameTime,
          method: 'qr_code',
        },
      ]);

      const result = await db.execute(
        sql`SELECT * FROM calculate_daily_payroll(${testWorkerId}, '2024-02-09')`
      );

      expect(result).toBeDefined();
      const payroll = result[0];
      expect(payroll.actual_hours).toBe(0);
      expect(payroll.calculated_pay).toBe(0);
    });

    it('should handle negative time differences gracefully', async () => {
      // Insert check-out before check-in (invalid scenario)
      await db.insert(attendanceEvents).values([
        {
          workerId: testWorkerId,
          eventType: 'check_out',
          eventTime: new Date('2024-02-10 06:00:00'),
          method: 'qr_code',
        },
        {
          workerId: testWorkerId,
          eventType: 'check_in',
          eventTime: new Date('2024-02-10 14:00:00'),
          method: 'qr_code',
        },
      ]);

      const result = await db.execute(
        sql`SELECT * FROM calculate_daily_payroll(${testWorkerId}, '2024-02-10')`
      );

      expect(result).toBeDefined();
      // Should handle gracefully without crashing
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance', () => {
    it('should calculate payroll within acceptable time', async () => {
      const startTime = Date.now();
      
      await db.execute(
        sql`SELECT * FROM calculate_daily_payroll(${testWorkerId}, '2024-01-25')`
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 1 second
      expect(duration).toBeLessThan(1000);
    });

    it('should handle group payroll calculation efficiently', async () => {
      const startTime = Date.now();
      
      await db.execute(
        sql`SELECT * FROM calculate_group_payroll(${testGroupId}, '2024-01-25')`
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 2 seconds
      expect(duration).toBeLessThan(2000);
    });
  });
});
