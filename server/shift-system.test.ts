import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb, calculateDailyFinanceFromAttendance } from './db.js';
import { eq } from 'drizzle-orm';

describe('Shift System Tests', () => {
  let db: any;
  let testGroupId: number;
  let testWorkerId: number;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error('Database not available');

    const { groups, workers } = await import('../drizzle/schema');

    // Create test group with shift times
    await db.insert(groups).values({
      code: 'SHIFT-TEST',
      name: 'Shift Test Group',
      dailyWage: 150,
      workMinutes: 480, // 8 hours
      latePenaltyRate: 0.5,
      earlyLeavePenaltyRate: 0.5,
      shiftStartTime: '08:00',
      shiftEndTime: '17:00',
      isActive: true,
    });
    const [group] = await db.select().from(groups).where(eq(groups.code, 'SHIFT-TEST')).limit(1);
    testGroupId = group.id;

    // Create test worker
    await db.insert(workers).values({
      code: 'SHIFT-W001',
      fullName: 'Shift Test Worker',
      groupId: testGroupId,
      dailyRate: 150,
      status: 'active',
    });
    const [worker] = await db.select().from(workers).where(eq(workers.code, 'SHIFT-W001')).limit(1);
    testWorkerId = worker.id;
  });

  afterAll(async () => {
    if (!db) return;
    const { workers, groups, attendanceEvents } = await import('../drizzle/schema');
    await db.delete(attendanceEvents).where(eq(attendanceEvents.workerId, testWorkerId));
    await db.delete(workers).where(eq(workers.id, testWorkerId));
    await db.delete(groups).where(eq(groups.id, testGroupId));
  });

  describe('Early Arrival (Before Shift Start)', () => {
    it('should NOT count early arrival financially', async () => {
      const { attendanceEvents } = await import('../drizzle/schema');
      
      // Clean up first
      await db.delete(attendanceEvents).where(eq(attendanceEvents.workerId, testWorkerId));
      
      // Worker arrives at 07:30 (30 minutes before shift start 08:00)
      const testDate = '2026-01-20';
      const checkInTime = new Date(`${testDate}T07:30:00`);
      const checkOutTime = new Date(`${testDate}T17:00:00`);

      // Insert attendance events
      await db.insert(attendanceEvents).values([
        { workerId: testWorkerId, eventType: 'check_in', eventTime: checkInTime, method: 'manual' },
        { workerId: testWorkerId, eventType: 'check_out', eventTime: checkOutTime, method: 'manual' },
      ]);

      // Calculate finance
      const result = await calculateDailyFinanceFromAttendance(testWorkerId, testDate);

      // Should get full daily wage (no deductions)
      expect(result.baseAmount).toBe(150);
      expect(result.deductions).toBe(0);
      expect(result.lateMinutes).toBe(0); // Early arrival is NOT late

      // Cleanup
      await db.delete(attendanceEvents).where(eq(attendanceEvents.workerId, testWorkerId));
    });
  });

  describe('Late Arrival (After Shift Start)', () => {
    it('should calculate late penalty correctly', async () => {
      const { attendanceEvents } = await import('../drizzle/schema');
      
      // Clean up first
      await db.delete(attendanceEvents).where(eq(attendanceEvents.workerId, testWorkerId));
      
      // Worker arrives at 08:30 (30 minutes late)
      const testDate = '2026-01-20';
      const checkInTime = new Date(`${testDate}T08:30:00`);
      const checkOutTime = new Date(`${testDate}T17:00:00`);

      await db.insert(attendanceEvents).values([
        { workerId: testWorkerId, eventType: 'check_in', eventTime: checkInTime, method: 'manual' },
        { workerId: testWorkerId, eventType: 'check_out', eventTime: checkOutTime, method: 'manual' },
      ]);

      const result = await calculateDailyFinanceFromAttendance(testWorkerId, testDate);

      expect(result.lateMinutes).toBe(30);
      // Penalty = (150 / 480) * 30 * (1 + 0.5) = 0.3125 * 30 * 1.5 = 14.06
      expect(result.deductions).toBeGreaterThan(14);
      expect(result.deductions).toBeLessThan(15);

      await db.delete(attendanceEvents).where(eq(attendanceEvents.workerId, testWorkerId));
    });
  });

  describe('Late Departure (After Shift End)', () => {
    it('should NOT count late departure as overtime', async () => {
      const { attendanceEvents } = await import('../drizzle/schema');
      
      // Clean up first
      await db.delete(attendanceEvents).where(eq(attendanceEvents.workerId, testWorkerId));
      
      // Worker leaves at 18:00 (1 hour after shift end 17:00)
      const testDate = '2026-01-20';
      const checkInTime = new Date(`${testDate}T08:00:00`);
      const checkOutTime = new Date(`${testDate}T18:00:00`);

      await db.insert(attendanceEvents).values([
        { workerId: testWorkerId, eventType: 'check_in', eventTime: checkInTime, method: 'manual' },
        { workerId: testWorkerId, eventType: 'check_out', eventTime: checkOutTime, method: 'manual' },
      ]);

      const result = await calculateDailyFinanceFromAttendance(testWorkerId, testDate);

      // Should get full daily wage (no bonus for late departure)
      expect(result.baseAmount).toBe(150);
      expect(result.deductions).toBe(0);
      expect(result.bonuses).toBe(0); // No automatic overtime
      expect(result.earlyLeaveMinutes).toBe(0); // Late departure is NOT early leave

      await db.delete(attendanceEvents).where(eq(attendanceEvents.workerId, testWorkerId));
    });
  });

  describe('Early Departure (Before Shift End)', () => {
    it('should calculate early leave penalty correctly', async () => {
      const { attendanceEvents } = await import('../drizzle/schema');
      
      // Clean up first
      await db.delete(attendanceEvents).where(eq(attendanceEvents.workerId, testWorkerId));
      
      // Worker leaves at 16:00 (1 hour before shift end 17:00)
      const testDate = '2026-01-20';
      const checkInTime = new Date(`${testDate}T08:00:00`);
      const checkOutTime = new Date(`${testDate}T16:00:00`);

      await db.insert(attendanceEvents).values([
        { workerId: testWorkerId, eventType: 'check_in', eventTime: checkInTime, method: 'manual' },
        { workerId: testWorkerId, eventType: 'check_out', eventTime: checkOutTime, method: 'manual' },
      ]);

      const result = await calculateDailyFinanceFromAttendance(testWorkerId, testDate);

      expect(result.earlyLeaveMinutes).toBe(60);
      // Penalty = (150 / 480) * 60 * (1 + 0.5) = 0.3125 * 60 * 1.5 = 28.13
      expect(result.deductions).toBeGreaterThan(28);
      expect(result.deductions).toBeLessThan(29);

      await db.delete(attendanceEvents).where(eq(attendanceEvents.workerId, testWorkerId));
    });
  });

  describe('Combined Early Arrival and Late Departure', () => {
    it('should ignore both early arrival and late departure financially', async () => {
      const { attendanceEvents } = await import('../drizzle/schema');
      
      // Clean up first
      await db.delete(attendanceEvents).where(eq(attendanceEvents.workerId, testWorkerId));
      
      // Worker: 07:00 - 18:30 (1 hour early, 1.5 hours late)
      const testDate = '2026-01-20';
      const checkInTime = new Date(`${testDate}T07:00:00`);
      const checkOutTime = new Date(`${testDate}T18:30:00`);

      await db.insert(attendanceEvents).values([
        { workerId: testWorkerId, eventType: 'check_in', eventTime: checkInTime, method: 'manual' },
        { workerId: testWorkerId, eventType: 'check_out', eventTime: checkOutTime, method: 'manual' },
      ]);

      const result = await calculateDailyFinanceFromAttendance(testWorkerId, testDate);

      // Should only count shift time (08:00 - 17:00)
      expect(result.baseAmount).toBe(150);
      expect(result.deductions).toBe(0);
      expect(result.bonuses).toBe(0);
      expect(result.lateMinutes).toBe(0);
      expect(result.earlyLeaveMinutes).toBe(0);

      await db.delete(attendanceEvents).where(eq(attendanceEvents.workerId, testWorkerId));
    });
  });

  describe('Combined Late Arrival and Early Departure', () => {
    it('should calculate both penalties correctly', async () => {
      const { attendanceEvents } = await import('../drizzle/schema');
      
      // Clean up first
      await db.delete(attendanceEvents).where(eq(attendanceEvents.workerId, testWorkerId));
      
      // Worker: 09:00 - 16:00 (1 hour late, 1 hour early leave)
      const testDate = '2026-01-20';
      const checkInTime = new Date(`${testDate}T09:00:00`);
      const checkOutTime = new Date(`${testDate}T16:00:00`);

      await db.insert(attendanceEvents).values([
        { workerId: testWorkerId, eventType: 'check_in', eventTime: checkInTime, method: 'manual' },
        { workerId: testWorkerId, eventType: 'check_out', eventTime: checkOutTime, method: 'manual' },
      ]);

      const result = await calculateDailyFinanceFromAttendance(testWorkerId, testDate);

      expect(result.lateMinutes).toBe(60);
      expect(result.earlyLeaveMinutes).toBe(60);
      // Total penalty = late penalty + early leave penalty
      // = (150/480)*60*1.5 + (150/480)*60*1.5 = 28.13 + 28.13 = 56.26
      expect(result.deductions).toBeGreaterThan(56);
      expect(result.deductions).toBeLessThan(57);

      await db.delete(attendanceEvents).where(eq(attendanceEvents.workerId, testWorkerId));
    });
  });
});
