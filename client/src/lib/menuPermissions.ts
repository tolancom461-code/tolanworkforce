// تعريف صلاحيات القوائم
// كل قائمة مرتبطة بصلاحية واحدة أو أكثر

export const MENU_PERMISSIONS = {
  // لوحات التحكم
  DASHBOARD: 'view_dashboard',
  EXECUTIVE_DASHBOARD: 'view_executive_dashboard',
  
  // إدارة الموارد البشرية
  WORKERS: 'view_workers',
  GROUPS: 'view_groups',
  COST_CENTERS: 'view_cost_centers',
  
  // نظام الحضور والانصراف
  ATTENDANCE_SCAN: 'scan_attendance',
  ATTENDANCE_LOG: 'view_attendance_log',
  ATTENDANCE_ADJUST: 'adjust_attendance',
  ATTENDANCE_REPORTS: 'view_attendance_reports',
  WORK_DAYS: 'manage_work_days',
  
  // النظام المالي
  FINANCE_ENTRY: 'manage_finance_entries',
  FINANCE_OVERRIDES: 'manage_finance_overrides',
  PAYROLL_BATCHES: 'view_payroll_batches',
  FINANCE_REPORTS: 'view_finance_reports',
  
  // إدارة النظام
  USERS: 'manage_users',
  ROLES: 'manage_roles',
  PERMISSIONS: 'manage_permissions',
} as const;

// نوع TypeScript للصلاحيات
export type MenuPermission = typeof MENU_PERMISSIONS[keyof typeof MENU_PERMISSIONS];

// دالة للتحقق من وجود صلاحية معينة
export function hasPermission(
  userPermissions: string[] | undefined,
  requiredPermission: MenuPermission | MenuPermission[]
): boolean {
  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }
  
  // إذا كانت الصلاحية المطلوبة مصفوفة، تحقق من وجود أي منها
  if (Array.isArray(requiredPermission)) {
    return requiredPermission.some(perm => userPermissions.includes(perm));
  }
  
  return userPermissions.includes(requiredPermission);
}

// دالة للتحقق من صلاحيات متعددة (يجب توفر جميعها)
export function hasAllPermissions(
  userPermissions: string[] | undefined,
  requiredPermissions: MenuPermission[]
): boolean {
  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }
  
  return requiredPermissions.every(perm => userPermissions.includes(perm));
}

// نوع TypeScript لرموز الصلاحيات
export type PermissionCode = typeof MENU_PERMISSIONS[keyof typeof MENU_PERMISSIONS];

// تصنيف الصلاحيات حسب الفئات
export const PERMISSION_CATEGORIES: Record<string, { label: string; permissions: PermissionCode[] }> = {
  dashboards: {
    label: 'لوحات التحكم',
    permissions: [
      'view_dashboard',
      'view_executive_dashboard',
    ],
  },
  hr: {
    label: 'الموارد البشرية',
    permissions: [
      'view_workers',
      'view_groups',
      'view_cost_centers',
    ],
  },
  attendance: {
    label: 'نظام الحضور',
    permissions: [
      'scan_attendance',
      'view_attendance_log',
      'adjust_attendance',
      'view_attendance_reports',
      'manage_work_days',
    ],
  },
  financial: {
    label: 'النظام المالي',
    permissions: [
      'manage_finance_entries',
      'manage_finance_overrides',
      'view_payroll_batches',
      'view_finance_reports',
    ],
  },
  system: {
    label: 'إدارة النظام',
    permissions: [
      'manage_users',
      'manage_roles',
      'manage_permissions',
    ],
  },
};
