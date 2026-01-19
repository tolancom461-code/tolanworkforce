import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useMemo } from "react";

/**
 * Custom hook for checking scoped permissions
 * 
 * @example
 * const { checkPermission, hasAnyPermission, getUserScopeIds } = useScopedPermissions();
 * 
 * // Check if user can update group 5
 * const canEdit = checkPermission('update', 'work_group', '5');
 * 
 * // Check if user can view OR update group 5
 * const canViewOrEdit = hasAnyPermission(['view', 'update'], 'work_group', '5');
 * 
 * // Get all group IDs user can view
 * const viewableGroupIds = getUserScopeIds('work_group', 'view');
 */
export function useScopedPermissions() {
  const { user, isAuthenticated } = useAuth();

  // Fetch all user permissions once
  const { data: userPermissions, isLoading } = trpc.scopedPermissions.getUserPermissions.useQuery(
    { userId: user?.id! },
    { enabled: isAuthenticated && !!user?.id }
  );

  /**
   * Check if user has a specific permission on a specific scope
   */
  const checkPermission = (
    permission: string,
    scopeType: string,
    scopeId: string | number
  ): boolean => {
    if (!userPermissions) return false;
    
    return userPermissions.some(
      (p) =>
        p.permission === permission &&
        p.scopeType === scopeType &&
        p.scopeId === String(scopeId)
    );
  };

  /**
   * Check if user has ANY of the specified permissions on a specific scope
   */
  const hasAnyPermission = (
    permissions: string[],
    scopeType: string,
    scopeId: string | number
  ): boolean => {
    if (!userPermissions) return false;

    return permissions.some((permission) =>
      checkPermission(permission, scopeType, scopeId)
    );
  };

  /**
   * Check if user has ALL of the specified permissions on a specific scope
   */
  const hasAllPermissions = (
    permissions: string[],
    scopeType: string,
    scopeId: string | number
  ): boolean => {
    if (!userPermissions) return false;

    return permissions.every((permission) =>
      checkPermission(permission, scopeType, scopeId)
    );
  };

  /**
   * Get all scope IDs where user has a specific permission
   */
  const getUserScopeIds = (
    scopeType: string,
    permission: string
  ): string[] => {
    if (!userPermissions) return [];

    return userPermissions
      .filter((p) => p.scopeType === scopeType && p.permission === permission)
      .map((p) => p.scopeId);
  };

  /**
   * Get all unique scope IDs where user has ANY permission
   */
  const getAllUserScopeIds = (scopeType: string): string[] => {
    if (!userPermissions) return [];

    const scopeIds = new Set(
      userPermissions
        .filter((p) => p.scopeType === scopeType)
        .map((p) => p.scopeId)
    );

    return Array.from(scopeIds);
  };

  /**
   * Get all permissions for a specific scope
   */
  const getScopePermissions = (
    scopeType: string,
    scopeId: string | number
  ): string[] => {
    if (!userPermissions) return [];

    return userPermissions
      .filter((p) => p.scopeType === scopeType && p.scopeId === String(scopeId))
      .map((p) => p.permission);
  };

  /**
   * Check if user is admin (has full access)
   */
  const isAdmin = (): boolean => {
    return user?.role === 'admin';
  };

  return {
    permissions: userPermissions,
    isLoading,
    checkPermission,
    hasAnyPermission,
    hasAllPermissions,
    getUserScopeIds,
    getAllUserScopeIds,
    getScopePermissions,
    isAdmin,
  };
}
