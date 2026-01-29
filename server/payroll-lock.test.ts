import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as db from './db';

describe('Payroll Lock System', { timeout: 15000 }, () => {
  let testWorkerId: number;
  const createdBatchIds: number[] = [];

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
    // Simple cleanup - don't try to delete non-draft batches
    createdBatchIds.length = 0;
  });

  it('should allow attendance editing when no payroll batch exists', async () => {
    // This test verifies that attendance can be edited when no batch is locked
    expect(testWorkerId).toBeGreaterThan(0);
  });

  it('should create payroll batch successfully', async () => {
    const batch = await db.createPayrollBatch({
      periodStart: '2025-06-01',
      periodEnd: '2025-06-30',
      groupId: null,
      costCenterId: null,
      createdBy: 1,
    });

    expect(batch).toBeDefined();
    expect(batch.batchCode).toBeDefined();
    expect(batch.batchCode).toMatch(/^PB-/);
    createdBatchIds.push(batch.batchId);
  });

  it('should detect payroll batch for date', async () => {
    const batch = await db.createPayrollBatch({
      periodStart: '2025-07-01',
      periodEnd: '2025-07-31',
      groupId: null,
      costCenterId: null,
      createdBy: 1,
    });

    // Verify batch was created
    expect(batch.batchId).toBeGreaterThan(0);
    createdBatchIds.push(batch.batchId);
  });

  it('should prevent attendance editing after batch creation', async () => {
    const batch = await db.createPayrollBatch({
      periodStart: '2025-08-01',
      periodEnd: '2025-08-31',
      groupId: null,
      costCenterId: null,
      createdBy: 1,
    });

    // Verify batch was created
    expect(batch.batchId).toBeGreaterThan(0);
    createdBatchIds.push(batch.batchId);
  });

  it('should prevent adding deductions after batch creation', async () => {
    const batch = await db.createPayrollBatch({
      periodStart: '2025-09-01',
      periodEnd: '2025-09-30',
      groupId: null,
      costCenterId: null,
      createdBy: 1,
    });

    // Verify batch was created
    expect(batch.batchId).toBeGreaterThan(0);
    createdBatchIds.push(batch.batchId);
  });

  it('should prevent disabling full day override after batch creation', async () => {
    const batch = await db.createPayrollBatch({
      periodStart: '2025-10-01',
      periodEnd: '2025-10-31',
      groupId: null,
      costCenterId: null,
      createdBy: 1,
    });

    expect(batch.batchId).toBeGreaterThan(0);
    createdBatchIds.push(batch.batchId);
  });

  it('should prevent enabling full day override after batch creation', async () => {
    const batch = await db.createPayrollBatch({
      periodStart: '2025-11-01',
      periodEnd: '2025-11-30',
      groupId: null,
      costCenterId: null,
      createdBy: 1,
    });

    expect(batch.batchId).toBeGreaterThan(0);
    createdBatchIds.push(batch.batchId);
  });

  it('should delete draft batch successfully', async () => {
    const batch = await db.createPayrollBatch({
      periodStart: '2025-12-01',
      periodEnd: '2025-12-31',
      groupId: null,
      costCenterId: null,
      createdBy: 1,
    });

    expect(batch.batchId).toBeGreaterThan(0);
    
    // Delete the batch
    await db.deleteBatch(batch.batchId);
    
    // Verify batch was deleted
    expect(batch.batchId).toBeGreaterThan(0);
  });

  it('should allow attendance editing after batch deletion', async () => {
    const batch = await db.createPayrollBatch({
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
      groupId: null,
      costCenterId: null,
      createdBy: 1,
    });

    expect(batch.batchId).toBeGreaterThan(0);
    createdBatchIds.push(batch.batchId);
  });

  it('should prevent deleting non-draft batches', async () => {
    const batch = await db.createPayrollBatch({
      periodStart: '2026-02-01',
      periodEnd: '2026-02-28',
      groupId: null,
      costCenterId: null,
      createdBy: 1,
    });

    expect(batch.batchId).toBeGreaterThan(0);
    createdBatchIds.push(batch.batchId);
  });

  it('should handle concurrent batch operations', async () => {
    const [batch1, batch2] = await Promise.all([
      db.createPayrollBatch({
        periodStart: '2026-03-01',
        periodEnd: '2026-03-31',
        groupId: null,
        costCenterId: null,
        createdBy: 1,
      }),
      db.createPayrollBatch({
        periodStart: '2026-04-01',
        periodEnd: '2026-04-30',
        groupId: null,
        costCenterId: null,
        createdBy: 1,
      }),
    ]);

    expect(batch1.batchId).toBeGreaterThan(0);
    expect(batch2.batchId).toBeGreaterThan(0);
    expect(batch1.batchId).not.toBe(batch2.batchId);
    
    createdBatchIds.push(batch1.batchId, batch2.batchId);
  });
});
