// تعريف صلاحيات القوائم
// كل قائمة مرتبطة بصلاحية واحدة أو أكثر

export const MENU_PERMISSIONS = {
  // لوحات التحكم
  DASHBOARD: 'view_dashboard',
  EXECUTIVE_DASHBOARD: 'view_executive_dashboard',
  
  // إدارة الموارد البشرية
  WORKERS_VIEW: 'view_workers',
  WORKERS_CREATE: 'create_worker',
  WORKERS_EDIT: 'edit_worker',
  WORKERS_DELETE: 'delete_worker',
  WORKERS_VIEW_DETAILS: 'view_worker_details',
  WORKERS_EXPORT: 'export_workers',
  
  GROUPS_VIEW: 'view_groups',
  GROUPS_CREATE: 'create_group',
  GROUPS_EDIT: 'edit_group',
  GROUPS_DELETE: 'delete_group',
  GROUPS_EXPORT: 'export_groups',
  
  COST_CENTERS_VIEW: 'view_cost_centers',
  COST_CENTERS_CREATE: 'create_cost_center',
  COST_CENTERS_EDIT: 'edit_cost_center',
  COST_CENTERS_DELETE: 'delete_cost_center',
  COST_CENTERS_EXPORT: 'export_cost_centers',
  
  // نظام الحضور والانصراف
  ATTENDANCE_SCAN: 'scan_attendance',
  ATTENDANCE_LOG: 'view_attendance_log',
  ATTENDANCE_ADJUST: 'adjust_attendance',
  ATTENDANCE_DELETE: 'delete_attendance',
  ATTENDANCE_DAILY_MANAGEMENT: 'manage_daily_attendance',
  ATTENDANCE_REPORTS: 'view_attendance_reports',
  ATTENDANCE_EXPORT: 'export_attendance_reports',
  WORK_DAYS: 'manage_work_days',
  WORKER_CARD_VIEW: 'view_worker_card',
  WORKER_CARD_PRINT: 'print_worker_card',
  ATTENDANCE_LOG_EXPORT: 'export_attendance_log',
  ATTENDANCE_ADJUSTMENT_APPROVE: 'approve_attendance_adjustment',
  ATTENDANCE_ADJUSTMENT_REJECT: 'reject_attendance_adjustment',
  
  // البلاغات التشغيلية
  OPERATIONAL_FLAGS_CREATE: 'create_operational_flags',
  OPERATIONAL_FLAGS_MANAGE: 'manage_pending_flags',
  OPERATIONAL_FLAGS_VIEW_ALL: 'view_all_flags',
  OPERATIONAL_FLAGS_DELETE: 'delete_flag',
  OPERATIONAL_FLAGS_VIEW_DETAILS: 'view_flag_details',
  OPERATIONAL_FLAGS_EXPORT: 'export_flags',
  
  // النظام المالي
  FINANCE_ENTRIES_VIEW: 'view_finance_entries',
  FINANCE_DEDUCTION_CREATE: 'create_deduction',
  FINANCE_BONUS_CREATE: 'create_bonus',
  FINANCE_ENTRY_EDIT: 'edit_finance_entry',
  FINANCE_ENTRY_DELETE: 'delete_finance_entry',
  FINANCE_ENTRY_APPROVE: 'approve_finance_entry',
  FINANCE_OVERRIDE_DAILY: 'override_daily_finance',
  
  PAYROLL_BATCHES_VIEW: 'view_payroll_batches',
  PAYROLL_BATCH_CREATE: 'create_payroll_batch',
  PAYROLL_BATCH_EDIT: 'edit_payroll_batch',
  PAYROLL_BATCH_DELETE: 'delete_payroll_batch',
  PAYROLL_BATCH_APPROVE: 'approve_payroll_batch',
  PAYROLL_BATCH_VIEW_DETAILS: 'view_payroll_batch_details',
  PAYROLL_BATCH_CANCEL: 'cancel_payroll_batch',
  PAYROLL_BATCH_REJECT: 'reject_payroll_batch',
  PAYROLL_BATCH_EXPORT: 'export_payroll_batch',
  FINANCE_ENTRY_HISTORY: 'view_finance_entry_history',
  
  FINANCE_REPORTS_VIEW: 'view_finance_reports',
  FINANCE_REPORTS_EXPORT: 'export_finance_reports',
  PAYROLL_HISTORY: 'view_payroll_history',
  
  // إدارة النظام
  USERS_VIEW: 'view_users',
  USERS_CREATE: 'create_user',
  USERS_EDIT: 'edit_user',
  USERS_DELETE: 'delete_user',
  ROLES: 'manage_roles',
  PERMISSIONS: 'manage_permissions',
  USER_ACTIVITY_LOG: 'view_user_activity_log',
  AUDIT_LOG_EXPORT: 'export_audit_log',
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
      'create_worker',
      'edit_worker',
      'delete_worker',
      'view_worker_details',
      'export_workers',
      'view_groups',
      'create_group',
      'edit_group',
      'delete_group',
      'export_groups',
      'view_cost_centers',
      'create_cost_center',
      'edit_cost_center',
      'delete_cost_center',
      'export_cost_centers',
    ],
  },
  attendance: {
    label: 'نظام الحضور',
    permissions: [
      'scan_attendance',
      'view_attendance_log',
      'adjust_attendance',
      'delete_attendance',
      'manage_daily_attendance',
      'view_attendance_reports',
      'export_attendance_reports',
      'manage_work_days',
      'view_worker_card',
      'print_worker_card',
      'export_attendance_log',
      'approve_attendance_adjustment',
      'reject_attendance_adjustment',
    ],
  },
  operational_flags: {
    label: 'البلاغات التشغيلية',
    permissions: [
      'create_operational_flags',
      'manage_pending_flags',
      'view_all_flags',
      'delete_flag',
      'view_flag_details',
      'export_flags',
    ],
  },
  financial: {
    label: 'النظام المالي',
    permissions: [
      'view_finance_entries',
      'create_deduction',
      'create_bonus',
      'edit_finance_entry',
      'delete_finance_entry',
      'approve_finance_entry',
      'override_daily_finance',
      'view_payroll_batches',
      'create_payroll_batch',
      'edit_payroll_batch',
      'delete_payroll_batch',
      'approve_payroll_batch',
      'view_payroll_batch_details',
      'cancel_payroll_batch',
      'reject_payroll_batch',
      'export_payroll_batch',
      'view_finance_entry_history',
      'view_finance_reports',
      'export_finance_reports',
      'view_payroll_history',
    ],
  },
  system: {
    label: 'إدارة النظام',
    permissions: [
      'view_users',
      'create_user',
      'edit_user',
      'delete_user',
      'manage_roles',
      'manage_permissions',
      'view_user_activity_log',
      'export_audit_log',
    ],
  },
};
