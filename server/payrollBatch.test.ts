import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as db from './db';

describe('Advanced Payroll Batch System', () => {
  const testUserId = 1;
  const createdBatchIds: number[] = [];
  let batchCounter = 0;

  // Generate unique batch code with counter
  const generateUniqueBatchCode = () => {
    batchCounter++;
    const timestamp = Date.now();
    return `PB-${timestamp}-${batchCounter}`;
  };

  beforeEach(() => {
    createdBatchIds.length = 0;
  });

  afterEach(async () => {
    // Advanced cleanup with error handling
    for (const batchId of createdBatchIds) {
      try {
        // Try to delete batch
        await db.deleteBatch(batchId);
      } catch (error) {
        // Log error but continue cleanup
        console.debug(`Cleanup error for batch ${batchId}:`, error);
      }
    }
    // Clear array
    createdBatchIds.length = 0;
  });

  describe('Phase 1: Batch Creation', () => {
    it('should create a payroll batch in DRAFT status', async () => {
      const result = await db.createPayrollBatch({
        periodStart: '2026-01-01',
        periodEnd: '2026-01-07',
        createdBy: testUserId,
      });

      createdBatchIds.push(result.batchId);

      expect(result).toHaveProperty('batchId');
      expect(result).toHaveProperty('batchCode');
      expect(result.batchId).toBeGreaterThan(0);
      expect(result.batchCode).toMatch(/^PB-/);
    });

    it('should create batches with unique codes', async () => {
      const batch1 = await db.createPayrollBatch({
        periodStart: '2026-01-08',
        periodEnd: '2026-01-14',
        createdBy: testUserId,
      });
      createdBatchIds.push(batch1.batchId);

      const batch2 = await db.createPayrollBatch({
        periodStart: '2026-01-15',
        periodEnd: '2026-01-21',
        createdBy: testUserId,
      });
      createdBatchIds.push(batch2.batchId);

      expect(batch1.batchCode).not.toBe(batch2.batchCode);
      expect(batch1.batchId).not.toBe(batch2.batchId);
    });

    it('should get batch details', async () => {
      const createResult = await db.createPayrollBatch({
        periodStart: '2026-01-22',
        periodEnd: '2026-01-28',
        createdBy: testUserId,
      });

      createdBatchIds.push(createResult.batchId);

      const details = await db.getPayrollBatchDetails(createResult.batchId);

      expect(details).toHaveProperty('batch');
      expect(details.batch.status).toBe('draft');
      expect(details).toHaveProperty('items');
      expect(Array.isArray(details.items)).toBe(true);
    });

    it('should list batches by status', async () => {
      const createResult = await db.createPayrollBatch({
        periodStart: '2026-02-01',
        periodEnd: '2026-02-07',
        createdBy: testUserId,
      });

      createdBatchIds.push(createResult.batchId);

      const batches = await db.getBatchesByStatus('draft');

      expect(Array.isArray(batches)).toBe(true);
      expect(batches.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Phase 2: Full Approval Workflow', () => {
    it('should complete full approval workflow: draft → approved', async () => {
      const batch = await db.createPayrollBatch({
        periodStart: '2026-02-08',
        periodEnd: '2026-02-14',
        createdBy: testUserId,
      });

      createdBatchIds.push(batch.batchId);

      // Submit for review
      await db.submitBatchForReview(batch.batchId, testUserId);
      let details = await db.getPayrollBatchDetails(batch.batchId);
      expect(details.batch.status).toBe('under_accountant_review');

      // Accountant approve
      await db.accountantApproveBatch(batch.batchId, testUserId);
      details = await db.getPayrollBatchDetails(batch.batchId);
      expect(details.batch.status).toBe('under_financial_review');

      // Financial reviewer approve
      await db.financialReviewerApproveBatch(batch.batchId, testUserId);
      details = await db.getPayrollBatchDetails(batch.batchId);
      expect(details.batch.status).toBe('under_accounts_manager_review');

      // Accounts manager approve
      await db.accountsManagerApproveBatch(batch.batchId, testUserId);
      details = await db.getPayrollBatchDetails(batch.batchId);
      expect(details.batch.status).toBe('approved');
    });

    it('should handle rejection at accountant stage', async () => {
      const batch = await db.createPayrollBatch({
        periodStart: '2026-02-15',
        periodEnd: '2026-02-21',
        createdBy: testUserId,
      });

      createdBatchIds.push(batch.batchId);

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
      expect(details.batch.rejectionCount).toBeGreaterThanOrEqual(1);
    });

    it('should handle rejection and resubmission', async () => {
      const batch = await db.createPayrollBatch({
        periodStart: '2026-02-22',
        periodEnd: '2026-02-28',
        createdBy: testUserId,
      });

      createdBatchIds.push(batch.batchId);

      // Submit
      await db.submitBatchForReview(batch.batchId, testUserId);

      // Reject
      await db.accountantRejectBatch({
        batchId: batch.batchId,
        reviewerId: testUserId,
        noteType: 'warning',
        note: 'يحتاج تصحيح',
      });

      let details = await db.getPayrollBatchDetails(batch.batchId);
      expect(details.batch.status).toBe('returned_from_accountant');

      // Resubmit
      await db.submitBatchForReview(batch.batchId, testUserId);
      details = await db.getPayrollBatchDetails(batch.batchId);
      expect(details.batch.status).toBe('under_accountant_review');
    });
  });

  describe('Phase 3: Batch Calculations', () => {
    it('should calculate batch totals correctly', async () => {
      const batch = await db.createPayrollBatch({
        periodStart: '2026-03-01',
        periodEnd: '2026-03-07',
        createdBy: testUserId,
      });

      createdBatchIds.push(batch.batchId);

      const details = await db.getPayrollBatchDetails(batch.batchId);

      expect(details.batch).toHaveProperty('totalAmount');
      expect(details.batch).toHaveProperty('totalWorkers');
      expect(details.batch).toHaveProperty('totalDeductions');
      expect(details.batch).toHaveProperty('totalBonuses');

      expect(typeof details.batch.totalAmount).toBe('number');
      expect(typeof details.batch.totalWorkers).toBe('number');
    });

    it('should handle empty batches', async () => {
      const batch = await db.createPayrollBatch({
        periodStart: '2026-03-08',
        periodEnd: '2026-03-14',
        createdBy: testUserId,
      });

      createdBatchIds.push(batch.batchId);

      const details = await db.getPayrollBatchDetails(batch.batchId);

      expect(details.batch.totalAmount).toBe(0);
      expect(details.batch.totalWorkers).toBe(0);
      expect(Array.isArray(details.items)).toBe(true);
    });
  });

  describe('Phase 4: Batch History and Tracking', () => {
    it('should track batch creation history', async () => {
      const batch = await db.createPayrollBatch({
        periodStart: '2026-03-15',
        periodEnd: '2026-03-21',
        createdBy: testUserId,
      });

      createdBatchIds.push(batch.batchId);

      const details = await db.getPayrollBatchDetails(batch.batchId);

      expect(details.batch).toHaveProperty('createdAt');
      expect(details.batch).toHaveProperty('createdBy');
      expect(details.batch.createdBy).toBe(testUserId);
    });

    it('should track batch updates', async () => {
      const batch = await db.createPayrollBatch({
        periodStart: '2026-03-22',
        periodEnd: '2026-03-28',
        createdBy: testUserId,
      });

      createdBatchIds.push(batch.batchId);

      const detailsBefore = await db.getPayrollBatchDetails(batch.batchId);
      const createdAtBefore = detailsBefore.batch.updatedAt;

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Submit for review
      await db.submitBatchForReview(batch.batchId, testUserId);

      const detailsAfter = await db.getPayrollBatchDetails(batch.batchId);

      expect(detailsAfter.batch).toHaveProperty('updatedAt');
      // Updated time should be after or equal to creation time
      expect(new Date(detailsAfter.batch.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(createdAtBefore).getTime()
      );
    });
  });

  describe('Phase 5: Error Handling', () => {
    it('should handle invalid batch ID', async () => {
      await expect(db.getPayrollBatchDetails(999999)).rejects.toThrow();
    });

    it('should prevent duplicate submission', async () => {
      const batch = await db.createPayrollBatch({
        periodStart: '2026-04-01',
        periodEnd: '2026-04-07',
        createdBy: testUserId,
      });

      createdBatchIds.push(batch.batchId);

      // Submit once
      await db.submitBatchForReview(batch.batchId, testUserId);

      // Try to submit again - should fail
      await expect(db.submitBatchForReview(batch.batchId, testUserId)).rejects.toThrow();
    });

    it('should handle invalid status transitions', async () => {
      const batch = await db.createPayrollBatch({
        periodStart: '2026-04-08',
        periodEnd: '2026-04-14',
        createdBy: testUserId,
      });

      createdBatchIds.push(batch.batchId);

      // Try to approve without submitting - should fail
      await expect(db.accountantApproveBatch(batch.batchId, testUserId)).rejects.toThrow();
    });
  });

  describe('Phase 6: Batch Deletion', () => {
    it('should delete draft batches', async () => {
      const batch = await db.createPayrollBatch({
        periodStart: '2026-04-15',
        periodEnd: '2026-04-21',
        createdBy: testUserId,
      });

      // Delete immediately (before adding to cleanup list)
      await db.deleteBatch(batch.batchId);

      // Verify deletion
      await expect(db.getPayrollBatchDetails(batch.batchId)).rejects.toThrow();
    });

    it('should prevent deletion of approved batches', async () => {
      const batch = await db.createPayrollBatch({
        periodStart: '2026-04-22',
        periodEnd: '2026-04-28',
        createdBy: testUserId,
      });

      createdBatchIds.push(batch.batchId);

      // Submit and approve
      await db.submitBatchForReview(batch.batchId, testUserId);
      await db.accountantApproveBatch(batch.batchId, testUserId);
      await db.financialReviewerApproveBatch(batch.batchId, testUserId);
      await db.accountsManagerApproveBatch(batch.batchId, testUserId);

      // Try to delete - should fail
      await expect(db.deleteBatch(batch.batchId)).rejects.toThrow();
    });
  });
});
