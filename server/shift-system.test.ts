import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as db from './db.js';

describe('Shift System Tests', () => {
  let testGroupId: number;
  let testWorkerId: number;
  const testDate = '2026-01-20';

  beforeEach(async () => {
    // Create test group with shift times
    const groupResult = await db.createGroup({
      code: `SHIFT-TEST-${Date.now()}`,
      name: 'Shift Test Group',
      dailyWage: 150,
      workMinutes: 480, // 8 hours
      latePenaltyRate: 0.5,
      earlyLeavePenaltyRate: 0.5,
      shiftStartTime: '08:00',
      shiftEndTime: '17:00',
      isActive: true,
    });

    testGroupId = groupResult.id;

    // Create test worker
    const workerResult = await db.createWorker({
      code: `SHIFT-W-${Date.now()}`,
      fullName: 'Shift Test Worker',
      groupId: testGroupId,
      dailyRate: 150,
      status: 'active',
    });

    testWorkerId = workerResult.id;
  });

  afterEach(async () => {
    // Cleanup test data
    try {
      await db.deleteWorker(testWorkerId);
      await db.deleteGroup(testGroupId);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Early Arrival (Before Shift Start)', () => {
    it('should NOT count early arrival financially', async () => {
      // Worker arrives at 07:30 (30 minutes before shift start 08:00)
      const checkInTime = new Date(`${testDate}T07:30:00`);
      const checkOutTime = new Date(`${testDate}T17:00:00`);

      // Record attendance
      await db.recordAttendance({
        workerId: testWorkerId,
        timestamp: checkInTime,
        type: 'check_in',
        location: 'Main Office',
        createdBy: 1,
      });

      await db.recordAttendance({
        workerId: testWorkerId,
        timestamp: checkOutTime,
        type: 'check_out',
        location: 'Main Office',
        createdBy: 1,
      });

      // Calculate finance
      const result = await db.calculateDailyFinance(testWorkerId, testDate);

      // Should get full daily wage (no deductions)
      expect(result.baseAmount).toBe(150);
      expect(result.deductions).toBe(0);
      expect(result.lateMinutes).toBe(0); // Early arrival is NOT late
    });
  });

  describe('Late Arrival (After Shift Start)', () => {
    it('should calculate late penalty correctly', async () => {
      // Worker arrives at 08:30 (30 minutes late)
      const checkInTime = new Date(`${testDate}T08:30:00`);
      const checkOutTime = new Date(`${testDate}T17:00:00`);

      await db.recordAttendance({
        workerId: testWorkerId,
        timestamp: checkInTime,
        type: 'check_in',
        location: 'Main Office',
        createdBy: 1,
      });

      await db.recordAttendance({
        workerId: testWorkerId,
        timestamp: checkOutTime,
        type: 'check_out',
        location: 'Main Office',
        createdBy: 1,
      });

      const result = await db.calculateDailyFinance(testWorkerId, testDate);

      expect(result.lateMinutes).toBe(30);
      // Penalty = (150 / 480) * 30 * (1 + 0.5) = 0.3125 * 30 * 1.5 = 14.06
      expect(result.deductions).toBeGreaterThanOrEqual(14);
      expect(result.deductions).toBeLessThanOrEqual(15);
    });
  });

  describe('Late Departure (After Shift End)', () => {
    it('should NOT count late departure as overtime', async () => {
      // Worker leaves at 18:00 (1 hour after shift end 17:00)
      const checkInTime = new Date(`${testDate}T08:00:00`);
      const checkOutTime = new Date(`${testDate}T18:00:00`);

      await db.recordAttendance({
        workerId: testWorkerId,
        timestamp: checkInTime,
        type: 'check_in',
        location: 'Main Office',
        createdBy: 1,
      });

      await db.recordAttendance({
        workerId: testWorkerId,
        timestamp: checkOutTime,
        type: 'check_out',
        location: 'Main Office',
        createdBy: 1,
      });

      const result = await db.calculateDailyFinance(testWorkerId, testDate);

      // Should get full daily wage (no bonus for late departure)
      expect(result.baseAmount).toBe(150);
      expect(result.deductions).toBe(0);
      expect(result.bonuses).toBe(0); // No automatic overtime
      expect(result.earlyLeaveMinutes).toBe(0); // Late departure is NOT early leave
    });
  });

  describe('Early Departure (Before Shift End)', () => {
    it('should calculate early leave penalty correctly', async () => {
      // Worker leaves at 16:00 (1 hour before shift end 17:00)
      const checkInTime = new Date(`${testDate}T08:00:00`);
      const checkOutTime = new Date(`${testDate}T16:00:00`);

      await db.recordAttendance({
        workerId: testWorkerId,
        timestamp: checkInTime,
        type: 'check_in',
        location: 'Main Office',
        createdBy: 1,
      });

      await db.recordAttendance({
        workerId: testWorkerId,
        timestamp: checkOutTime,
        type: 'check_out',
        location: 'Main Office',
        createdBy: 1,
      });

      const result = await db.calculateDailyFinance(testWorkerId, testDate);

      expect(result.earlyLeaveMinutes).toBe(60);
      // Penalty = (150 / 480) * 60 * (1 + 0.5) = 0.3125 * 60 * 1.5 = 28.13
      expect(result.deductions).toBeGreaterThanOrEqual(28);
      expect(result.deductions).toBeLessThanOrEqual(29);
    });
  });

  describe('Combined Early Arrival and Late Departure', () => {
    it('should ignore both early arrival and late departure financially', async () => {
      // Worker: 07:00 - 18:30 (1 hour early, 1.5 hours late)
      const checkInTime = new Date(`${testDate}T07:00:00`);
      const checkOutTime = new Date(`${testDate}T18:30:00`);

      await db.recordAttendance({
        workerId: testWorkerId,
        timestamp: checkInTime,
        type: 'check_in',
        location: 'Main Office',
        createdBy: 1,
      });

      await db.recordAttendance({
        workerId: testWorkerId,
        timestamp: checkOutTime,
        type: 'check_out',
        location: 'Main Office',
        createdBy: 1,
      });

      const result = await db.calculateDailyFinance(testWorkerId, testDate);

      // Should only count shift time (08:00 - 17:00)
      expect(result.baseAmount).toBe(150);
      expect(result.deductions).toBe(0);
      expect(result.bonuses).toBe(0);
      expect(result.lateMinutes).toBe(0);
      expect(result.earlyLeaveMinutes).toBe(0);
    });
  });

  describe('Combined Late Arrival and Early Departure', () => {
    it('should calculate both penalties correctly', async () => {
      // Worker: 09:00 - 16:00 (1 hour late, 1 hour early leave)
      const checkInTime = new Date(`${testDate}T09:00:00`);
      const checkOutTime = new Date(`${testDate}T16:00:00`);

      await db.recordAttendance({
        workerId: testWorkerId,
        timestamp: checkInTime,
        type: 'check_in',
        location: 'Main Office',
        createdBy: 1,
      });

      await db.recordAttendance({
        workerId: testWorkerId,
        timestamp: checkOutTime,
        type: 'check_out',
        location: 'Main Office',
        createdBy: 1,
      });

      const result = await db.calculateDailyFinance(testWorkerId, testDate);

      expect(result.lateMinutes).toBe(60);
      expect(result.earlyLeaveMinutes).toBe(60);
      // Total penalty = late penalty + early leave penalty
      // = (150/480)*60*1.5 + (150/480)*60*1.5 = 28.13 + 28.13 = 56.26
      expect(result.deductions).toBeGreaterThanOrEqual(56);
      expect(result.deductions).toBeLessThanOrEqual(57);
    });
  });

  describe('Perfect Attendance', () => {
    it('should calculate full wage for perfect attendance', async () => {
      // Worker: 08:00 - 17:00 (perfect timing)
      const checkInTime = new Date(`${testDate}T08:00:00`);
      const checkOutTime = new Date(`${testDate}T17:00:00`);

      await db.recordAttendance({
        workerId: testWorkerId,
        timestamp: checkInTime,
        type: 'check_in',
        location: 'Main Office',
        createdBy: 1,
      });

      await db.recordAttendance({
        workerId: testWorkerId,
        timestamp: checkOutTime,
        type: 'check_out',
        location: 'Main Office',
        createdBy: 1,
      });

      const result = await db.calculateDailyFinance(testWorkerId, testDate);

      expect(result.baseAmount).toBe(150);
      expect(result.deductions).toBe(0);
      expect(result.bonuses).toBe(0);
      expect(result.lateMinutes).toBe(0);
      expect(result.earlyLeaveMinutes).toBe(0);
    });
  });

  describe('No Attendance Records', () => {
    it('should handle missing attendance records gracefully', async () => {
      const result = await db.calculateDailyFinance(testWorkerId, testDate);

      // Should return zero or default values
      expect(result).toHaveProperty('baseAmount');
      expect(result).toHaveProperty('deductions');
    });
  });
});
