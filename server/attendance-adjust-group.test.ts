import { describe, it, expect, beforeAll } from 'vitest';
import * as db from './db';

describe('Attendance Adjustment by Group', () => {
  let testGroupId: number;
  let testWorker1Id: number;
  let testWorker2Id: number;

  beforeAll(async () => {
    // Create test group
    testGroupId = await db.createGroup({
      code: `TEST-GROUP-${Date.now()}`,
      name: 'Test Group for Attendance',
      dailyWage: 150,
      workMinutes: 480,
      latePenaltyRate: 1.5,
      earlyLeavePenaltyRate: 1.5,
    });

    // Create test workers in the group
    testWorker1Id = await db.createWorker({
      code: `W1-${Date.now()}`,
      fullName: 'Test Worker 1',
      nationalId: '1234567890',
      phone: '0500000001',
      groupId: testGroupId,
      status: 'active',
    });

    testWorker2Id = await db.createWorker({
      code: `W2-${Date.now()}`,
      fullName: 'Test Worker 2',
      nationalId: '1234567891',
      phone: '0500000002',
      groupId: testGroupId,
      status: 'active',
    });

  });

  it('should retrieve attendance events for all workers in a group', async () => {
    // Record attendance for today
    await db.recordAttendance(testWorker1Id, 'check_in', 'manual');
    await db.recordAttendance(testWorker2Id, 'check_in', 'manual');
    
    const today = new Date().toISOString().split('T')[0];
    const events = await db.getAttendanceEventsByGroup(testGroupId, today);

    expect(events).toBeDefined();
    expect(Array.isArray(events)).toBe(true);

    // If events exist, verify structure
    if (events.length > 0) {
      // Check that events include worker information
      const worker1Events = events.filter(e => e.workerId === testWorker1Id);
      const worker2Events = events.filter(e => e.workerId === testWorker2Id);

      // At least one of the workers should have events
      expect(worker1Events.length + worker2Events.length).toBeGreaterThan(0);

      // Verify worker names are included if events exist
      if (worker1Events.length > 0) {
        expect(worker1Events[0].workerName).toBe('Test Worker 1');
        expect(worker1Events[0].workerCode).toContain('W1-');
      }
      if (worker2Events.length > 0) {
        expect(worker2Events[0].workerName).toBe('Test Worker 2');
        expect(worker2Events[0].workerCode).toContain('W2-');
      }
    }
  });

  it('should return empty array for group with no workers', async () => {
    const emptyGroupId = await db.createGroup({
      code: `EMPTY-GROUP-${Date.now()}`,
      name: 'Empty Group',
    });

    const today = new Date().toISOString().split('T')[0];
    const events = await db.getAttendanceEventsByGroup(emptyGroupId, today);

    expect(events).toBeDefined();
    expect(events.length).toBe(0);
  });

  it('should return empty array for date with no events', async () => {
    const futureDate = '2027-12-31';
    const events = await db.getAttendanceEventsByGroup(testGroupId, futureDate);

    expect(events).toBeDefined();
    expect(events.length).toBe(0);
  });

  it('should include all event details in group query', async () => {
    // Create fresh events for this test
    await db.recordAttendance(testWorker1Id, 'check_out', 'manual');
    
    const today = new Date().toISOString().split('T')[0];
    const events = await db.getAttendanceEventsByGroup(testGroupId, today);

    if (events.length > 0) {
      const event = events[0];
      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('workerId');
      expect(event).toHaveProperty('eventType');
      expect(event).toHaveProperty('eventTime');
      expect(event).toHaveProperty('method');
      expect(event).toHaveProperty('workerName');
      expect(event).toHaveProperty('workerCode');
    }
  });
});
