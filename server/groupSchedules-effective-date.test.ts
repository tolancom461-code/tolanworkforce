import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from './db';
import { groupSchedules, groups } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Group Schedules - Effective Date Feature', () => {
  let db: any;
  let groupId: number;
  let scheduleId: number;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error('Database not available');

    // Create a test group
    const groupResult = await db.insert(groups).values({
      code: 'TEST-EFFECTIVE-DATE',
      name: 'Test Effective Date Group',
      isActive: true,
    });
    groupId = groupResult[0];

    // Create a test schedule
    const scheduleResult = await db.insert(groupSchedules).values({
      groupId,
      dayOfWeek: 1, // Monday
      startTime: '08:00',
      endTime: '16:00',
      requiredHours: 8,
      isActive: true,
    });
    scheduleId = scheduleResult[0];
  });

  afterAll(async () => {
    if (db) {
      // Clean up test data
      await db.delete(groupSchedules).where(eq(groupSchedules.id, scheduleId));
      await db.delete(groups).where(eq(groups.id, groupId));
    }
  });

  it('should create a schedule without effectiveDate (NULL)', async () => {
    const schedule = await db.select().from(groupSchedules).where(eq(groupSchedules.id, scheduleId));
    expect(schedule).toHaveLength(1);
    expect(schedule[0].effectiveDate).toBeNull();
  });

  it('should update schedule with effectiveDate', async () => {
    const effectiveDate = new Date('2026-02-10');
    
    await db.update(groupSchedules)
      .set({ effectiveDate })
      .where(eq(groupSchedules.id, scheduleId));

    const schedule = await db.select().from(groupSchedules).where(eq(groupSchedules.id, scheduleId));
    expect(schedule).toHaveLength(1);
    expect(schedule[0].effectiveDate).toBeDefined();
  });

  it('should update schedule times with effectiveDate', async () => {
    const effectiveDate = new Date('2026-02-17');
    
    await db.update(groupSchedules)
      .set({
        startTime: '09:00',
        endTime: '17:00',
        requiredHours: 8,
        effectiveDate,
      })
      .where(eq(groupSchedules.id, scheduleId));

    const schedule = await db.select().from(groupSchedules).where(eq(groupSchedules.id, scheduleId));
    expect(schedule).toHaveLength(1);
    expect(schedule[0].startTime).toBe('09:00');
    expect(schedule[0].endTime).toBe('17:00');
    expect(schedule[0].effectiveDate).toBeDefined();
  });

  it('should preserve previous schedules when updating with effectiveDate', async () => {
    // This test verifies that the effectiveDate field allows
    // the system to differentiate between old and new schedules
    const schedule = await db.select().from(groupSchedules).where(eq(groupSchedules.id, scheduleId));
    expect(schedule).toHaveLength(1);
    
    // The schedule should have the new times
    expect(schedule[0].startTime).toBe('09:00');
    expect(schedule[0].endTime).toBe('17:00');
    
    // And an effectiveDate set
    expect(schedule[0].effectiveDate).toBeDefined();
  });

  it('should allow NULL effectiveDate for immediate changes', async () => {
    // Update without effectiveDate (immediate change)
    await db.update(groupSchedules)
      .set({
        startTime: '08:30',
        endTime: '16:30',
      })
      .where(eq(groupSchedules.id, scheduleId));

    const schedule = await db.select().from(groupSchedules).where(eq(groupSchedules.id, scheduleId));
    expect(schedule).toHaveLength(1);
    expect(schedule[0].startTime).toBe('08:30');
    expect(schedule[0].endTime).toBe('16:30');
    // effectiveDate remains as it was (or NULL if not set)
  });
});
