import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';
import * as db from './db';

describe('Permission Middleware Tests', () => {
  let testUserId: number;
  let testRoleId: number;
  let testPermissionId: number;
  let userWithoutPermissions: number;

  beforeAll(async () => {
    // Create test permission
    const permResult = await db.createPermission({
      code: 'test_permission',
      name: 'Test Permission',
      description: 'For testing only',
      category: 'test',
    });
    testPermissionId = permResult.id;

    // Create test role with permission
    const roleResult = await db.createRole({
      code: 'test_role',
      name: 'Test Role',
      description: 'Role for testing',
      level: 1,
    });
    testRoleId = roleResult.id;

    // Assign permission to role
    await db.updateRolePermissions(testRoleId, [testPermissionId]);

    // Create test user with role
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash('testpass', 10);
    testUserId = await db.createUser({
      username: 'testuser_perm',
      passwordHash,
      fullName: 'Test User With Permissions',
      email: 'testperm@test.com',
      roleId: testRoleId,
      isActive: true,
    });

    // Create user without permissions
    userWithoutPermissions = await db.createUser({
      username: 'testuser_noperm',
      passwordHash,
      fullName: 'Test User Without Permissions',
      email: 'noperm@test.com',
      roleId: null,
      isActive: true,
    });
  });

  afterAll(async () => {
    // Cleanup
    try {
      await db.deleteUser(testUserId);
      await db.deleteUser(userWithoutPermissions);
      await db.deleteRole(testRoleId);
      await db.deletePermission(testPermissionId);
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('User with permissions', () => {
    it('should load permissions when user is authenticated', async () => {
      const user = await db.getUserWithPermissions(testUserId);
      expect(user).toBeDefined();
      expect(user?.permissions).toBeDefined();
      expect(user?.permissions?.length).toBeGreaterThan(0);
      expect(user?.permissions?.[0].code).toBe('test_permission');
    });

    it('should allow access to manage_workers API with permission', async () => {
      // First, add manage_workers permission to test role
      const manageWorkersPermission = await db.getAllPermissions();
      const manageWorkersPerm = manageWorkersPermission.find(p => p.code === 'manage_workers');
      
      if (manageWorkersPerm) {
        await db.updateRolePermissions(testRoleId, [testPermissionId, manageWorkersPerm.id]);
        
        const user = await db.getUserWithPermissions(testUserId);
        const ctx: TrpcContext = {
          req: {} as any,
          res: {} as any,
          user: user!,
        };

        const caller = appRouter.createCaller(ctx);

        // Should succeed
        const result = await caller.workers.create({
          code: 'TEST001',
          fullName: 'Test Worker',
          status: 'active',
        });

        expect(result.success).toBe(true);
        expect(result.id).toBeDefined();

        // Cleanup
        await db.deleteWorker(result.id);
      }
    });
  });

  describe('User without permissions', () => {
    it('should not have any permissions', async () => {
      const user = await db.getUserWithPermissions(userWithoutPermissions);
      expect(user).toBeDefined();
      expect(user?.permissions).toBeDefined();
      expect(user?.permissions?.length).toBe(0);
    });

    it('should deny access to manage_workers API without permission', async () => {
      const user = await db.getUserWithPermissions(userWithoutPermissions);
      const ctx: TrpcContext = {
        req: {} as any,
        res: {} as any,
        user: user!,
      };

      const caller = appRouter.createCaller(ctx);

      // Should throw FORBIDDEN error
      await expect(
        caller.workers.create({
          code: 'TEST002',
          fullName: 'Test Worker 2',
          status: 'active',
        })
      ).rejects.toThrow();
    });

    it('should deny access to manage_groups API without permission', async () => {
      const user = await db.getUserWithPermissions(userWithoutPermissions);
      const ctx: TrpcContext = {
        req: {} as any,
        res: {} as any,
        user: user!,
      };

      const caller = appRouter.createCaller(ctx);

      // Should throw FORBIDDEN error
      await expect(
        caller.groups.create({
          code: 'TESTGRP',
          name: 'Test Group',
          isActive: true,
        })
      ).rejects.toThrow();
    });

    it('should deny access to manage_users API without permission', async () => {
      const user = await db.getUserWithPermissions(userWithoutPermissions);
      const ctx: TrpcContext = {
        req: {} as any,
        res: {} as any,
        user: user!,
      };

      const caller = appRouter.createCaller(ctx);

      // Should throw FORBIDDEN error
      await expect(
        caller.users.create({
          username: 'testuser3',
          password: 'testpass',
          fullName: 'Test User 3',
          isActive: true,
        })
      ).rejects.toThrow();
    });

    it('should deny access to manage_roles API without permission', async () => {
      const user = await db.getUserWithPermissions(userWithoutPermissions);
      const ctx: TrpcContext = {
        req: {} as any,
        res: {} as any,
        user: user!,
      };

      const caller = appRouter.createCaller(ctx);

      // Should throw FORBIDDEN error
      await expect(
        caller.roles.create({
          code: 'TESTROLE',
          name: 'Test Role',
        })
      ).rejects.toThrow();
    });

    it('should deny access to manage_payroll_batches API without permission', async () => {
      const user = await db.getUserWithPermissions(userWithoutPermissions);
      const ctx: TrpcContext = {
        req: {} as any,
        res: {} as any,
        user: user!,
      };

      const caller = appRouter.createCaller(ctx);

      // Should throw FORBIDDEN error
      await expect(
        caller.payroll.createBatch({
          periodStart: '2024-01-01',
          periodEnd: '2024-01-31',
        })
      ).rejects.toThrow();
    });
  });

  describe('Permission checks', () => {
    it('should correctly identify user with permission', async () => {
      const user = await db.getUserWithPermissions(testUserId);
      expect(user?.permissions?.some(p => p.code === 'test_permission')).toBe(true);
    });

    it('should correctly identify user without permission', async () => {
      const user = await db.getUserWithPermissions(userWithoutPermissions);
      expect(user?.permissions?.some(p => p.code === 'test_permission')).toBe(false);
    });
  });
});
