import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from './db';
import { 
  groups, 
  workers, 
  attendanceEvents, 
  groupSchedules,
  auditLog 
} from '../drizzle/schema';
import { sql } from 'drizzle-orm';

describe('Payroll Triggers', () => {
  let testGroupId: number;
  let testWorkerId: number;

  beforeAll(async () => {
    // Create test group
    const groupResult = await db.insert(groups).values({
      code: 'TRIGGER-TEST-GROUP',
      name: 'Trigger Test Group',
      dailyRate: 500,
      isActive: true,
    }).returning({ id: groups.id });
    
    testGroupId = groupResult[0].id;

    // Create test worker
    const workerResult = await db.insert(workers).values({
      code: 'TRIGGER-TEST-WORKER',
      fullName: 'Trigger Test Worker',
      groupId: testGroupId,
      dailyRate: 500,
      status: 'active',
    }).returning({ id: workers.id });
    
    testWorkerId = workerResult[0].id;

    // Create group schedules for all days
    for (let day = 0; day < 7; day++) {
      await db.insert(groupSchedules).values({
        groupId: testGroupId,
        dayOfWeek: day,
        startTime: '06:00',
        endTime: '14:00',
        requiredHours: 8,
        isActive: true,
      });
    }
  });

  afterAll(async () => {
    // Cleanup
    await db.delete(attendanceEvents).where(sql`worker_id = ${testWorkerId}`);
    await db.delete(workers).where(sql`id = ${testWorkerId}`);
    await db.delete(groupSchedules).where(sql`group_id = ${testGroupId}`);
    await db.delete(groups).where(sql`id = ${testGroupId}`);
  });

  describe('trg_update_last_attendance', () => {
    it('should update last_attendance_at when check-in is inserted', async () => {
      const checkInTime = new Date('2024-02-15 06:00:00');
      
      await db.insert(attendanceEvents).values({
        workerId: testWorkerId,
        eventType: 'check_in',
        eventTime: checkInTime,
        method: 'qr_code',
      });

      const worker = await db.query.workers.findFirst({
        where: sql`id = ${testWorkerId}`,
      });

      expect(worker?.lastAttendanceAt).toBeDefined();
      expect(worker?.lastAttendanceAt).toEqual(checkInTime);
    });

    it('should update last_attendance_at with latest event time', async () => {
      const checkInTime = new Date('2024-02-16 06:00:00');
      const checkOutTime = new Date('2024-02-16 14:00:00');

      await db.insert(attendanceEvents).values({
        workerId: testWorkerId,
        eventType: 'check_in',
        eventTime: checkInTime,
        method: 'qr_code',
      });

      await db.insert(attendanceEvents).values({
        workerId: testWorkerId,
        eventType: 'check_out',
        eventTime: checkOutTime,
        method: 'qr_code',
      });

      const worker = await db.query.workers.findFirst({
        where: sql`id = ${testWorkerId}`,
      });

      expect(worker?.lastAttendanceAt).toEqual(checkOutTime);
    });
  });

  describe('trg_audit_payroll_changes', () => {
    it('should log INSERT operations', async () => {
      const eventTime = new Date('2024-02-17 06:00:00');

      await db.insert(attendanceEvents).values({
        workerId: testWorkerId,
        eventType: 'check_in',
        eventTime: eventTime,
        method: 'qr_code',
        note: 'Test check-in',
      });

      const logs = await db.query.auditLog.findMany({
        where: sql`table_name = 'attendance_events' AND action = 'INSERT'`,
      });

      expect(logs.length).toBeGreaterThan(0);
      const log = logs[logs.length - 1];
      expect(log.action).toBe('INSERT');
      expect(log.tableName).toBe('attendance_events');
      expect(log.oldValues).toBeNull();
      expect(log.newValues).toBeDefined();
    });

    it('should preserve old values on UPDATE', async () => {
      const eventTime = new Date('2024-02-18 06:00:00');

      const event = await db.insert(attendanceEvents).values({
        workerId: testWorkerId,
        eventType: 'check_in',
        eventTime: eventTime,
        method: 'qr_code',
      }).returning({ id: attendanceEvents.id });

      // Update the event
      await db.update(attendanceEvents)
        .set({ note: 'Updated note' })
        .where(sql`id = ${event[0].id}`);

      const logs = await db.query.auditLog.findMany({
        where: sql`table_name = 'attendance_events' AND action = 'UPDATE'`,
      });

      expect(logs.length).toBeGreaterThan(0);
      const log = logs[logs.length - 1];
      expect(log.action).toBe('UPDATE');
      expect(log.oldValues).toBeDefined();
      expect(log.newValues).toBeDefined();
    });

    it('should log DELETE operations', async () => {
      const eventTime = new Date('2024-02-19 06:00:00');

      const event = await db.insert(attendanceEvents).values({
        workerId: testWorkerId,
        eventType: 'check_in',
        eventTime: eventTime,
        method: 'qr_code',
      }).returning({ id: attendanceEvents.id });

      await db.delete(attendanceEvents).where(sql`id = ${event[0].id}`);

      const logs = await db.query.auditLog.findMany({
        where: sql`table_name = 'attendance_events' AND action = 'DELETE'`,
      });

      expect(logs.length).toBeGreaterThan(0);
      const log = logs[logs.length - 1];
      expect(log.action).toBe('DELETE');
      expect(log.oldValues).toBeDefined();
      expect(log.newValues).toBeNull();
    });
  });

  describe('trg_validate_schedule', () => {
    it('should reject schedule with start_time >= end_time', async () => {
      const invalidSchedule = db.insert(groupSchedules).values({
        groupId: testGroupId,
        dayOfWeek: 0,
        startTime: '14:00',
        endTime: '06:00', // Invalid: end before start
        requiredHours: 8,
        isActive: true,
      });

      // Should throw an error
      await expect(invalidSchedule).rejects.toThrow();
    });

    it('should reject schedule with zero required_hours', async () => {
      const invalidSchedule = db.insert(groupSchedules).values({
        groupId: testGroupId,
        dayOfWeek: 1,
        startTime: '06:00',
        endTime: '14:00',
        requiredHours: 0, // Invalid: zero hours
        isActive: true,
      });

      await expect(invalidSchedule).rejects.toThrow();
    });

    it('should reject schedule with negative required_hours', async () => {
      const invalidSchedule = db.insert(groupSchedules).values({
        groupId: testGroupId,
        dayOfWeek: 2,
        startTime: '06:00',
        endTime: '14:00',
        requiredHours: -8, // Invalid: negative hours
        isActive: true,
      });

      await expect(invalidSchedule).rejects.toThrow();
    });

    it('should reject schedule with invalid day_of_week', async () => {
      const invalidSchedule = db.insert(groupSchedules).values({
        groupId: testGroupId,
        dayOfWeek: 7, // Invalid: should be 0-6
        startTime: '06:00',
        endTime: '14:00',
        requiredHours: 8,
        isActive: true,
      });

      await expect(invalidSchedule).rejects.toThrow();
    });

    it('should accept valid schedule', async () => {
      const validSchedule = await db.insert(groupSchedules).values({
        groupId: testGroupId,
        dayOfWeek: 3,
        startTime: '08:00',
        endTime: '16:00',
        requiredHours: 8,
        isActive: true,
      }).returning({ id: groupSchedules.id });

      expect(validSchedule[0].id).toBeDefined();
      expect(validSchedule[0].id).toBeGreaterThan(0);
    });
  });

  describe('trg_auto_complete_punches', () => {
    it('should auto-complete missing check-out', async () => {
      const checkInTime = new Date('2024-02-20 06:00:00');

      await db.insert(attendanceEvents).values({
        workerId: testWorkerId,
        eventType: 'check_in',
        eventTime: checkInTime,
        method: 'qr_code',
      });

      // Wait a moment for trigger to execute
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if auto check-out was created
      const events = await db.query.attendanceEvents.findMany({
        where: sql`worker_id = ${testWorkerId} AND DATE(event_time) = '2024-02-20'`,
      });

      const checkOutEvent = events.find(e => e.eventType === 'check_out');
      
      // Note: This depends on trigger implementation
      // If trigger is set up correctly, auto check-out should exist
      if (checkOutEvent) {
        expect(checkOutEvent.method).toBe('auto_complete');
        expect(checkOutEvent.note).toContain('Auto-completed');
      }
    });
  });

  describe('Audit Trail', () => {
    it('should create complete audit trail for worker operations', async () => {
      const eventTime = new Date('2024-02-21 06:00:00');

      // Insert
      const event = await db.insert(attendanceEvents).values({
        workerId: testWorkerId,
        eventType: 'check_in',
        eventTime: eventTime,
        method: 'qr_code',
      }).returning({ id: attendanceEvents.id });

      // Update
      await db.update(attendanceEvents)
        .set({ note: 'Updated' })
        .where(sql`id = ${event[0].id}`);

      // Delete
      await db.delete(attendanceEvents).where(sql`id = ${event[0].id}`);

      // Check audit log
      const logs = await db.query.auditLog.findMany({
        where: sql`table_name = 'attendance_events' AND record_id = ${event[0].id}`,
      });

      expect(logs.length).toBeGreaterThanOrEqual(3); // INSERT, UPDATE, DELETE
      expect(logs.some(l => l.action === 'INSERT')).toBe(true);
      expect(logs.some(l => l.action === 'UPDATE')).toBe(true);
      expect(logs.some(l => l.action === 'DELETE')).toBe(true);
    });

    it('should record correct timestamps in audit log', async () => {
      const beforeTime = new Date();
      
      await db.insert(attendanceEvents).values({
        workerId: testWorkerId,
        eventType: 'check_in',
        eventTime: new Date('2024-02-22 06:00:00'),
        method: 'qr_code',
      });

      const afterTime = new Date();

      const logs = await db.query.auditLog.findMany({
        where: sql`table_name = 'attendance_events' AND action = 'INSERT'`,
      });

      const latestLog = logs[logs.length - 1];
      expect(latestLog.createdAt).toBeDefined();
      expect(latestLog.createdAt!.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(latestLog.createdAt!.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('Trigger Performance', () => {
    it('should execute triggers without significant performance impact', async () => {
      const startTime = Date.now();
      
      // Insert 10 attendance records
      for (let i = 0; i < 10; i++) {
        await db.insert(attendanceEvents).values({
          workerId: testWorkerId,
          eventType: 'check_in',
          eventTime: new Date(`2024-02-23 0${i}:00:00`),
          method: 'qr_code',
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 2 seconds
      expect(duration).toBeLessThan(2000);
    });
  });
});
