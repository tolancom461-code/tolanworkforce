import { describe, it, expect, beforeAll } from 'vitest';
import * as db from './db';

describe('Worker Code Lookup', () => {
  it('should find worker by code field (WRK-008)', async () => {
    const worker = await db.getWorkerByManualCode('WRK-008');
    
    expect(worker).toBeDefined();
    expect(worker).not.toBeNull();
    expect(worker?.code).toBe('WRK-008');
    expect(worker?.fullName).toBe('راشد محمود سعيد');
  });

  it('should find worker by code field (WRK-001)', async () => {
    const worker = await db.getWorkerByManualCode('WRK-001');
    
    expect(worker).toBeDefined();
    expect(worker).not.toBeNull();
    expect(worker?.code).toBe('WRK-001');
  });

  it('should return null for non-existent code', async () => {
    const worker = await db.getWorkerByManualCode('INVALID-999');
    
    expect(worker).toBeNull();
  });

  it('should find worker by manual_code if set', async () => {
    // This test assumes manual_code might be set in the future
    // For now, it should still work with the code field
    const worker = await db.getWorkerByManualCode('WRK-012');
    
    expect(worker).toBeDefined();
    expect(worker).not.toBeNull();
  });
});
