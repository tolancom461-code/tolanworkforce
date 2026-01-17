import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as db from './db';
import { workers, groups, attendanceEvents, workerDailyFinance } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Daily Override System', () => {
  let testWorkerId: number;
  let testGroupId: number;
  const testDate = '2024-01-15';

  beforeAll(async () => {
    // Create test group with shift times
    const uniqueCode = `TOG${Date.now()}`;
    testGroupId = await db.createGroup({
      name: 'Test Override Group',
      code: uniqueCode,
      costCenterId: null,
      shiftStartTime: '08:00',
      shiftEndTime: '17:00',
      dailyWage: 200,
      workMinutes: 480,
      latePenaltyRate: 0.5,
      earlyLeavePenaltyRate: 0.5,
    });

    // Create test worker
    const uniqueWorkerCode = `OTW${Date.now()}`;
    testWorkerId = await db.createWorker({
      fullName: 'Override Test Worker',
      code: uniqueWorkerCode,
      groupId: testGroupId,
      phone: '0501234567',
      nationalId: '1234567890',
      dateOfBirth: '1990-01-01',
      nationality: 'Saudi',
      status: 'active',
    });

    // Create attendance events manually (30 minutes late)
    const dbConn = await db.getDb();
    if (dbConn) {
      await dbConn.insert(attendanceEvents).values({
        workerId: testWorkerId,
        eventType: 'check_in',
        eventTime: new Date(`${testDate}T08:30:00`),
        method: 'manual',
      });

      await dbConn.insert(attendanceEvents).values({
        workerId: testWorkerId,
        eventType: 'check_out',
        eventTime: new Date(`${testDate}T17:00:00`),
        method: 'manual',
      });
    }

    // Calculate daily finance (should have deductions)
    await db.calculateDailyFinanceFromAttendance(testWorkerId, testDate);
  });

  afterAll(async () => {
    // Cleanup
    const dbConn = await db.getDb();
    if (dbConn) {
      await dbConn.delete(workerDailyFinance).where(
        eq(workerDailyFinance.workerId, testWorkerId)
      );
      await dbConn.delete(attendanceEvents).where(
        eq(attendanceEvents.workerId, testWorkerId)
      );
      await dbConn.delete(workers).where(
        eq(workers.id, testWorkerId)
      );
      await dbConn.delete(groups).where(
        eq(groups.id, testGroupId)
      );
    }
  });

  it('should fetch daily finance details for worker', async () => {
    const details = await db.getDailyFinanceForWorker(
      testWorkerId,
      testDate,
      testDate
    );

    expect(details).toHaveLength(1);
    expect(details[0].workDate).toBe(testDate);
    expect(details[0].workerId).toBe(testWorkerId);
    expect(details[0].fullDayOverride).toBe(false);
    expect(Number(details[0].totalDeduction)).toBeGreaterThan(0); // Should have late deduction
  });

  it('should apply full day override and remove deductions', async () => {
    const reason = 'عذر طارئ معتمد من الإدارة';
    
    await db.updateFullDayOverride(
      testWorkerId,
      testDate,
      true,
      reason,
      1 // admin user id
    );

    const details = await db.getDailyFinanceForWorker(
      testWorkerId,
      testDate,
      testDate
    );

    expect(details[0].fullDayOverride).toBe(true);
    expect(details[0].overrideReason).toBe(reason);
    expect(details[0].overrideBy).toBe(1);
    expect(Number(details[0].totalDeduction)).toBe(0); // Deductions removed
    expect(Number(details[0].netAmount)).toBe(200); // Full daily wage
  });

  it('should remove override and recalculate deductions', async () => {
    await db.updateFullDayOverride(
      testWorkerId,
      testDate,
      false,
      undefined,
      1
    );

    const details = await db.getDailyFinanceForWorker(
      testWorkerId,
      testDate,
      testDate
    );

    expect(details[0].fullDayOverride).toBe(false);
    expect(details[0].overrideReason).toBeNull();
    expect(Number(details[0].totalDeduction)).toBeGreaterThan(0); // Deductions restored
    expect(Number(details[0].netAmount)).toBeLessThan(200); // Less than full wage
  });

  it('should include override notes in payroll report', async () => {
    // Apply override with reason
    await db.updateFullDayOverride(
      testWorkerId,
      testDate,
      true,
      'عذر طارئ معتمد',
      1
    );

    const report = await db.getPayrollReportByWorker(
      testDate,
      testDate,
      testWorkerId
    );

    expect(report).toHaveLength(1);
    expect(report[0].overrideNotes).toContain('عذر طارئ معتمد');
    expect(report[0].overrideNotes).toContain(testDate);
  });

  it('should recalculate totals after override change', async () => {
    // Get initial state with deductions
    await db.updateFullDayOverride(testWorkerId, testDate, false, undefined, 1);
    const before = await db.getDailyFinanceForWorker(testWorkerId, testDate, testDate);
    const deductionBefore = Number(before[0].totalDeduction);
    const netBefore = Number(before[0].netAmount);

    // Apply override
    await db.updateFullDayOverride(testWorkerId, testDate, true, 'Test', 1);
    const after = await db.getDailyFinanceForWorker(testWorkerId, testDate, testDate);
    const deductionAfter = Number(after[0].totalDeduction);
    const netAfter = Number(after[0].netAmount);

    expect(deductionBefore).toBeGreaterThan(deductionAfter);
    expect(netAfter).toBeGreaterThan(netBefore);
    expect(netAfter).toBe(200); // Full daily wage
  });
});
