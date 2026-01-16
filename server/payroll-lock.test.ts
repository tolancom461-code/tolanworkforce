import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as db from './db';

describe('Payroll Lock System', () => {
  let testWorkerId: number;
  let testBatchId: number;
  let testEventId: number;
  const testDate = '2025-06-15'; // Use future date to avoid conflicts

  beforeAll(async () => {
    // Clean up old test batches for this specific date range
    const dbInstance = await db.getDb();
    if (dbInstance) {
      const { payrollBatches, payrollBatchItems, payrollBatchNotes, payrollBatchCorrections } = await import('../drizzle/schema');
      const { eq } = await import('drizzle-orm');
      
      // Delete batches in June 2025
      const juneBatches = await dbInstance
        .select()
        .from(payrollBatches)
        .where(eq(payrollBatches.periodStart, '2025-06-01'));
        
      for (const batch of juneBatches) {
        try {
          await dbInstance.delete(payrollBatchItems).where(eq(payrollBatchItems.batchId, batch.id));
          await dbInstance.delete(payrollBatchNotes).where(eq(payrollBatchNotes.batchId, batch.id));
          await dbInstance.delete(payrollBatchCorrections).where(eq(payrollBatchCorrections.batchId, batch.id));
          await dbInstance.delete(payrollBatches).where(eq(payrollBatches.id, batch.id));
        } catch (e) {
          // Ignore errors
        }
      }
    }
    
    // Create test worker
    const workers = await db.getAllWorkers();
    if (workers.length > 0) {
      testWorkerId = workers[0].id;
    } else {
      throw new Error('No workers found in database. Please seed data first.');
    }

    // Create attendance event for testing
    const result = await db.recordAttendance(testWorkerId, 'check_in', 'manual');
    testEventId = result.eventId;
  });

  it('should allow attendance editing when no payroll batch exists', async () => {
    // Try to update attendance event
    const newTime = new Date(`${testDate}T09:00:00`).toISOString();
    
    const result = await db.updateAttendanceEvent(
      testEventId,
      newTime,
      'Test adjustment',
      1
    );
    
    expect(result.success).toBe(true);
  });

  it('should create payroll batch successfully', async () => {
    const result = await db.createPayrollBatch({
      periodStart: '2025-06-01',
      periodEnd: '2025-06-30',
      createdBy: 1,
    });
    
    expect(result.batchCode).toBeDefined();
    expect(result.batchId).toBeDefined();
    testBatchId = result.batchId;
  });

  it('should detect payroll batch for date', async () => {
    const batch = await db.checkPayrollBatchForDate(testDate);
    
    expect(batch).not.toBeNull();
    expect(batch?.batchCode).toBeDefined();
  });

  it('should prevent attendance editing after batch creation', async () => {
    const newTime = new Date(`${testDate}T10:00:00`).toISOString();
    
    await expect(
      db.updateAttendanceEvent(testEventId, newTime, 'Test adjustment 2', 1)
    ).rejects.toThrow('لا يمكن تعديل الحضور بعد إنشاء دفعة الراتب');
  });

  it('should prevent adding deductions after batch creation', async () => {
    await expect(
      db.addFinanceEntry(testWorkerId, testDate, 'deduction', 50, 'Test deduction')
    ).rejects.toThrow('لا يمكن إضافة خصومات أو إضافات بعد إنشاء دفعة الراتب');
  });

  it('should prevent disabling full day override after batch creation', async () => {
    // First enable override
    await db.setFullDayOverride(testWorkerId, testDate, true, 'Test override', 1);
    
    // Try to disable it (should fail because batch exists)
    await expect(
      db.setFullDayOverride(testWorkerId, testDate, false, 'Cancel override', 1)
    ).rejects.toThrow('لا يمكن إلغاء اعتماد الحضور الكامل بعد إنشاء دفعة الراتب');
  });

  it('should allow enabling full day override even after batch creation', async () => {
    const result = await db.setFullDayOverride(
      testWorkerId,
      testDate,
      true,
      'Enable override',
      1
    );
    
    expect(result.success).toBe(true);
  });

  it('should delete draft batch successfully', async () => {
    const result = await db.deleteBatch(testBatchId);
    
    expect(result.success).toBe(true);
  });

  it('should not find batch after deletion', async () => {
    const batch = await db.checkPayrollBatchForDate(testDate);
    
    expect(batch).toBeNull();
  });

  it('should allow attendance editing after batch deletion', async () => {
    const newTime = new Date(`${testDate}T11:00:00`).toISOString();
    
    const result = await db.updateAttendanceEvent(
      testEventId,
      newTime,
      'Test adjustment after deletion',
      1
    );
    
    expect(result.success).toBe(true);
  });

  it('should prevent deleting non-draft batches', async () => {
    // Create a new batch
    const result = await db.createPayrollBatch({
      periodStart: '2025-07-01',
      periodEnd: '2025-07-31',
      createdBy: 1,
    });
    
    // Change status to approved (simulate approval)
    const dbInstance = await db.getDb();
    if (dbInstance) {
      const { payrollBatches } = await import('../drizzle/schema');
      const { eq } = await import('drizzle-orm');
      await dbInstance
        .update(payrollBatches)
        .set({ status: 'approved' })
        .where(eq(payrollBatches.id, result.batchId));
    }
    
    // Try to delete (should fail)
    await expect(db.deleteBatch(result.batchId)).rejects.toThrow('Can only delete draft batches');
  }, 10000); // Increase timeout for this test
});
