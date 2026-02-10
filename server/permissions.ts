/**
 * Role-Based Access Control (RBAC) System
 * 9 roles with specific page/feature access
 */

import type { UserRole } from "../drizzle/schema";

// Define which pages/features each role can access
export const ROLE_PERMISSIONS: Record<UserRole, {
  label: string;
  labelAr: string;
  pages: string[];
  canCreateBatch: boolean;
  canReviewAsAccountant: boolean;
  canReviewAsAuditor: boolean;
  canApproveAsFM: boolean;
  canManageWorkers: boolean;
  canManageGroups: boolean;
  canManageCostCenters: boolean;
  canManageUsers: boolean;
  canViewFinancialReports: boolean;
  canViewAttendanceReports: boolean;
  canViewExecutiveDashboard: boolean;
  canAccessOperations: boolean;
  restrictedByCostCenter: boolean;
}> = {
  guard: {
    label: "Guard",
    labelAr: "حارس",
    pages: ["attendance"],
    canCreateBatch: false,
    canReviewAsAccountant: false,
    canReviewAsAuditor: false,
    canApproveAsFM: false,
    canManageWorkers: false,
    canManageGroups: false,
    canManageCostCenters: false,
    canManageUsers: false,
    canViewFinancialReports: false,
    canViewAttendanceReports: false,
    canViewExecutiveDashboard: false,
    canAccessOperations: false,
    restrictedByCostCenter: false,
  },
  supervisor_tolan: {
    label: "Supervisor Tolan",
    labelAr: "مشرف تولان",
    pages: ["operations"],
    canCreateBatch: false,
    canReviewAsAccountant: false,
    canReviewAsAuditor: false,
    canApproveAsFM: false,
    canManageWorkers: false,
    canManageGroups: false,
    canManageCostCenters: false,
    canManageUsers: false,
    canViewFinancialReports: false,
    canViewAttendanceReports: false,
    canViewExecutiveDashboard: false,
    canAccessOperations: true,
    restrictedByCostCenter: true,
  },
  supervisor_malqa: {
    label: "Supervisor Malqa",
    labelAr: "مشرف الملقا",
    pages: ["operations"],
    canCreateBatch: false,
    canReviewAsAccountant: false,
    canReviewAsAuditor: false,
    canApproveAsFM: false,
    canManageWorkers: false,
    canManageGroups: false,
    canManageCostCenters: false,
    canManageUsers: false,
    canViewFinancialReports: false,
    canViewAttendanceReports: false,
    canViewExecutiveDashboard: false,
    canAccessOperations: true,
    restrictedByCostCenter: true,
  },
  admin_affairs: {
    label: "Admin Affairs",
    labelAr: "شؤون إدارية",
    pages: ["attendance", "workers", "groups", "costCenters", "payroll", "reports", "settings", "operations", "operationsReview"],
    canCreateBatch: true,
    canReviewAsAccountant: false,
    canReviewAsAuditor: false,
    canApproveAsFM: false,
    canManageWorkers: true,
    canManageGroups: true,
    canManageCostCenters: true,
    canManageUsers: false,
    canViewFinancialReports: true,
    canViewAttendanceReports: true,
    canViewExecutiveDashboard: false,
    canAccessOperations: true,
    restrictedByCostCenter: false,
  },
  accountant: {
    label: "Accountant",
    labelAr: "محاسب مالي",
    pages: ["attendance", "workers", "groups", "costCenters", "payroll", "reports", "settings", "operations", "operationsReview"],
    canCreateBatch: true,
    canReviewAsAccountant: true,
    canReviewAsAuditor: false,
    canApproveAsFM: false,
    canManageWorkers: true,
    canManageGroups: true,
    canManageCostCenters: true,
    canManageUsers: false,
    canViewFinancialReports: true,
    canViewAttendanceReports: true,
    canViewExecutiveDashboard: false,
    canAccessOperations: true,
    restrictedByCostCenter: false,
  },
  auditor: {
    label: "Auditor",
    labelAr: "مراجع مالي",
    pages: ["payroll", "reports", "attendance"],
    canCreateBatch: false,
    canReviewAsAccountant: false,
    canReviewAsAuditor: true,
    canApproveAsFM: false,
    canManageWorkers: false,
    canManageGroups: false,
    canManageCostCenters: false,
    canManageUsers: false,
    canViewFinancialReports: true,
    canViewAttendanceReports: true,
    canViewExecutiveDashboard: false,
    canAccessOperations: false,
    restrictedByCostCenter: false,
  },
  finance_manager: {
    label: "Finance Manager",
    labelAr: "مدير مالي",
    pages: ["payroll", "reports", "attendance"],
    canCreateBatch: false,
    canReviewAsAccountant: false,
    canReviewAsAuditor: false,
    canApproveAsFM: true,
    canManageWorkers: false,
    canManageGroups: false,
    canManageCostCenters: false,
    canManageUsers: false,
    canViewFinancialReports: true,
    canViewAttendanceReports: true,
    canViewExecutiveDashboard: false,
    canAccessOperations: false,
    restrictedByCostCenter: false,
  },
  executive: {
    label: "Executive",
    labelAr: "إدارة عليا",
    pages: ["executiveDashboard"],
    canCreateBatch: false,
    canReviewAsAccountant: false,
    canReviewAsAuditor: false,
    canApproveAsFM: false,
    canManageWorkers: false,
    canManageGroups: false,
    canManageCostCenters: false,
    canManageUsers: false,
    canViewFinancialReports: false,
    canViewAttendanceReports: false,
    canViewExecutiveDashboard: true,
    canAccessOperations: false,
    restrictedByCostCenter: false,
  },
  super_admin: {
    label: "Super Admin",
    labelAr: "سوبر أدمن",
    pages: ["all"],
    canCreateBatch: true,
    canReviewAsAccountant: true,
    canReviewAsAuditor: true,
    canApproveAsFM: true,
    canManageWorkers: true,
    canManageGroups: true,
    canManageCostCenters: true,
    canManageUsers: true,
    canViewFinancialReports: true,
    canViewAttendanceReports: true,
    canViewExecutiveDashboard: true,
    canAccessOperations: true,
    restrictedByCostCenter: false,
  },
};

// Helper to check if a role is a supervisor type
export function isSupervisorRole(role: UserRole): boolean {
  return role === 'supervisor_tolan' || role === 'supervisor_malqa';
}

// Helper functions
export function hasPageAccess(role: UserRole, page: string): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  if (perms.pages.includes("all")) return true;
  return perms.pages.includes(page);
}

export function canPerformAction(role: UserRole, action: keyof typeof ROLE_PERMISSIONS[UserRole]): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  return !!perms[action];
}

export function getRoleLabel(role: UserRole, lang: "ar" | "en" = "ar"): string {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return role;
  return lang === "ar" ? perms.labelAr : perms.label;
}

export function getAllRoles(): { value: UserRole; label: string; labelAr: string }[] {
  return Object.entries(ROLE_PERMISSIONS).map(([value, perms]) => ({
    value: value as UserRole,
    label: perms.label,
    labelAr: perms.labelAr,
  }));
}

// Batch approval stage validation
export function canApproveBatchAtStage(role: UserRole, currentStatus: string): { allowed: boolean; reason?: string } {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return { allowed: false, reason: "دور غير معروف" };
  
  // Super admin can do everything
  if (role === "super_admin") return { allowed: true };
  
  switch (currentStatus) {
    case "draft":
      // Only admin_affairs or accountant can submit draft
      if (role === "admin_affairs" || role === "accountant") return { allowed: true };
      return { allowed: false, reason: "فقط الشؤون الإدارية يمكنهم إرسال الدفعة للمراجعة" };
    
    case "under_accountant_review":
      if (perms.canReviewAsAccountant) return { allowed: true };
      return { allowed: false, reason: "فقط المحاسب المالي يمكنه مراجعة الدفعة في هذه المرحلة" };
    
    case "under_financial_review":
      if (perms.canReviewAsAuditor) return { allowed: true };
      return { allowed: false, reason: "فقط المراجع المالي يمكنه مراجعة الدفعة في هذه المرحلة" };
    
    case "under_accounts_manager_review":
      if (perms.canApproveAsFM) return { allowed: true };
      return { allowed: false, reason: "فقط المدير المالي يمكنه الاعتماد النهائي للدفعة" };
    
    case "returned_from_accountant":
    case "returned_from_financial_review":
      // Only admin_affairs can edit and resubmit
      if (role === "admin_affairs" || role === "accountant") return { allowed: true };
      return { allowed: false, reason: "فقط الشؤون الإدارية يمكنهم تعديل وإعادة إرسال الدفعة المرفوضة" };
    
    default:
      return { allowed: false, reason: "حالة الدفعة لا تسمح بهذا الإجراء" };
  }
}

// Check if a user created a batch (to prevent self-review)
export function cannotSelfReview(createdByUserId: number, currentUserId: number, role: UserRole): boolean {
  // Super admin bypasses this check
  if (role === "super_admin") return false;
  // Accountant cannot review a batch they created
  if (role === "accountant" && createdByUserId === currentUserId) return true;
  return false;
}
