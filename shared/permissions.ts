/**
 * Permission definitions for role-based access control
 */

export const PERMISSIONS = {
  // Attendance permissions
  ATTENDANCE_RECORD: 'attendance_record',
  ATTENDANCE_VIEW: 'attendance_view',
  ATTENDANCE_MANAGE: 'attendance_manage',
  
  // Worker permissions
  WORKER_VIEW: 'worker_view',
  WORKER_CREATE: 'worker_create',
  WORKER_EDIT: 'worker_edit',
  WORKER_DELETE: 'worker_delete',
  
  // Payroll permissions
  PAYROLL_VIEW: 'payroll_view',
  PAYROLL_CREATE: 'payroll_create',
  PAYROLL_ACCOUNTANT_REVIEW: 'payroll_batch_accountant_review',
  PAYROLL_FINANCIAL_REVIEW: 'payroll_batch_financial_review',
  PAYROLL_MANAGER_REVIEW: 'payroll_batch_manager_review',
  PAYROLL_EXPORT: 'payroll_export',
  
  // User management permissions
  USER_VIEW: 'user_view',
  USER_MANAGE: 'user_manage',
  
  // Reports permissions
  REPORTS_VIEW: 'reports_view',
  REPORTS_EXPORT: 'reports_export',
  
  // Operational flags permissions
  OPERATIONAL_FLAGS_VIEW: 'operational_flags_view',
  OPERATIONAL_FLAGS_MANAGE: 'operational_flags_manage',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

/**
 * Role-based permission mappings
 */
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  // Security Guard: Only attendance recording
  security_guard: [
    PERMISSIONS.ATTENDANCE_RECORD,
  ],
  
  // HR Manager: Full worker and attendance management
  hr_manager: [
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.ATTENDANCE_MANAGE,
    PERMISSIONS.WORKER_VIEW,
    PERMISSIONS.WORKER_CREATE,
    PERMISSIONS.WORKER_EDIT,
    PERMISSIONS.WORKER_DELETE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.OPERATIONAL_FLAGS_VIEW,
    PERMISSIONS.OPERATIONAL_FLAGS_MANAGE,
  ],
  
  // Accountant: Payroll creation and first review
  accountant: [
    PERMISSIONS.WORKER_VIEW,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.PAYROLL_VIEW,
    PERMISSIONS.PAYROLL_CREATE,
    PERMISSIONS.PAYROLL_ACCOUNTANT_REVIEW,
    PERMISSIONS.REPORTS_VIEW,
  ],
  
  // Financial Reviewer: Financial review of payroll
  financial_reviewer: [
    PERMISSIONS.WORKER_VIEW,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.PAYROLL_VIEW,
    PERMISSIONS.PAYROLL_FINANCIAL_REVIEW,
    PERMISSIONS.REPORTS_VIEW,
  ],
  
  // Accounts Manager: Final approval and export
  accounts_manager: [
    PERMISSIONS.WORKER_VIEW,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.PAYROLL_VIEW,
    PERMISSIONS.PAYROLL_MANAGER_REVIEW,
    PERMISSIONS.PAYROLL_EXPORT,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_MANAGE,
  ],
  
  // Admin: All permissions
  admin: Object.values(PERMISSIONS),
};

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: string, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: string): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Page-to-permission mappings
 */
export const PAGE_PERMISSIONS: Record<string, Permission[]> = {
  '/': [], // Home page - accessible to all
  '/attendance': [PERMISSIONS.ATTENDANCE_RECORD], // Attendance scanner
  '/workers': [PERMISSIONS.WORKER_VIEW],
  '/payroll': [PERMISSIONS.PAYROLL_VIEW],
  '/reports': [PERMISSIONS.REPORTS_VIEW],
  '/operational-flags': [PERMISSIONS.OPERATIONAL_FLAGS_VIEW],
  '/users': [PERMISSIONS.USER_VIEW],
};

/**
 * Check if a user has permission to access a page
 */
export function canAccessPage(userPermissions: string[], pagePath: string): boolean {
  const requiredPermissions = PAGE_PERMISSIONS[pagePath];
  
  // If no permissions required, allow access
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true;
  }
  
  // Check if user has at least one of the required permissions
  return requiredPermissions.some(permission => 
    userPermissions.includes(permission)
  );
}
