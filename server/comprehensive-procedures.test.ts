import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as db from './db';

describe('Comprehensive Procedures Test Suite', () => {
  const testUserId = 1;
  const createdIds: { type: string; id: number }[] = [];

  afterEach(async () => {
    // Cleanup logic
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

  describe('Operational Flags Procedures', () => {
    it('should create operational flag', async () => {
      const result = await db.createOperationalFlag({
        workerId: 1,
        flagType: 'absent',
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        createdBy: testUserId,
      });

      expect(result).toHaveProperty('id');
      expect(result.id).toBeGreaterThan(0);
      createdIds.push({ type: 'flag', id: result.id });
    });

    it('should list operational flags', async () => {
      const flags = await db.listOperationalFlags({
        status: 'pending',
        limit: 10,
        offset: 0,
      });

      expect(Array.isArray(flags)).toBe(true);
      expect(flags).toHaveProperty('length');
    });

    it('should approve operational flag', async () => {
      const flag = await db.createOperationalFlag({
        workerId: 1,
        flagType: 'absent',
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        createdBy: testUserId,
      });

      createdIds.push({ type: 'flag', id: flag.id });

      const result = await db.approveOperationalFlag(flag.id, testUserId);
      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
    });

    it('should reject operational flag', async () => {
      const flag = await db.createOperationalFlag({
        workerId: 1,
        flagType: 'absent',
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        createdBy: testUserId,
      });

      createdIds.push({ type: 'flag', id: flag.id });

      const result = await db.rejectOperationalFlag(flag.id, 'Invalid reason', testUserId);
      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
    });

    it('should check unresolved flags', async () => {
      const result = await db.checkUnresolvedFlags(1);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Daily Finance Procedures', () => {
    it('should add finance entry', async () => {
      const result = await db.addDailyFinanceEntry({
        workerId: 1,
        date: new Date().toISOString().split('T')[0],
        amount: 100,
        type: 'bonus',
        description: 'Test bonus',
        createdBy: testUserId,
      });

      expect(result).toHaveProperty('id');
      expect(result.id).toBeGreaterThan(0);
    });

    it('should list daily finance entries', async () => {
      const entries = await db.listDailyFinanceEntries({
        workerId: 1,
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      expect(Array.isArray(entries)).toBe(true);
    });

    it('should get daily finance summary', async () => {
      const summary = await db.getDailyFinanceSummary({
        workerId: 1,
        date: new Date().toISOString().split('T')[0],
      });

      expect(summary).toHaveProperty('totalAmount');
      expect(summary).toHaveProperty('entries');
    });
  });

  describe('Payroll Procedures', () => {
    it('should create payroll batch', async () => {
      const result = await db.createPayrollBatch({
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
        createdBy: testUserId,
      });

      expect(result).toHaveProperty('batchId');
      expect(result.batchId).toBeGreaterThan(0);
      createdIds.push({ type: 'batch', id: result.batchId });
    });

    it('should get payroll batch details', async () => {
      const batch = await db.createPayrollBatch({
        periodStart: '2026-02-01',
        periodEnd: '2026-02-28',
        createdBy: testUserId,
      });

      createdIds.push({ type: 'batch', id: batch.batchId });

      const details = await db.getPayrollBatchDetails(batch.batchId);
      expect(details).toHaveProperty('batch');
      expect(details).toHaveProperty('items');
    });

    it('should list payroll batches', async () => {
      const batches = await db.getPayrollBatches({
        status: 'draft',
        limit: 10,
        offset: 0,
      });

      expect(Array.isArray(batches)).toBe(true);
    });

    it('should submit batch for review', async () => {
      const batch = await db.createPayrollBatch({
        periodStart: '2026-03-01',
        periodEnd: '2026-03-31',
        createdBy: testUserId,
      });

      createdIds.push({ type: 'batch', id: batch.batchId });

      const result = await db.submitBatchForReview(batch.batchId, testUserId);
      expect(result).toHaveProperty('success');
    });

    it('should approve batch at different stages', async () => {
      const batch = await db.createPayrollBatch({
        periodStart: '2026-04-01',
        periodEnd: '2026-04-30',
        createdBy: testUserId,
      });

      createdIds.push({ type: 'batch', id: batch.batchId });

      await db.submitBatchForReview(batch.batchId, testUserId);
      
      const accountantResult = await db.accountantApproveBatch(batch.batchId, testUserId);
      expect(accountantResult).toHaveProperty('success');
    });
  });

  describe('Attendance Procedures', () => {
    it('should record attendance', async () => {
      const result = await db.recordAttendance({
        workerId: 1,
        timestamp: new Date(),
        type: 'check_in',
        location: 'Main Office',
        createdBy: testUserId,
      });

      expect(result).toHaveProperty('id');
      expect(result.id).toBeGreaterThan(0);
    });

    it('should get attendance records', async () => {
      const records = await db.getAttendanceRecords({
        workerId: 1,
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      expect(Array.isArray(records)).toBe(true);
    });

    it('should list attendance events', async () => {
      const events = await db.listAttendanceEvents({
        status: 'active',
        limit: 10,
        offset: 0,
      });

      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe('User Management Procedures', () => {
    it('should list all users', async () => {
      const users = await db.getAllUsers();
      expect(Array.isArray(users)).toBe(true);
    });

    it('should get user by ID', async () => {
      const user = await db.getUserById(testUserId);
      expect(user).toHaveProperty('id');
      expect(user.id).toBe(testUserId);
    });

    it('should get user by username', async () => {
      const user = await db.getUserByUsername('admin');
      if (user) {
        expect(user).toHaveProperty('username');
      }
    });
  });

  describe('Worker Management Procedures', () => {
    it('should list all workers', async () => {
      const workers = await db.getAllWorkers();
      expect(Array.isArray(workers)).toBe(true);
    });

    it('should get worker by ID', async () => {
      const workers = await db.getAllWorkers();
      if (workers.length > 0) {
        const worker = await db.getWorkerById(workers[0].id);
        expect(worker).toHaveProperty('id');
      }
    });

    it('should get worker by employee ID', async () => {
      const worker = await db.getWorkerByEmployeeId('EMP001');
      if (worker) {
        expect(worker).toHaveProperty('employeeId');
      }
    });
  });

  describe('Group Management Procedures', () => {
    it('should list all groups', async () => {
      const groups = await db.getAllGroups();
      expect(Array.isArray(groups)).toBe(true);
    });

    it('should get group by ID', async () => {
      const groups = await db.getAllGroups();
      if (groups.length > 0) {
        const group = await db.getGroupById(groups[0].id);
        expect(group).toHaveProperty('id');
      }
    });
  });

  describe('Cost Center Procedures', () => {
    it('should list all cost centers', async () => {
      const centers = await db.getAllCostCenters();
      expect(Array.isArray(centers)).toBe(true);
    });

    it('should get cost center by ID', async () => {
      const centers = await db.getAllCostCenters();
      if (centers.length > 0) {
        const center = await db.getCostCenterById(centers[0].id);
        expect(center).toHaveProperty('id');
      }
    });
  });

  describe('Dashboard Statistics Procedures', () => {
    it('should get dashboard statistics', async () => {
      const stats = await db.getDashboardStats(testUserId);
      expect(stats).toHaveProperty('totalWorkers');
      expect(stats).toHaveProperty('totalBatches');
      expect(stats).toHaveProperty('totalAttendance');
    });
  });

  describe('Financial Reports Procedures', () => {
    it('should get payroll summary', async () => {
      const summary = await db.getPayrollSummary({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      expect(summary).toHaveProperty('totalAmount');
      expect(summary).toHaveProperty('totalWorkers');
    });

    it('should get attendance summary', async () => {
      const summary = await db.getAttendanceSummary({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      expect(summary).toHaveProperty('totalPresent');
      expect(summary).toHaveProperty('totalAbsent');
    });
  });

  describe('Data Validation and Error Handling', () => {
    it('should handle invalid worker ID gracefully', async () => {
      await expect(db.getWorkerById(999999)).rejects.toThrow();
    });

    it('should handle invalid batch ID gracefully', async () => {
      await expect(db.getPayrollBatchDetails(999999)).rejects.toThrow();
    });

    it('should validate date ranges', async () => {
      const result = await db.getAttendanceRecords({
        workerId: 1,
        startDate: '2026-01-31',
        endDate: '2026-01-01', // End date before start date
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent batch creations', async () => {
      const promises = Array.from({ length: 3 }, (_, i) =>
        db.createPayrollBatch({
          periodStart: `2026-0${i + 5}-01`,
          periodEnd: `2026-0${i + 5}-28`,
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
      const promises = Array.from({ length: 3 }, (_, i) =>
        db.recordAttendance({
          workerId: i + 1,
          timestamp: new Date(),
          type: 'check_in',
          location: 'Main Office',
          createdBy: testUserId,
        })
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result).toHaveProperty('id');
      });
    });
  });
});
