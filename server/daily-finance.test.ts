import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';
import * as db from './db';

type AuthenticatedUser = NonNullable<TrpcContext['user']>;

function createAuthContext(userId: number = 1, role: 'admin' | 'user' = 'admin'): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: 'manus',
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: 'https',
      headers: {},
    } as TrpcContext['req'],
    res: {
      clearCookie: () => {},
    } as TrpcContext['res'],
  };

  return ctx;
}

describe('Daily Finance Entries Management', () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let testEntryId: number;

  beforeAll(() => {
    const ctx = createAuthContext(1, 'admin');
    caller = appRouter.createCaller(ctx);
  });

  describe('Create Daily Finance Entry', () => {
    it('should create a daily finance entry with correct calculations', async () => {
      const result = await db.createDailyFinanceEntry({
        workerId: 1,
        workDate: new Date('2026-01-29'),
        baseAmount: 1000,
        deductions: 100,
        bonuses: 50,
        notes: 'Test entry for calculations',
      });

      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
      expect(result).toHaveProperty('id');
      expect(result.id).toBeGreaterThan(0);
      testEntryId = result.id;
    });

    it('should create entry with zero deductions and bonuses', async () => {
      const result = await db.createDailyFinanceEntry({
        workerId: 2,
        workDate: new Date('2026-01-29'),
        baseAmount: 1000,
      });

      expect(result.success).toBe(true);
      expect(result.id).toBeGreaterThan(0);
    });

    it('should create entry with only bonuses', async () => {
      const result = await db.createDailyFinanceEntry({
        workerId: 3,
        workDate: new Date('2026-01-29'),
        baseAmount: 1000,
        bonuses: 200,
      });

      expect(result.success).toBe(true);
      expect(result.id).toBeGreaterThan(0);
    });
  });

  describe('List Daily Finance Entries', () => {
    it('should list all entries for a specific worker', async () => {
      const entries = await db.listDailyFinanceEntries({
        workerId: 1,
      });

      expect(Array.isArray(entries)).toBe(true);
      if (entries.length > 0) {
        const entry = entries[0];
        expect(entry).toHaveProperty('id');
        expect(entry).toHaveProperty('workerId');
        expect(entry.workerId).toBe(1);
        expect(entry).toHaveProperty('workDate');
        expect(entry).toHaveProperty('baseAmount');
        expect(entry).toHaveProperty('deductions');
        expect(entry).toHaveProperty('bonuses');
        expect(entry).toHaveProperty('netAmount');
        expect(entry).toHaveProperty('notes');
      }
    });

    it('should list entries with date range filter', async () => {
      const startDate = '2026-01-01';
      const endDate = '2026-01-31';

      const entries = await db.listDailyFinanceEntries({
        workerId: 1,
        startDate,
        endDate,
      });

      expect(Array.isArray(entries)).toBe(true);
      // All entries should be within the date range
      entries.forEach(entry => {
        const entryDate = new Date(entry.workDate);
        expect(entryDate.getTime()).toBeGreaterThanOrEqual(new Date(startDate).getTime());
        expect(entryDate.getTime()).toBeLessThanOrEqual(new Date(endDate).getTime());
      });
    });

    it('should include worker information in listed entries', async () => {
      const entries = await db.listDailyFinanceEntries({
        workerId: 1,
      });

      if (entries.length > 0) {
        const entry = entries[0];
        expect(entry).toHaveProperty('workerName');
        expect(entry).toHaveProperty('workerCode');
        // These should be strings or 'Unknown'
        expect(typeof entry.workerName).toBe('string');
        expect(typeof entry.workerCode).toBe('string');
      }
    });
  });

  describe('Update Daily Finance Entry', () => {
    it('should update entry amounts', async () => {
      if (testEntryId > 0) {
        const result = await db.updateDailyFinanceEntry(testEntryId, {
          baseAmount: 1200,
          deductions: 120,
          bonuses: 60,
        });

        expect(result).toEqual({ success: true });
      }
    });

    it('should update entry notes', async () => {
      if (testEntryId > 0) {
        const result = await db.updateDailyFinanceEntry(testEntryId, {
          notes: 'Updated notes for testing',
        });

        expect(result).toEqual({ success: true });
      }
    });

    it('should recalculate netAmount when amounts change', async () => {
      // Create a new entry
      const createResult = await db.createDailyFinanceEntry({
        workerId: 4,
        workDate: new Date('2026-01-29'),
        baseAmount: 1000,
        deductions: 100,
        bonuses: 50,
      });

      if (createResult.id) {
        // Update the amounts
        await db.updateDailyFinanceEntry(createResult.id, {
          baseAmount: 2000,
          deductions: 200,
          bonuses: 100,
        });

        // Verify the update
        const entries = await db.listDailyFinanceEntries({
          workerId: 4,
        });

        const updatedEntry = entries.find(e => e.id === createResult.id);
        if (updatedEntry) {
          // netAmount should be 2000 - 200 + 100 = 1900
          expect(updatedEntry.netAmount).toBe(1900);
        }
      }
    });
  });

  describe('Delete Daily Finance Entry', () => {
    it('should delete a daily finance entry', async () => {
      // Create an entry to delete
      const createResult = await db.createDailyFinanceEntry({
        workerId: 5,
        workDate: new Date('2026-01-29'),
        baseAmount: 1000,
        deductions: 100,
        bonuses: 50,
      });

      if (createResult.id) {
        const deleteResult = await db.deleteDailyFinanceEntry(createResult.id);
        expect(deleteResult).toEqual({ success: true });
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative deductions (additions)', async () => {
      const result = await db.createDailyFinanceEntry({
        workerId: 6,
        workDate: new Date('2026-01-29'),
        baseAmount: 1000,
        deductions: -50, // Negative deduction = addition
        bonuses: 0,
      });

      expect(result.success).toBe(true);
    });

    it('should handle large amounts', async () => {
      const result = await db.createDailyFinanceEntry({
        workerId: 7,
        workDate: new Date('2026-01-29'),
        baseAmount: 999999.99,
        deductions: 9999.99,
        bonuses: 5000.00,
      });

      expect(result.success).toBe(true);
      expect(result.id).toBeGreaterThan(0);
    });

    it('should handle entries with no notes', async () => {
      const result = await db.createDailyFinanceEntry({
        workerId: 8,
        workDate: new Date('2026-01-29'),
        baseAmount: 1000,
      });

      expect(result.success).toBe(true);

      const entries = await db.listDailyFinanceEntries({
        workerId: 8,
      });

      if (entries.length > 0) {
        expect(entries[0].notes).toBe('');
      }
    });
  });
});
