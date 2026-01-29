import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as db from './db';

describe('Advanced Payroll Batch System', () => {
  const testUserId = 1; // Assuming user ID 1 exists
  const createdBatchIds: number[] = [];

  // Generate unique batch code with timestamp
  const generateUniqueBatchCode = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `PB-${timestamp}-${random}`;
  };

  beforeEach(() => {
    // Clear batch IDs before each test
    createdBatchIds.length = 0;
  });

  afterEach(async () => {
    // Clean up created batches after each test
    for (const batchId of createdBatchIds) {
      try {
        await db.deleteBatch(batchId);
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
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
    });

    it('should get batch details', async () => {
      const createResult = await db.createPayrollBatch({
        periodStart: '2026-01-08',
        periodEnd: '2026-01-14',
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
      // Create a batch first
      const createResult = await db.createPayrollBatch({
        periodStart: '2026-01-15',
        periodEnd: '2026-01-21',
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
      // Step 1: Create batch
      const createResult = await db.createPayrollBatch({
        periodStart: '2026-01-22',
        periodEnd: '2026-01-28',
        createdBy: testUserId,
      });
      const batchId = createResult.batchId;
      createdBatchIds.push(batchId);

      // Step 2: Submit for review
      await db.submitBatchForReview(batchId, testUserId);
      let details = await db.getPayrollBatchDetails(batchId);
      expect(details.batch.status).toBe('under_accountant_review');

      // Step 3: Accountant approve
      await db.accountantApproveBatch(batchId, testUserId);
      details = await db.getPayrollBatchDetails(batchId);
      expect(details.batch.status).toBe('under_financial_review');

      // Step 4: Financial reviewer approve
      await db.financialReviewerApproveBatch(batchId, testUserId);
      details = await db.getPayrollBatchDetails(batchId);
      expect(details.batch.status).toBe('under_accounts_manager_review');

      // Step 5: Accounts manager approve
      await db.accountsManagerApproveBatch(batchId, testUserId);
      details = await db.getPayrollBatchDetails(batchId);
      expect(details.batch.status).toBe('approved');
    });
  });

  describe('Phase 3: Rejection Workflows', () => {
    it('should allow accountant to reject batch', async () => {
      const createResult = await db.createPayrollBatch({
        periodStart: '2026-02-01',
        periodEnd: '2026-02-07',
        createdBy: testUserId,
      });
      const batchId = createResult.batchId;
      createdBatchIds.push(batchId);

      await db.submitBatchForReview(batchId, testUserId);
      
      await db.accountantRejectBatch({
        batchId,
        reviewerId: testUserId,
        noteType: 'critical',
        note: 'خطأ في حساب الراتب',
        workerId: 5,
        fieldName: 'baseAmount',
      });

      const details = await db.getPayrollBatchDetails(batchId);
      expect(details.batch.status).toBe('returned_from_accountant');
      expect(details.batch.rejectionCount).toBe(1);
    });

    it('should allow financial reviewer to reject batch', async () => {
      const createResult = await db.createPayrollBatch({
        periodStart: '2026-02-08',
        periodEnd: '2026-02-14',
        createdBy: testUserId,
      });
      const batchId = createResult.batchId;
      createdBatchIds.push(batchId);

      await db.submitBatchForReview(batchId, testUserId);
      await db.accountantApproveBatch(batchId, testUserId);
      
      await db.financialReviewerRejectBatch({
        batchId,
        reviewerId: testUserId,
        noteType: 'warning',
        note: 'يجب مراجعة الخصومات',
      });

      const details = await db.getPayrollBatchDetails(batchId);
      expect(details.batch.status).toBe('returned_from_financial_review');
      expect(details.batch.rejectionCount).toBe(1);
    });

    it('should allow accounts manager to reject batch finally', async () => {
      const createResult = await db.createPayrollBatch({
        periodStart: '2026-02-15',
        periodEnd: '2026-02-21',
        createdBy: testUserId,
      });
      const batchId = createResult.batchId;
      createdBatchIds.push(batchId);

      await db.submitBatchForReview(batchId, testUserId);
      await db.accountantApproveBatch(batchId, testUserId);
      await db.financialReviewerApproveBatch(batchId, testUserId);
      
      await db.accountsManagerRejectBatch({
        batchId,
        reviewerId: testUserId,
        note: 'رفض نهائي',
      });

      const details = await db.getPayrollBatchDetails(batchId);
      expect(details.batch.status).toBe('rejected_final');
    });

    it('should track rejection count correctly', async () => {
      const createResult = await db.createPayrollBatch({
        periodStart: '2026-02-22',
        periodEnd: '2026-02-28',
        createdBy: testUserId,
      });
      const batchId = createResult.batchId;
      createdBatchIds.push(batchId);

      // First rejection
      await db.submitBatchForReview(batchId, testUserId);
      await db.accountantRejectBatch({
        batchId,
        reviewerId: testUserId,
        noteType: 'critical',
        note: 'خطأ 1',
      });

      let details = await db.getPayrollBatchDetails(batchId);
      expect(details.batch.rejectionCount).toBe(1);

      // Second rejection
      await db.submitBatchForReview(batchId, testUserId);
      await db.accountantRejectBatch({
        batchId,
        reviewerId: testUserId,
        noteType: 'critical',
        note: 'خطأ 2',
      });

      details = await db.getPayrollBatchDetails(batchId);
      expect(details.batch.rejectionCount).toBe(2);
    });
  });

  describe('Phase 4: Batch Deletion', () => {
    it('should allow deleting DRAFT batches only', async () => {
      const createResult = await db.createPayrollBatch({
        periodStart: '2026-03-01',
        periodEnd: '2026-03-07',
        createdBy: testUserId,
      });

      const deleteResult = await db.deleteBatch(createResult.batchId);
      expect(deleteResult.success).toBe(true);
    });

    it('should not allow deleting non-DRAFT batches', async () => {
      const createResult = await db.createPayrollBatch({
        periodStart: '2026-03-08',
        periodEnd: '2026-03-14',
        createdBy: testUserId,
      });
      const batchId = createResult.batchId;
      createdBatchIds.push(batchId);

      await db.submitBatchForReview(batchId, testUserId);

      await expect(db.deleteBatch(batchId)).rejects.toThrow('Can only delete draft batches');
    });
  });

  describe('Phase 5: Edge Cases', () => {
    it('should not allow submitting non-DRAFT batch', async () => {
      const createResult = await db.createPayrollBatch({
        periodStart: '2026-03-15',
        periodEnd: '2026-03-21',
        createdBy: testUserId,
      });
      const batchId = createResult.batchId;
      createdBatchIds.push(batchId);

      await db.submitBatchForReview(batchId, testUserId);

      await expect(db.submitBatchForReview(batchId, testUserId))
        .rejects.toThrow();
    });

    it('should handle non-existent batch gracefully', async () => {
      await expect(db.getPayrollBatchDetails(999999)).rejects.toThrow('Batch not found');
    });

    it('should not allow accountant to approve non-pending batch', async () => {
      const createResult = await db.createPayrollBatch({
        periodStart: '2026-03-22',
        periodEnd: '2026-03-28',
        createdBy: testUserId,
      });
      const batchId = createResult.batchId;
      createdBatchIds.push(batchId);

      await expect(db.accountantApproveBatch(batchId, testUserId))
        .rejects.toThrow();
    });
  });
});
