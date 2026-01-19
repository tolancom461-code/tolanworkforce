// @ts-nocheck - OLD PERMISSION SYSTEM DISABLED
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export function usePermissions() {
  const { user, isAuthenticated } = useAuth();
  
  const { data: userPermissions, isLoading } = trpc.permissions.getUserPermissions.useQuery(
    { userId: user?.id! },
    { enabled: isAuthenticated && !!user?.id }
  );

  const hasPermission = (permissionCode: string): boolean => {
    if (!userPermissions) return false;
    
    // Check direct permissions
    const hasDirect = userPermissions.direct.some(p => p.code === permissionCode);
    if (hasDirect) return true;
    
    // Check role permissions
    const hasFromRole = userPermissions.fromRoles.some(p => p.code === permissionCode);
    return hasFromRole;
  };

  const hasAnyPermission = (permissionCodes: string[]): boolean => {
    return permissionCodes.some(code => hasPermission(code));
  };

  const hasAllPermissions = (permissionCodes: string[]): boolean => {
    return permissionCodes.every(code => hasPermission(code));
  };

  const isAdmin = (): boolean => {
    return user?.role === 'admin' || hasPermission('admin.full_access');
  };

  const isSuperAdmin = (): boolean => {
    return hasPermission('admin.full_access');
  };

  return {
    permissions: userPermissions,
    isLoading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin,
    isSuperAdmin,
  };
}
