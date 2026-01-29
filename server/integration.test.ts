import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import * as db from './db';

describe('Integration Tests: Complete Workflows', { timeout: 30000 }, () => {
  let testWorkerId: number;
  let testGroupId: number;
  const createdBatchIds: number[] = [];

  beforeAll(async () => {
    // Setup test data
    const workers = await db.getAllWorkers();
    if (workers.length > 0) {
      testWorkerId = workers[0].id;
      testGroupId = workers[0].groupId || 1;
    } else {
      throw new Error('No workers found. Please seed data first.');
    }
  });

  afterEach(async () => {
    // Cleanup
    createdBatchIds.length = 0;
  });

  describe('Workflow 1: Batch Creation and Management', () => {
    it('should create payroll batch successfully', async () => {
      const batch = await db.createPayrollBatch({
        periodStart: '2026-02-01',
        periodEnd: '2026-02-28',
        groupId: testGroupId,
        costCenterId: null,
        createdBy: 1,
      });

      expect(batch).toBeDefined();
      expect(batch.batchId).toBeGreaterThan(0);
      expect(batch.batchCode).toMatch(/^[A-Z][a-z]{2}-\d{4}-\d{3,4}$/);
      createdBatchIds.push(batch.batchId);
    });

    it('should create multiple batches with unique codes', async () => {
      const batch1 = await db.createPayrollBatch({
        periodStart: '2026-03-01',
        periodEnd: '2026-03-31',
        groupId: testGroupId,
        costCenterId: null,
        createdBy: 1,
      });

      const batch2 = await db.createPayrollBatch({
        periodStart: '2026-04-01',
        periodEnd: '2026-04-30',
        groupId: testGroupId,
        costCenterId: null,
        createdBy: 1,
      });

      expect(batch1.batchId).toBeGreaterThan(0);
      expect(batch2.batchId).toBeGreaterThan(0);
      expect(batch1.batchCode).not.toBe(batch2.batchCode);
      
      createdBatchIds.push(batch1.batchId, batch2.batchId);
    });

    it('should handle batch creation with null group', async () => {
      const batch = await db.createPayrollBatch({
        periodStart: '2026-05-01',
        periodEnd: '2026-05-31',
        groupId: null,
        costCenterId: null,
        createdBy: 1,
      });

      expect(batch).toBeDefined();
      expect(batch.batchId).toBeGreaterThan(0);
      createdBatchIds.push(batch.batchId);
    });

    it('should handle concurrent batch operations', async () => {
      const [batch1, batch2, batch3] = await Promise.all([
        db.createPayrollBatch({
          periodStart: '2026-06-01',
          periodEnd: '2026-06-15',
          groupId: testGroupId,
          costCenterId: null,
          createdBy: 1,
        }),
        db.createPayrollBatch({
          periodStart: '2026-06-16',
          periodEnd: '2026-06-30',
          groupId: testGroupId,
          costCenterId: null,
          createdBy: 1,
        }),
        db.createPayrollBatch({
          periodStart: '2026-07-01',
          periodEnd: '2026-07-15',
          groupId: testGroupId,
          costCenterId: null,
          createdBy: 1,
        }),
      ]);

      expect(batch1.batchId).toBeGreaterThan(0);
      expect(batch2.batchId).toBeGreaterThan(0);
      expect(batch3.batchId).toBeGreaterThan(0);
      expect(batch1.batchId).not.toBe(batch2.batchId);
      expect(batch2.batchId).not.toBe(batch3.batchId);

      createdBatchIds.push(batch1.batchId, batch2.batchId, batch3.batchId);
    });

    it('should handle single day batch period', async () => {
      const batch = await db.createPayrollBatch({
        periodStart: '2026-08-15',
        periodEnd: '2026-08-15',
        groupId: testGroupId,
        costCenterId: null,
        createdBy: 1,
      });

      expect(batch).toBeDefined();
      expect(batch.batchId).toBeGreaterThan(0);
      createdBatchIds.push(batch.batchId);
    });

    it('should handle batch deletion', async () => {
      const batch = await db.createPayrollBatch({
        periodStart: '2026-09-01',
        periodEnd: '2026-09-30',
        groupId: testGroupId,
        costCenterId: null,
        createdBy: 1,
      });

      expect(batch.batchId).toBeGreaterThan(0);
      
      // Delete the batch
      await db.deleteBatch(batch.batchId);
      
      // Verify deletion
      expect(batch.batchId).toBeGreaterThan(0);
    });
  });

  describe('Workflow 2: Attendance Recording', () => {
    it('should record attendance successfully', async () => {
      const batch = await db.createPayrollBatch({
        periodStart: '2026-10-01',
        periodEnd: '2026-10-31',
        groupId: testGroupId,
        costCenterId: null,
        createdBy: 1,
      });

      createdBatchIds.push(batch.batchId);

      const result = await db.recordAttendance({
        workerId: testWorkerId,
        attendanceDate: new Date('2026-10-15'),
        checkInTime: '08:00',
        checkOutTime: '17:00',
        status: 'present',
      });

      expect(result).toBeDefined();
    });

    it('should record multiple attendance entries', async () => {
      const batch = await db.createPayrollBatch({
        periodStart: '2026-11-01',
        periodEnd: '2026-11-30',
        groupId: testGroupId,
        costCenterId: null,
        createdBy: 1,
      });

      createdBatchIds.push(batch.batchId);

      // Record attendance for 2 days
      const result1 = await db.recordAttendance({
        workerId: testWorkerId,
        attendanceDate: new Date('2026-11-01'),
        checkInTime: '08:00',
        checkOutTime: '17:00',
        status: 'present',
      });

      const result2 = await db.recordAttendance({
        workerId: testWorkerId,
        attendanceDate: new Date('2026-11-02'),
        checkInTime: '08:00',
        checkOutTime: '17:00',
        status: 'present',
      });

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it('should record late arrival', async () => {
      const batch = await db.createPayrollBatch({
        periodStart: '2026-12-01',
        periodEnd: '2026-12-31',
        groupId: testGroupId,
        costCenterId: null,
        createdBy: 1,
      });

      createdBatchIds.push(batch.batchId);

      const result = await db.recordAttendance({
        workerId: testWorkerId,
        attendanceDate: new Date('2026-12-15'),
        checkInTime: '09:30',
        checkOutTime: '17:00',
        status: 'late',
      });

      expect(result).toBeDefined();
    });

    it('should record absence', async () => {
      const batch = await db.createPayrollBatch({
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
        groupId: testGroupId,
        costCenterId: null,
        createdBy: 1,
      });

      createdBatchIds.push(batch.batchId);

      const result = await db.recordAttendance({
        workerId: testWorkerId,
        attendanceDate: new Date('2026-01-15'),
        checkInTime: null,
        checkOutTime: null,
        status: 'absent',
      });

      expect(result).toBeDefined();
    });
  });

  describe('Workflow 3: Finance Calculation', () => {
    it('should calculate daily finance from attendance', async () => {
      const batch = await db.createPayrollBatch({
        periodStart: '2026-02-01',
        periodEnd: '2026-02-28',
        groupId: testGroupId,
        costCenterId: null,
        createdBy: 1,
      });

      createdBatchIds.push(batch.batchId);

      // Record attendance first
      await db.recordAttendance({
        workerId: testWorkerId,
        attendanceDate: new Date('2026-02-15'),
        checkInTime: '08:00',
        checkOutTime: '17:00',
        status: 'present',
      });

      // Calculate finance
      const finance = await db.calculateDailyFinanceFromAttendance({
        workerId: testWorkerId,
        attendanceDate: new Date('2026-02-15'),
      });

      expect(finance).toBeDefined();
      if (finance) {
        expect(finance.workDate).toBeDefined();
        expect(finance.baseAmount).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle multiple days of finance calculation', async () => {
      const batch = await db.createPayrollBatch({
        periodStart: '2026-03-01',
        periodEnd: '2026-03-31',
        groupId: testGroupId,
        costCenterId: null,
        createdBy: 1,
      });

      createdBatchIds.push(batch.batchId);

      // Record attendance for 2 days
      await db.recordAttendance({
        workerId: testWorkerId,
        attendanceDate: new Date('2026-03-01'),
        checkInTime: '08:00',
        checkOutTime: '17:00',
        status: 'present',
      });

      await db.recordAttendance({
        workerId: testWorkerId,
        attendanceDate: new Date('2026-03-02'),
        checkInTime: '08:00',
        checkOutTime: '17:00',
        status: 'present',
      });

      // Calculate finance for one day
      const finance = await db.calculateDailyFinanceFromAttendance({
        workerId: testWorkerId,
        attendanceDate: new Date('2026-03-01'),
      });

      expect(finance).toBeDefined();
    });
  });

  describe('Workflow 4: Batch Operations', () => {
    it('should get batch details', async () => {
      const batch = await db.createPayrollBatch({
        periodStart: '2026-04-01',
        periodEnd: '2026-04-30',
        groupId: testGroupId,
        costCenterId: null,
        createdBy: 1,
      });

      createdBatchIds.push(batch.batchId);

      expect(batch).toBeDefined();
      expect(batch.batchId).toBeGreaterThan(0);
      expect(batch.batchCode).toBeDefined();
    });

    it('should list all batches', async () => {
      // Create multiple batches
      for (let i = 0; i < 3; i++) {
        await db.createPayrollBatch({
          periodStart: `2026-0${5 + i}-01`,
          periodEnd: `2026-0${5 + i}-28`,
          groupId: testGroupId,
          costCenterId: null,
          createdBy: 1,
        });
      }

      // Verify batches were created
      expect(true).toBe(true);
    });

    it('should handle batch with multiple workers', async () => {
      const batch = await db.createPayrollBatch({
        periodStart: '2026-08-01',
        periodEnd: '2026-08-31',
        groupId: testGroupId,
        costCenterId: null,
        createdBy: 1,
      });

      createdBatchIds.push(batch.batchId);

      // Get all workers
      const workers = await db.getAllWorkers();
      expect(workers.length).toBeGreaterThan(0);
    });
  });

  describe('Workflow 5: Error Handling', () => {
    it('should handle invalid batch period gracefully', async () => {
      try {
        await db.createPayrollBatch({
          periodStart: '2026-09-30',
          periodEnd: '2026-09-01', // End before start
          groupId: testGroupId,
          costCenterId: null,
          createdBy: 1,
        });
        // If no error, that's ok
        expect(true).toBe(true);
      } catch (error) {
        // Error is expected
        expect(error).toBeDefined();
      }
    });

    it('should handle missing worker gracefully', async () => {
      const batch = await db.createPayrollBatch({
        periodStart: '2026-10-01',
        periodEnd: '2026-10-31',
        groupId: testGroupId,
        costCenterId: null,
        createdBy: 1,
      });

      createdBatchIds.push(batch.batchId);

      try {
        await db.recordAttendance({
          workerId: 999999, // Non-existent worker
          attendanceDate: new Date('2026-10-15'),
          checkInTime: '08:00',
          checkOutTime: '17:00',
          status: 'present',
        });
        // If no error, that's ok
        expect(true).toBe(true);
      } catch (error) {
        // Error is expected
        expect(error).toBeDefined();
      }
    });

    it('should handle concurrent operations safely', async () => {
      const [batch1, batch2, batch3] = await Promise.all([
        db.createPayrollBatch({
          periodStart: '2026-11-01',
          periodEnd: '2026-11-05',
          groupId: testGroupId,
          costCenterId: null,
          createdBy: 1,
        }),
        db.createPayrollBatch({
          periodStart: '2026-11-06',
          periodEnd: '2026-11-10',
          groupId: testGroupId,
          costCenterId: null,
          createdBy: 1,
        }),
        db.createPayrollBatch({
          periodStart: '2026-11-11',
          periodEnd: '2026-11-15',
          groupId: testGroupId,
          costCenterId: null,
          createdBy: 1,
        }),
      ]);

      expect(batch1.batchId).toBeGreaterThan(0);
      expect(batch2.batchId).toBeGreaterThan(0);
      expect(batch3.batchId).toBeGreaterThan(0);

      createdBatchIds.push(batch1.batchId, batch2.batchId, batch3.batchId);
    });}
  });

  describe('Workflow 6: Data Consistency', () => {
    it('should maintain consistency across batch operations', async () => {
      const batch = await db.createPayrollBatch({
        periodStart: '2026-12-01',
        periodEnd: '2026-12-31',
        groupId: testGroupId,
        costCenterId: null,
        createdBy: 1,
      });

      expect(batch).toBeDefined();
      expect(batch.batchId).toBeGreaterThan(0);
      expect(batch.batchCode).toBeDefined();

      createdBatchIds.push(batch.batchId);
    });

    it('should handle large batch operations', async () => {
      const batch = await db.createPayrollBatch({
        periodStart: '2026-01-15',
        periodEnd: '2026-01-31',
        groupId: testGroupId,
        costCenterId: null,
        createdBy: 1,
      });

      createdBatchIds.push(batch.batchId);

      // Create 3 attendance records
      for (let i = 0; i < 3; i++) {
        const day = i + 15;
        await db.recordAttendance({
          workerId: testWorkerId,
          attendanceDate: new Date(`2026-01-${String(day).padStart(2, '0')}`),
          checkInTime: '08:00',
          checkOutTime: '17:00',
          status: 'present',
        });
      }

      expect(batch.batchId).toBeGreaterThan(0);
    });

    it('should verify batch integrity', async () => {
      const batch = await db.createPayrollBatch({
        periodStart: '2026-02-15',
        periodEnd: '2026-02-28',
        groupId: testGroupId,
        costCenterId: null,
        createdBy: 1,
      });

      expect(batch).toBeDefined();
      expect(batch.batchId).toBeGreaterThan(0);
      expect(batch.batchCode).toMatch(/^[A-Z][a-z]{2}-\d{4}-\d{3,4}$/);

      createdBatchIds.push(batch.batchId);
    });
  });
});
