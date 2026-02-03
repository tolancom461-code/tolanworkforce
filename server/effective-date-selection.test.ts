import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as db from './db';
import { getDb } from './db';
import { payrollBatches } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Effective Date Selection for Group Schedules', () => {
  let database: any;

  beforeAll(async () => {
    database = await getDb();
    if (!database) {
      throw new Error('Database connection failed');
    }
  });

  describe('isPayrollBatchLockedForDate', () => {
    it('should return false when no approved batch exists for the date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      const isLocked = await db.isPayrollBatchLockedForDate(futureDate);
      expect(isLocked).toBe(false);
    });

    it('should return true when an approved batch exists for the date', async () => {
      // Create a test batch
      const today = new Date();
      const periodStart = new Date(today);
      periodStart.setDate(periodStart.getDate() - 7);
      
      const periodEnd = new Date(today);
      
      const testBatch = {
        batchCode: `TEST-${Date.now()}`,
        periodStart: periodStart.toISOString().split('T')[0],
        periodEnd: periodEnd.toISOString().split('T')[0],
        status: 'approved' as const,
        totalAmount: '0.00',
        totalWorkers: 0,
        totalDeductions: '0.00',
        totalBonuses: '0.00',
      };

      // Insert test batch
      const result = await database.insert(payrollBatches).values(testBatch);
      const batchId = result[0].insertId;

      try {
        // Test with a date within the batch period
        const testDate = new Date(today);
        testDate.setDate(testDate.getDate() - 3);
        
        const isLocked = await db.isPayrollBatchLockedForDate(testDate);
        expect(isLocked).toBe(true);
      } finally {
        // Clean up
        await database.delete(payrollBatches).where(eq(payrollBatches.id, batchId));
      }
    });

    it('should return false when batch status is not approved', async () => {
      const today = new Date();
      const periodStart = new Date(today);
      periodStart.setDate(periodStart.getDate() - 7);
      
      const periodEnd = new Date(today);
      
      const testBatch = {
        batchCode: `TEST-DRAFT-${Date.now()}`,
        periodStart: periodStart.toISOString().split('T')[0],
        periodEnd: periodEnd.toISOString().split('T')[0],
        status: 'draft' as const,
        totalAmount: '0.00',
        totalWorkers: 0,
        totalDeductions: '0.00',
        totalBonuses: '0.00',
      };

      const result = await database.insert(payrollBatches).values(testBatch);
      const batchId = result[0].insertId;

      try {
        const testDate = new Date(today);
        testDate.setDate(testDate.getDate() - 3);
        
        const isLocked = await db.isPayrollBatchLockedForDate(testDate);
        expect(isLocked).toBe(false);
      } finally {
        await database.delete(payrollBatches).where(eq(payrollBatches.id, batchId));
      }
    });
  });

  describe('Date calculation logic', () => {
    it('should correctly identify current week Friday', () => {
      const today = new Date();
      const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      
      // Calculate days to Friday (5)
      let daysToFriday = (5 - currentDay + 7) % 7;
      if (daysToFriday === 0 && currentDay !== 5) daysToFriday = 0;
      
      const fridayDate = new Date(today);
      fridayDate.setDate(fridayDate.getDate() + daysToFriday);
      
      expect(fridayDate.getDay()).toBe(5); // Friday
    });

    it('should correctly identify next week Friday', () => {
      const today = new Date();
      const currentDay = today.getDay();
      
      // Calculate days to next Friday
      let daysToFriday = (5 - currentDay + 7) % 7;
      if (daysToFriday <= 0) daysToFriday += 7;
      
      const nextFridayDate = new Date(today);
      nextFridayDate.setDate(nextFridayDate.getDate() + daysToFriday);
      
      expect(nextFridayDate.getDay()).toBe(5); // Friday
      expect(nextFridayDate.getTime()).toBeGreaterThan(today.getTime());
    });

    it('should correctly identify previous week Friday', () => {
      const today = new Date();
      const currentDay = today.getDay();
      
      // Calculate days to previous Friday
      let daysToFriday = (5 - currentDay - 7 + 14) % 7;
      if (daysToFriday >= 0) daysToFriday -= 7;
      
      const prevFridayDate = new Date(today);
      prevFridayDate.setDate(prevFridayDate.getDate() + daysToFriday);
      
      expect(prevFridayDate.getDay()).toBe(5); // Friday
      expect(prevFridayDate.getTime()).toBeLessThan(today.getTime());
    });
  });
});
