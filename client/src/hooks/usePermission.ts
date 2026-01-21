import { useAuth } from '../_core/hooks/useAuth';
import { Permission, canAccessPage, roleHasPermission, getRolePermissions } from '../../../shared/permissions';

/**
 * Hook to check user permissions
 */
export function usePermission() {
  const { user } = useAuth();
  
  /**
   * Check if current user is the owner (has absolute permissions)
   */
  const isOwner = (): boolean => {
    if (!user) return false;
    // Check isOwner flag set by backend
    return (user as any).isOwner === true;
  };
  
  /**
   * Check if current user has a specific permission
   */
  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    
    // Owner has all permissions automatically
    if (isOwner()) return true;
    
    // Admin has all permissions
    if (user.role === 'admin') return true;
    
    // Check role-based permissions
    return roleHasPermission(user.role, permission);
  };
  
  /**
   * Check if current user has any of the given permissions
   */
  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };
  
  /**
   * Check if current user has all of the given permissions
   */
  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  };
  
  /**
   * Check if current user can access a specific page
   */
  const canAccess = (pagePath: string): boolean => {
    if (!user) return false;
    
    // Owner can access everything
    if (isOwner()) return true;
    
    // Admin can access everything
    if (user.role === 'admin') return true;
    
    // Get role-based permissions from ROLE_PERMISSIONS mapping
    const rolePermissions = getRolePermissions(user.role);
    return canAccessPage(rolePermissions, pagePath);
  };
  
  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccess,
    isOwner,
    user,
  };
}
