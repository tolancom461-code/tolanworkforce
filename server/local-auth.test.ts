import { describe, it, expect, beforeAll } from 'vitest';
import * as db from './db';

describe('Local Authentication', () => {
  let testUserId: number;
  
  beforeAll(async () => {
    // Create a test user
    testUserId = await db.createLocalUser({
      username: 'testuser_local',
      password: 'testpass123',
      fullName: 'Test User Local',
      email: 'test@local.com',
    });
  });
  
  it('should hash password correctly', async () => {
    const password = 'mypassword123';
    const hash = await db.hashPassword(password);
    
    expect(hash).toBeTruthy();
    expect(hash).not.toBe(password);
    expect(hash.startsWith('$2b$')).toBe(true);
  });
  
  it('should verify correct password', async () => {
    const password = 'mypassword123';
    const hash = await db.hashPassword(password);
    
    const isValid = await db.verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });
  
  it('should reject incorrect password', async () => {
    const password = 'mypassword123';
    const hash = await db.hashPassword(password);
    
    const isValid = await db.verifyPassword('wrongpassword', hash);
    expect(isValid).toBe(false);
  });
  
  it('should create local user successfully', async () => {
    const userId = await db.createLocalUser({
      username: 'newuser_test',
      password: 'newpass123',
      fullName: 'New Test User',
    });
    
    expect(userId).toBeTruthy();
    expect(typeof userId).toBe('number');
    
    // Verify user was created
    const user = await db.getUserById(userId);
    expect(user).toBeTruthy();
    expect(user?.username).toBe('newuser_test');
    expect(user?.fullName).toBe('New Test User');
    expect(user?.loginMethod).toBe('local');
    expect(user?.passwordHash).toBeTruthy();
  });
  
  it('should authenticate user with correct credentials', async () => {
    const user = await db.authenticateLocalUser('testuser_local', 'testpass123');
    
    expect(user).toBeTruthy();
    expect(user?.username).toBe('testuser_local');
    expect(user?.fullName).toBe('Test User Local');
  });
  
  it('should reject authentication with wrong password', async () => {
    const user = await db.authenticateLocalUser('testuser_local', 'wrongpassword');
    
    expect(user).toBeNull();
  });
  
  it('should reject authentication with non-existent user', async () => {
    const user = await db.authenticateLocalUser('nonexistent_user', 'anypassword');
    
    expect(user).toBeNull();
  });
  
  it('should authenticate omar user', async () => {
    const user = await db.authenticateLocalUser('omar', 'admin1');
    
    expect(user).toBeTruthy();
    expect(user?.username).toBe('omar');
    expect(user?.fullName).toBe('Omar - Administrator');
    expect(user?.role).toBe('admin');
    expect(user?.isActive).toBe(true);
  });
  
  it('should verify omar has all permissions', async () => {
    const user = await db.getUserByUsername('omar');
    expect(user).toBeTruthy();
    
    if (user) {
      const permissions = await db.getUserPermissions(user.id);
      const allPermissions = await db.getAllPermissions();
      
      expect(permissions.length).toBe(allPermissions.length);
      expect(permissions.length).toBeGreaterThan(40); // Should have 41+ permissions
    }
  });
});
