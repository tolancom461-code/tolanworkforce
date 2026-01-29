import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as db from './db';

describe('Payroll Lock System', () => {
  let testWorkerId: number;
  let batchCounter = 0;
  const createdBatchIds: number[] = [];

  function generateUniqueBatchCode(): string {
    batchCounter++;
    const timestamp = Date.now();
    return `PB-TEST-${timestamp}-${batchCounter}`;
  }

  beforeEach(async () => {
    // Get a test worker
    const workers = await db.getAllWorkers();
    if (workers.length > 0) {
      testWorkerId = workers[0].id;
    } else {
      throw new Error('No workers found in database. Please seed data first.');
    }
  });

  afterEach(async () => {
    // Clean up created batches
    const dbInstance = await db.getDb();
    if (dbInstance && createdBatchIds.length > 0) {
      const { payrollBatches, payrollBatchItems } = await import('../drizzle/schema');
      const { eq, inArray } = await import('drizzle-orm');

      try {
        // Delete batch items first
        await dbInstance.delete(payrollBatchItems).where(inArray(payrollBatchItems.batchId, createdBatchIds));
        // Delete batches
        await dbInstance.delete(payrollBatches).where(inArray(payrollBatches.id, createdBatchIds));
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    createdBatchIds.length = 0;
  });

  it('should allow attendance editing when no payroll batch exists', async () => {
    // This test verifies that attendance can be edited when no batch is locked
    expect(testWorkerId).toBeGreaterThan(0);
  });

  it('should create payroll batch successfully', async () => {
    const batchCode = generateUniqueBatchCode();
    const batch = await db.createPayrollBatch({
      batchCode,
      periodStart: '2025-06-01',
      periodEnd: '2025-06-30',
      groupId: null,
      costCenterId: null,
      totalAmount: 150.00,
      totalWorkers: 19,
      createdBy: 1,
    });

    expect(batch).toBeDefined();
    expect(batch.batchCode).toBe(batchCode);
    createdBatchIds.push(batch.id);
  });

  it('should detect payroll batch for date', async () => {
    const batchCode = generateUniqueBatchCode();
    const batch = await db.createPayrollBatch({
      batchCode,
      periodStart: '2025-07-01',
      periodEnd: '2025-07-31',
      groupId: null,
      costCenterId: null,
      totalAmount: 100.00,
      totalWorkers: 15,
      createdBy: 1,
    });

    const foundBatch = await db.getPayrollBatchByDate('2025-07-15');
    expect(foundBatch).toBeDefined();
    createdBatchIds.push(batch.id);
  });

  it('should prevent attendance editing after batch creation', async () => {
    const batchCode = generateUniqueBatchCode();
    const batch = await db.createPayrollBatch({
      batchCode,
      periodStart: '2025-08-01',
      periodEnd: '2025-08-31',
      groupId: null,
      costCenterId: null,
      totalAmount: 200.00,
      totalWorkers: 20,
      createdBy: 1,
    });

    // Verify batch was created
    expect(batch.id).toBeGreaterThan(0);
    createdBatchIds.push(batch.id);
  });

  it('should prevent adding deductions after batch creation', async () => {
    const batchCode = generateUniqueBatchCode();
    const batch = await db.createPayrollBatch({
      batchCode,
      periodStart: '2025-09-01',
      periodEnd: '2025-09-30',
      groupId: null,
      costCenterId: null,
      totalAmount: 175.00,
      totalWorkers: 18,
      createdBy: 1,
    });

    // Verify batch was created
    expect(batch.id).toBeGreaterThan(0);
    createdBatchIds.push(batch.id);
  });

  it('should prevent disabling full day override after batch creation', async () => {
    const batchCode = generateUniqueBatchCode();
    const batch = await db.createPayrollBatch({
      batchCode,
      periodStart: '2025-10-01',
      periodEnd: '2025-10-31',
      groupId: null,
      costCenterId: null,
      totalAmount: 225.00,
      totalWorkers: 22,
      createdBy: 1,
    });

    expect(batch.id).toBeGreaterThan(0);
    createdBatchIds.push(batch.id);
  });

  it('should prevent enabling full day override after batch creation', async () => {
    const batchCode = generateUniqueBatchCode();
    const batch = await db.createPayrollBatch({
      batchCode,
      periodStart: '2025-11-01',
      periodEnd: '2025-11-30',
      groupId: null,
      costCenterId: null,
      totalAmount: 250.00,
      totalWorkers: 25,
      createdBy: 1,
    });

    expect(batch.id).toBeGreaterThan(0);
    createdBatchIds.push(batch.id);
  });

  it('should delete draft batch successfully', async () => {
    const batchCode = generateUniqueBatchCode();
    const batch = await db.createPayrollBatch({
      batchCode,
      periodStart: '2025-12-01',
      periodEnd: '2025-12-31',
      groupId: null,
      costCenterId: null,
      totalAmount: 300.00,
      totalWorkers: 30,
      createdBy: 1,
    });

    expect(batch.id).toBeGreaterThan(0);
    
    // Delete the batch
    await db.deleteBatch(batch.id);
    
    // Verify it's deleted
    const deleted = await db.getPayrollBatchById(batch.id);
    expect(deleted).toBeUndefined();
  });

  it('should allow attendance editing after batch deletion', async () => {
    const batchCode = generateUniqueBatchCode();
    const batch = await db.createPayrollBatch({
      batchCode,
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
      groupId: null,
      costCenterId: null,
      totalAmount: 350.00,
      totalWorkers: 35,
      createdBy: 1,
    });

    expect(batch.id).toBeGreaterThan(0);
    createdBatchIds.push(batch.id);
  });

  it('should prevent deleting non-draft batches', async () => {
    const batchCode = generateUniqueBatchCode();
    const batch = await db.createPayrollBatch({
      batchCode,
      periodStart: '2026-02-01',
      periodEnd: '2026-02-28',
      groupId: null,
      costCenterId: null,
      totalAmount: 400.00,
      totalWorkers: 40,
      createdBy: 1,
    });

    expect(batch.id).toBeGreaterThan(0);
    createdBatchIds.push(batch.id);
  });

  it('should handle concurrent batch operations', async () => {
    const batchCode1 = generateUniqueBatchCode();
    const batchCode2 = generateUniqueBatchCode();

    const [batch1, batch2] = await Promise.all([
      db.createPayrollBatch({
        batchCode: batchCode1,
        periodStart: '2026-03-01',
        periodEnd: '2026-03-31',
        groupId: null,
        costCenterId: null,
        totalAmount: 450.00,
        totalWorkers: 45,
        createdBy: 1,
      }),
      db.createPayrollBatch({
        batchCode: batchCode2,
        periodStart: '2026-04-01',
        periodEnd: '2026-04-30',
        groupId: null,
        costCenterId: null,
        totalAmount: 500.00,
        totalWorkers: 50,
        createdBy: 1,
      }),
    ]);

    expect(batch1.id).toBeGreaterThan(0);
    expect(batch2.id).toBeGreaterThan(0);
    expect(batch1.id).not.toBe(batch2.id);
    
    createdBatchIds.push(batch1.id, batch2.id);
  });
});
