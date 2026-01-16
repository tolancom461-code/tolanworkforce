import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';

type AuthenticatedUser = NonNullable<TrpcContext['user']>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: 'test-user',
    email: 'test@example.com',
    name: 'Test User',
    loginMethod: 'manus',
    role: 'user',
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

describe('Role Management APIs', () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    const ctx = createAuthContext();
    caller = appRouter.createCaller(ctx);
  });

  describe('roles.list', () => {
    it('should list all roles', async () => {
      const roles = await caller.roles.list();
      expect(Array.isArray(roles)).toBe(true);
      expect(roles.length).toBeGreaterThan(0);
      
      // Check that roles have required fields
      roles.forEach((role: any) => {
        expect(role).toHaveProperty('id');
        expect(role).toHaveProperty('code');
        expect(role).toHaveProperty('name');
      });
    });
  });

  describe('permissions.list', () => {
    it('should list all permissions', async () => {
      const permissions = await caller.permissions.list();
      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions.length).toBeGreaterThan(0);
      
      // Check that permissions have required fields
      permissions.forEach((perm: any) => {
        expect(perm).toHaveProperty('id');
        expect(perm).toHaveProperty('code');
        expect(perm).toHaveProperty('name');
      });
    });
  });

  describe('roles.getRolePermissions', () => {
    it('should get permissions for an existing role', async () => {
      // Get the first role
      const roles = await caller.roles.list();
      expect(roles.length).toBeGreaterThan(0);
      
      const firstRole = roles[0];
      const permissions = await caller.roles.getRolePermissions({
        roleId: firstRole.id,
      });

      expect(Array.isArray(permissions)).toBe(true);
      // Permissions may be empty or populated
    });
  });

  describe('roles.setRolePermissions', () => {
    it('should set permissions for an existing role', async () => {
      // Get the first role and first 3 permissions
      const roles = await caller.roles.list();
      const allPermissions = await caller.permissions.list();
      
      expect(roles.length).toBeGreaterThan(0);
      expect(allPermissions.length).toBeGreaterThan(2);
      
      const testRole = roles[0];
      const permissionIds = allPermissions.slice(0, 3).map((p: any) => p.id);

      // Set permissions
      await caller.roles.setRolePermissions({
        roleId: testRole.id,
        permissionIds,
      });

      // Verify permissions were set
      const rolePermissions = await caller.roles.getRolePermissions({
        roleId: testRole.id,
      });

      expect(rolePermissions.length).toBeGreaterThanOrEqual(3);
      
      // Check that the first 3 permissions are included
      const rolePermIds = rolePermissions.map((p: any) => p.id);
      permissionIds.forEach((id: number) => {
        expect(rolePermIds).toContain(id);
      });
    });

    it('should clear permissions when empty array is provided', async () => {
      const roles = await caller.roles.list();
      expect(roles.length).toBeGreaterThan(0);
      
      const testRole = roles[0];

      // Clear permissions
      await caller.roles.setRolePermissions({
        roleId: testRole.id,
        permissionIds: [],
      });

      // Verify permissions were cleared
      const rolePermissions = await caller.roles.getRolePermissions({
        roleId: testRole.id,
      });

      expect(rolePermissions.length).toBe(0);
    });
  });

  describe('Error handling', () => {
    it('should handle update of non-existent role gracefully', async () => {
      const result = await caller.roles.update({
        id: 999999,
        code: 'NONEXISTENT',
        name: 'Non-existent',
        description: 'Should not fail',
        level: 1,
      });
      expect(result).toEqual({ success: true });
    });

    it('should handle deletion of non-existent role gracefully', async () => {
      const result = await caller.roles.delete({ id: 999999 });
      expect(result).toEqual({ success: true });
    });
  });
});
