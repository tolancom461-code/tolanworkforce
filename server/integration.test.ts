import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as db from './db';

/**
 * Integration Tests for Critical Workflows
 * Tests complete end-to-end scenarios
 */

describe('Integration Tests - Critical Workflows', () => {
  const testUserId = 1;
  const createdIds: { type: string; id: number }[] = [];

  afterEach(async () => {
    // Cleanup
    for (const item of createdIds) {
      try {
        if (item.type === 'batch') {
          await db.deleteBatch(item.id);
        } else if (item.type === 'flag') {
          // Cleanup operational flags if needed
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    createdIds.length = 0;
  });

  describe('Complete Payroll Workflow', () => {
    it('should execute complete payroll workflow from draft to approval', async () => {
      // Step 1: Create payroll batch
      const batch = await db.createPayrollBatch({
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
        createdBy: testUserId,
      });

      createdIds.push({ type: 'batch', id: batch.batchId });
      expect(batch.batchId).toBeGreaterThan(0);

      // Step 2: Get batch details
      let details = await db.getPayrollBatchDetails(batch.batchId);
      expect(details.batch.status).toBe('draft');

      // Step 3: Submit for review
      await db.submitBatchForReview(batch.batchId, testUserId);
      details = await db.getPayrollBatchDetails(batch.batchId);
      expect(details.batch.status).toBe('under_accountant_review');

      // Step 4: Accountant approval
      await db.accountantApproveBatch(batch.batchId, testUserId);
      details = await db.getPayrollBatchDetails(batch.batchId);
      expect(details.batch.status).toBe('under_financial_review');

      // Step 5: Financial reviewer approval
      await db.financialReviewerApproveBatch(batch.batchId, testUserId);
      details = await db.getPayrollBatchDetails(batch.batchId);
      expect(details.batch.status).toBe('under_accounts_manager_review');

      // Step 6: Accounts manager approval
      await db.accountsManagerApproveBatch(batch.batchId, testUserId);
      details = await db.getPayrollBatchDetails(batch.batchId);
      expect(details.batch.status).toBe('approved');
    });

    it('should handle rejection and resubmission in payroll workflow', async () => {
      // Create batch
      const batch = await db.createPayrollBatch({
        periodStart: '2026-02-01',
        periodEnd: '2026-02-28',
        createdBy: testUserId,
      });

      createdIds.push({ type: 'batch', id: batch.batchId });

      // Submit for review
      await db.submitBatchForReview(batch.batchId, testUserId);

      // Reject at accountant stage
      await db.accountantRejectBatch({
        batchId: batch.batchId,
        reviewerId: testUserId,
        noteType: 'critical',
        note: 'خطأ في الحساب',
      });

      let details = await db.getPayrollBatchDetails(batch.batchId);
      expect(details.batch.status).toBe('returned_from_accountant');
      expect(details.batch.rejectionCount).toBe(1);

      // Resubmit
      await db.submitBatchForReview(batch.batchId, testUserId);
      details = await db.getPayrollBatchDetails(batch.batchId);
      expect(details.batch.status).toBe('under_accountant_review');

      // Approve this time
      await db.accountantApproveBatch(batch.batchId, testUserId);
      details = await db.getPayrollBatchDetails(batch.batchId);
      expect(details.batch.status).toBe('under_financial_review');
    });
  });

  describe('Attendance Tracking Workflow', () => {
    it('should track attendance events throughout the day', async () => {
      const workerId = 1;
      const testDate = new Date().toISOString().split('T')[0];

      // Record check-in
      const checkIn = await db.recordAttendance({
        workerId,
        timestamp: new Date(),
        type: 'check_in',
        location: 'Main Office',
        createdBy: testUserId,
      });

      expect(checkIn).toHaveProperty('id');
      expect(checkIn.id).toBeGreaterThan(0);

      // Get attendance records
      const records = await db.getAttendanceRecords({
        workerId,
        startDate: testDate,
        endDate: testDate,
      });

      expect(Array.isArray(records)).toBe(true);
      expect(records.length).toBeGreaterThanOrEqual(1);

      // Record check-out
      const checkOut = await db.recordAttendance({
        workerId,
        timestamp: new Date(),
        type: 'check_out',
        location: 'Main Office',
        createdBy: testUserId,
      });

      expect(checkOut).toHaveProperty('id');
      expect(checkOut.id).toBeGreaterThan(0);

      // Get updated records
      const updatedRecords = await db.getAttendanceRecords({
        workerId,
        startDate: testDate,
        endDate: testDate,
      });

      expect(updatedRecords.length).toBeGreaterThanOrEqual(2);
    });

    it('should calculate daily finance from attendance', async () => {
      const workerId = 1;
      const testDate = new Date().toISOString().split('T')[0];

      // Record attendance
      await db.recordAttendance({
        workerId,
        timestamp: new Date(),
        type: 'check_in',
        location: 'Main Office',
        createdBy: testUserId,
      });

      await db.recordAttendance({
        workerId,
        timestamp: new Date(),
        type: 'check_out',
        location: 'Main Office',
        createdBy: testUserId,
      });

      // Calculate daily finance
      const finance = await db.calculateDailyFinance(workerId, testDate);

      expect(finance).toHaveProperty('baseAmount');
      expect(finance).toHaveProperty('deductions');
      expect(finance).toHaveProperty('bonuses');
      expect(finance.baseAmount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Operational Flags Workflow', () => {
    it('should handle complete operational flag workflow', async () => {
      const workerId = 1;
      const testDate = new Date().toISOString().split('T')[0];

      // Create operational flag
      const flag = await db.createOperationalFlag({
        workerId,
        flagType: 'absent',
        date: testDate,
        status: 'pending',
        createdBy: testUserId,
      });

      createdIds.push({ type: 'flag', id: flag.id });
      expect(flag.id).toBeGreaterThan(0);

      // List pending flags
      const pendingFlags = await db.listOperationalFlags({
        status: 'pending',
        limit: 10,
        offset: 0,
      });

      expect(Array.isArray(pendingFlags)).toBe(true);

      // Approve flag
      const approveResult = await db.approveOperationalFlag(flag.id, testUserId);
      expect(approveResult.success).toBe(true);

      // Verify flag is approved
      const unresolved = await db.checkUnresolvedFlags(workerId);
      expect(Array.isArray(unresolved)).toBe(true);
    });

    it('should handle operational flag rejection', async () => {
      const workerId = 1;
      const testDate = new Date().toISOString().split('T')[0];

      // Create flag
      const flag = await db.createOperationalFlag({
        workerId,
        flagType: 'late',
        date: testDate,
        status: 'pending',
        createdBy: testUserId,
      });

      createdIds.push({ type: 'flag', id: flag.id });

      // Reject flag
      const rejectResult = await db.rejectOperationalFlag(
        flag.id,
        'Invalid reason',
        testUserId
      );

      expect(rejectResult.success).toBe(true);
    });
  });

  describe('Daily Finance Workflow', () => {
    it('should manage daily finance entries', async () => {
      const workerId = 1;
      const testDate = new Date().toISOString().split('T')[0];

      // Add finance entry
      const entry = await db.addDailyFinanceEntry({
        workerId,
        date: testDate,
        amount: 100,
        type: 'bonus',
        description: 'Performance bonus',
        createdBy: testUserId,
      });

      expect(entry).toHaveProperty('id');
      expect(entry.id).toBeGreaterThan(0);

      // Get finance entries
      const entries = await db.listDailyFinanceEntries({
        workerId,
        startDate: testDate,
        endDate: testDate,
      });

      expect(Array.isArray(entries)).toBe(true);

      // Get summary
      const summary = await db.getDailyFinanceSummary({
        workerId,
        date: testDate,
      });

      expect(summary).toHaveProperty('totalAmount');
      expect(summary).toHaveProperty('entries');
    });
  });

  describe('User Management Workflow', () => {
    it('should manage user lifecycle', async () => {
      // Get all users
      const users = await db.getAllUsers();
      expect(Array.isArray(users)).toBe(true);

      // Get specific user
      if (users.length > 0) {
        const user = await db.getUserById(users[0].id);
        expect(user).toHaveProperty('id');
        expect(user.id).toBe(users[0].id);
      }

      // Get user by username
      const adminUser = await db.getUserByUsername('admin');
      if (adminUser) {
        expect(adminUser).toHaveProperty('username');
      }
    });
  });

  describe('Worker Management Workflow', () => {
    it('should manage worker data', async () => {
      // Get all workers
      const workers = await db.getAllWorkers();
      expect(Array.isArray(workers)).toBe(true);

      // Get specific worker
      if (workers.length > 0) {
        const worker = await db.getWorkerById(workers[0].id);
        expect(worker).toHaveProperty('id');
      }

      // Get worker by employee ID
      const worker = await db.getWorkerByEmployeeId('EMP001');
      if (worker) {
        expect(worker).toHaveProperty('employeeId');
      }
    });
  });

  describe('Dashboard Statistics Workflow', () => {
    it('should retrieve dashboard statistics', async () => {
      const stats = await db.getDashboardStats(testUserId);

      expect(stats).toHaveProperty('totalWorkers');
      expect(stats).toHaveProperty('totalBatches');
      expect(stats).toHaveProperty('totalAttendance');
      expect(stats).toHaveProperty('totalFinance');

      expect(typeof stats.totalWorkers).toBe('number');
      expect(typeof stats.totalBatches).toBe('number');
      expect(typeof stats.totalAttendance).toBe('number');
    });
  });

  describe('Financial Reports Workflow', () => {
    it('should generate payroll summary', async () => {
      const summary = await db.getPayrollSummary({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      expect(summary).toHaveProperty('totalAmount');
      expect(summary).toHaveProperty('totalWorkers');
      expect(summary).toHaveProperty('batches');

      expect(typeof summary.totalAmount).toBe('number');
      expect(typeof summary.totalWorkers).toBe('number');
      expect(Array.isArray(summary.batches)).toBe(true);
    });

    it('should generate attendance summary', async () => {
      const summary = await db.getAttendanceSummary({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      expect(summary).toHaveProperty('totalPresent');
      expect(summary).toHaveProperty('totalAbsent');
      expect(summary).toHaveProperty('totalLate');

      expect(typeof summary.totalPresent).toBe('number');
      expect(typeof summary.totalAbsent).toBe('number');
      expect(typeof summary.totalLate).toBe('number');
    });
  });

  describe('Error Handling in Workflows', () => {
    it('should handle invalid batch ID gracefully', async () => {
      await expect(db.getPayrollBatchDetails(999999)).rejects.toThrow();
    });

    it('should handle invalid worker ID gracefully', async () => {
      await expect(db.getWorkerById(999999)).rejects.toThrow();
    });

    it('should handle invalid user ID gracefully', async () => {
      await expect(db.getUserById(999999)).rejects.toThrow();
    });

    it('should handle duplicate batch submission', async () => {
      const batch = await db.createPayrollBatch({
        periodStart: '2026-03-01',
        periodEnd: '2026-03-31',
        createdBy: testUserId,
      });

      createdIds.push({ type: 'batch', id: batch.batchId });

      // Submit once
      await db.submitBatchForReview(batch.batchId, testUserId);

      // Try to submit again - should fail
      await expect(db.submitBatchForReview(batch.batchId, testUserId)).rejects.toThrow();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent batch operations', async () => {
      const promises = Array.from({ length: 3 }, (_, i) =>
        db.createPayrollBatch({
          periodStart: `2026-0${i + 4}-01`,
          periodEnd: `2026-0${i + 4}-28`,
          createdBy: testUserId,
        })
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(3);

      results.forEach((result) => {
        expect(result).toHaveProperty('batchId');
        createdIds.push({ type: 'batch', id: result.batchId });
      });
    });

    it('should handle concurrent attendance records', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        db.recordAttendance({
          workerId: i + 1,
          timestamp: new Date(),
          type: 'check_in',
          location: 'Main Office',
          createdBy: testUserId,
        })
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);

      results.forEach((result) => {
        expect(result).toHaveProperty('id');
      });
    });
  });
});
