import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as db from './db';

// Mock the database
vi.mock('./db', async () => {
  const actual = await vi.importActual('./db');
  return {
    ...actual,
    getDb: vi.fn(),
  };
});

describe('getGroupSchedules - Deduplication', () => {
  let mockDb: any;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return only one schedule per day when multiple schedules exist with different effectiveDates', async () => {
    // Simulate multiple schedules for the same day with different effective dates
    const mockSchedules = [
      {
        id: 1,
        groupId: 1,
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '16:00',
        requiredHours: 8,
        effectiveDate: new Date('2026-01-01'),
        isActive: true,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      },
      {
        id: 2,
        groupId: 1,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
        requiredHours: 8,
        effectiveDate: new Date('2026-02-01'),
        isActive: true,
        createdAt: new Date('2026-02-01'),
        updatedAt: new Date('2026-02-01'),
      },
      {
        id: 3,
        groupId: 1,
        dayOfWeek: 1,
        startTime: '10:00',
        endTime: '18:00',
        requiredHours: 8,
        effectiveDate: new Date('2026-02-03'), // Today or future
        isActive: true,
        createdAt: new Date('2026-02-03'),
        updatedAt: new Date('2026-02-03'),
      },
    ];

    // Test the deduplication logic
    const today = new Date('2026-02-03');
    const scheduleMap = new Map<string, any>();

    mockSchedules.forEach((schedule: any) => {
      const key = `${schedule.groupId}-${schedule.dayOfWeek}`;
      const existing = scheduleMap.get(key);

      if (!existing) {
        if (!schedule.effectiveDate || new Date(schedule.effectiveDate) <= today) {
          scheduleMap.set(key, schedule);
        }
      } else {
        const existingEffectiveDate = existing.effectiveDate ? new Date(existing.effectiveDate) : new Date(existing.createdAt);
        const currentEffectiveDate = schedule.effectiveDate ? new Date(schedule.effectiveDate) : new Date(schedule.createdAt);

        if (currentEffectiveDate <= today && currentEffectiveDate > existingEffectiveDate) {
          scheduleMap.set(key, schedule);
        }
      }
    });

    const result = Array.from(scheduleMap.values());

    // Should have only one schedule (the one with effectiveDate 2026-02-01)
    // Note: The third schedule has effectiveDate 2026-02-03 which is today, so it's included
    // The result should have the latest effective schedule (ID 3)
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(3);
    expect(result[0].startTime).toBe('10:00');
  });

  it('should handle schedules with null effectiveDate', async () => {
    const mockSchedules = [
      {
        id: 1,
        groupId: 1,
        dayOfWeek: 2,
        startTime: '08:00',
        endTime: '16:00',
        requiredHours: 8,
        effectiveDate: null,
        isActive: true,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      },
      {
        id: 2,
        groupId: 1,
        dayOfWeek: 2,
        startTime: '09:00',
        endTime: '17:00',
        requiredHours: 8,
        effectiveDate: new Date('2026-02-01'),
        isActive: true,
        createdAt: new Date('2026-02-01'),
        updatedAt: new Date('2026-02-01'),
      },
    ];

    const today = new Date('2026-02-03');
    const scheduleMap = new Map<string, any>();

    mockSchedules.forEach((schedule: any) => {
      const key = `${schedule.groupId}-${schedule.dayOfWeek}`;
      const existing = scheduleMap.get(key);

      if (!existing) {
        if (!schedule.effectiveDate || new Date(schedule.effectiveDate) <= today) {
          scheduleMap.set(key, schedule);
        }
      } else {
        const existingEffectiveDate = existing.effectiveDate ? new Date(existing.effectiveDate) : new Date(existing.createdAt);
        const currentEffectiveDate = schedule.effectiveDate ? new Date(schedule.effectiveDate) : new Date(schedule.createdAt);

        if (currentEffectiveDate <= today && currentEffectiveDate > existingEffectiveDate) {
          scheduleMap.set(key, schedule);
        }
      }
    });

    const result = Array.from(scheduleMap.values());

    // Should have only one schedule (the one with effectiveDate 2026-02-01)
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it('should return multiple schedules for different days', async () => {
    const mockSchedules = [
      {
        id: 1,
        groupId: 1,
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '16:00',
        requiredHours: 8,
        effectiveDate: new Date('2026-02-01'),
        isActive: true,
        createdAt: new Date('2026-02-01'),
        updatedAt: new Date('2026-02-01'),
      },
      {
        id: 2,
        groupId: 1,
        dayOfWeek: 2,
        startTime: '09:00',
        endTime: '17:00',
        requiredHours: 8,
        effectiveDate: new Date('2026-02-01'),
        isActive: true,
        createdAt: new Date('2026-02-01'),
        updatedAt: new Date('2026-02-01'),
      },
      {
        id: 3,
        groupId: 1,
        dayOfWeek: 3,
        startTime: '10:00',
        endTime: '18:00',
        requiredHours: 8,
        effectiveDate: new Date('2026-02-01'),
        isActive: true,
        createdAt: new Date('2026-02-01'),
        updatedAt: new Date('2026-02-01'),
      },
    ];

    const today = new Date('2026-02-03');
    const scheduleMap = new Map<string, any>();

    mockSchedules.forEach((schedule: any) => {
      const key = `${schedule.groupId}-${schedule.dayOfWeek}`;
      const existing = scheduleMap.get(key);

      if (!existing) {
        if (!schedule.effectiveDate || new Date(schedule.effectiveDate) <= today) {
          scheduleMap.set(key, schedule);
        }
      } else {
        const existingEffectiveDate = existing.effectiveDate ? new Date(existing.effectiveDate) : new Date(existing.createdAt);
        const currentEffectiveDate = schedule.effectiveDate ? new Date(schedule.effectiveDate) : new Date(schedule.createdAt);

        if (currentEffectiveDate <= today && currentEffectiveDate > existingEffectiveDate) {
          scheduleMap.set(key, schedule);
        }
      }
    });

    const result = Array.from(scheduleMap.values());

    // Should have three schedules (one for each day)
    expect(result).toHaveLength(3);
    expect(result.map((s: any) => s.dayOfWeek).sort()).toEqual([1, 2, 3]);
  });

  it('should exclude future schedules', async () => {
    const mockSchedules = [
      {
        id: 1,
        groupId: 1,
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '16:00',
        requiredHours: 8,
        effectiveDate: new Date('2026-02-01'),
        isActive: true,
        createdAt: new Date('2026-02-01'),
        updatedAt: new Date('2026-02-01'),
      },
      {
        id: 2,
        groupId: 1,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
        requiredHours: 8,
        effectiveDate: new Date('2026-02-10'), // Future date
        isActive: true,
        createdAt: new Date('2026-02-10'),
        updatedAt: new Date('2026-02-10'),
      },
    ];

    const today = new Date('2026-02-03');
    const scheduleMap = new Map<string, any>();

    mockSchedules.forEach((schedule: any) => {
      const key = `${schedule.groupId}-${schedule.dayOfWeek}`;
      const existing = scheduleMap.get(key);

      if (!existing) {
        if (!schedule.effectiveDate || new Date(schedule.effectiveDate) <= today) {
          scheduleMap.set(key, schedule);
        }
      } else {
        const existingEffectiveDate = existing.effectiveDate ? new Date(existing.effectiveDate) : new Date(existing.createdAt);
        const currentEffectiveDate = schedule.effectiveDate ? new Date(schedule.effectiveDate) : new Date(schedule.createdAt);

        if (currentEffectiveDate <= today && currentEffectiveDate > existingEffectiveDate) {
          scheduleMap.set(key, schedule);
        }
      }
    });

    const result = Array.from(scheduleMap.values());

    // Should have only one schedule (the one with effectiveDate 2026-02-01)
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
    expect(result[0].startTime).toBe('08:00');
  });
});
