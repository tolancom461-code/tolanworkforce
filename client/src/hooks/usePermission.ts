import { useAuth } from '../_core/hooks/useAuth';

/**
 * Hook to check user permissions
 * NOTE: Permission system has been removed. All users have full access.
 */
export function usePermission() {
  const { user } = useAuth();
  
  /**
   * All users have all permissions
   */
  const hasPermission = (): boolean => {
    return true;
  };
  
  /**
   * All users have any permission
   */
  const hasAnyPermission = (): boolean => {
    return true;
  };
  
  /**
   * All users have all permissions
   */
  const hasAllPermissions = (): boolean => {
    return true;
  };
  
  /**
   * All users can access any page
   */
  const canAccess = (): boolean => {
    return true;
  };
  
  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccess,
    user,
  };
}
