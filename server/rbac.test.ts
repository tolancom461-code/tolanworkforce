import { describe, expect, it } from "vitest";
import { ROLE_PERMISSIONS, hasPageAccess, canApproveBatchAtStage, cannotSelfReview, getRoleLabel, getAllRoles } from "./permissions";
import type { UserRole } from "../drizzle/schema";
import { userRoleEnum } from "../drizzle/schema";

describe("RBAC - Role Definitions", () => {
  it("should have exactly 8 roles defined", () => {
    expect(userRoleEnum).toHaveLength(8);
    expect(Object.keys(ROLE_PERMISSIONS)).toHaveLength(8);
  });

  it("should have all 8 expected roles", () => {
    const expectedRoles: UserRole[] = [
      "guard", "supervisor", "admin_affairs", "accountant",
      "auditor", "finance_manager", "executive", "super_admin"
    ];
    for (const role of expectedRoles) {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
    }
  });

  it("each role should have Arabic and English labels", () => {
    for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
      expect(perms.label).toBeTruthy();
      expect(perms.labelAr).toBeTruthy();
    }
  });
});

describe("RBAC - Page Access", () => {
  it("guard can only access attendance page", () => {
    expect(hasPageAccess("guard", "attendance")).toBe(true);
    expect(hasPageAccess("guard", "workers")).toBe(false);
    expect(hasPageAccess("guard", "payroll")).toBe(false);
    expect(hasPageAccess("guard", "operations")).toBe(false);
    expect(hasPageAccess("guard", "executiveDashboard")).toBe(false);
  });

  it("supervisor can only access operations page", () => {
    expect(hasPageAccess("supervisor", "operations")).toBe(true);
    expect(hasPageAccess("supervisor", "attendance")).toBe(false);
    expect(hasPageAccess("supervisor", "workers")).toBe(false);
    expect(hasPageAccess("supervisor", "payroll")).toBe(false);
  });

  it("admin_affairs has broad access except executive dashboard", () => {
    expect(hasPageAccess("admin_affairs", "attendance")).toBe(true);
    expect(hasPageAccess("admin_affairs", "workers")).toBe(true);
    expect(hasPageAccess("admin_affairs", "groups")).toBe(true);
    expect(hasPageAccess("admin_affairs", "costCenters")).toBe(true);
    expect(hasPageAccess("admin_affairs", "payroll")).toBe(true);
    expect(hasPageAccess("admin_affairs", "reports")).toBe(true);
    expect(hasPageAccess("admin_affairs", "operations")).toBe(true);
    expect(hasPageAccess("admin_affairs", "operationsReview")).toBe(true);
    expect(hasPageAccess("admin_affairs", "executiveDashboard")).toBe(false);
  });

  it("executive can only access executive dashboard", () => {
    expect(hasPageAccess("executive", "executiveDashboard")).toBe(true);
    expect(hasPageAccess("executive", "attendance")).toBe(false);
    expect(hasPageAccess("executive", "payroll")).toBe(false);
    expect(hasPageAccess("executive", "workers")).toBe(false);
  });

  it("super_admin has access to all pages", () => {
    expect(hasPageAccess("super_admin", "attendance")).toBe(true);
    expect(hasPageAccess("super_admin", "workers")).toBe(true);
    expect(hasPageAccess("super_admin", "payroll")).toBe(true);
    expect(hasPageAccess("super_admin", "operations")).toBe(true);
    expect(hasPageAccess("super_admin", "executiveDashboard")).toBe(true);
    expect(hasPageAccess("super_admin", "anyRandomPage")).toBe(true);
  });

  it("auditor can access payroll, reports, and attendance only", () => {
    expect(hasPageAccess("auditor", "payroll")).toBe(true);
    expect(hasPageAccess("auditor", "reports")).toBe(true);
    expect(hasPageAccess("auditor", "attendance")).toBe(true);
    expect(hasPageAccess("auditor", "workers")).toBe(false);
    expect(hasPageAccess("auditor", "operations")).toBe(false);
  });

  it("finance_manager can access payroll, reports, and attendance only", () => {
    expect(hasPageAccess("finance_manager", "payroll")).toBe(true);
    expect(hasPageAccess("finance_manager", "reports")).toBe(true);
    expect(hasPageAccess("finance_manager", "attendance")).toBe(true);
    expect(hasPageAccess("finance_manager", "workers")).toBe(false);
    expect(hasPageAccess("finance_manager", "operations")).toBe(false);
  });
});

describe("RBAC - Batch Approval Workflow", () => {
  it("admin_affairs can submit draft batches", () => {
    const result = canApproveBatchAtStage("admin_affairs", "draft");
    expect(result.allowed).toBe(true);
  });

  it("accountant can submit draft batches", () => {
    const result = canApproveBatchAtStage("accountant", "draft");
    expect(result.allowed).toBe(true);
  });

  it("guard cannot submit draft batches", () => {
    const result = canApproveBatchAtStage("guard", "draft");
    expect(result.allowed).toBe(false);
  });

  it("accountant can review at accountant stage", () => {
    const result = canApproveBatchAtStage("accountant", "under_accountant_review");
    expect(result.allowed).toBe(true);
  });

  it("auditor cannot review at accountant stage", () => {
    const result = canApproveBatchAtStage("auditor", "under_accountant_review");
    expect(result.allowed).toBe(false);
  });

  it("auditor can review at financial review stage", () => {
    const result = canApproveBatchAtStage("auditor", "under_financial_review");
    expect(result.allowed).toBe(true);
  });

  it("accountant cannot review at financial review stage", () => {
    const result = canApproveBatchAtStage("accountant", "under_financial_review");
    expect(result.allowed).toBe(false);
  });

  it("finance_manager can approve at final stage", () => {
    const result = canApproveBatchAtStage("finance_manager", "under_accounts_manager_review");
    expect(result.allowed).toBe(true);
  });

  it("auditor cannot approve at final stage", () => {
    const result = canApproveBatchAtStage("auditor", "under_accounts_manager_review");
    expect(result.allowed).toBe(false);
  });

  it("admin_affairs can edit returned batches", () => {
    expect(canApproveBatchAtStage("admin_affairs", "returned_from_accountant").allowed).toBe(true);
    expect(canApproveBatchAtStage("admin_affairs", "returned_from_financial_review").allowed).toBe(true);
  });

  it("super_admin can do everything at any stage", () => {
    expect(canApproveBatchAtStage("super_admin", "draft").allowed).toBe(true);
    expect(canApproveBatchAtStage("super_admin", "under_accountant_review").allowed).toBe(true);
    expect(canApproveBatchAtStage("super_admin", "under_financial_review").allowed).toBe(true);
    expect(canApproveBatchAtStage("super_admin", "under_accounts_manager_review").allowed).toBe(true);
    expect(canApproveBatchAtStage("super_admin", "returned_from_accountant").allowed).toBe(true);
  });

  it("executive cannot approve at any stage", () => {
    expect(canApproveBatchAtStage("executive", "draft").allowed).toBe(false);
    expect(canApproveBatchAtStage("executive", "under_accountant_review").allowed).toBe(false);
    expect(canApproveBatchAtStage("executive", "under_financial_review").allowed).toBe(false);
    expect(canApproveBatchAtStage("executive", "under_accounts_manager_review").allowed).toBe(false);
  });
});

describe("RBAC - Self Review Prevention", () => {
  it("accountant cannot review their own batch", () => {
    expect(cannotSelfReview(100, 100, "accountant")).toBe(true);
  });

  it("accountant can review someone else's batch", () => {
    expect(cannotSelfReview(100, 200, "accountant")).toBe(false);
  });

  it("super_admin bypasses self-review check", () => {
    expect(cannotSelfReview(100, 100, "super_admin")).toBe(false);
  });

  it("auditor is not subject to self-review restriction", () => {
    expect(cannotSelfReview(100, 100, "auditor")).toBe(false);
  });
});

describe("RBAC - Role Capabilities", () => {
  it("only admin_affairs and accountant can create batches", () => {
    const batchCreators = Object.entries(ROLE_PERMISSIONS)
      .filter(([role, perms]) => perms.canCreateBatch && role !== "super_admin")
      .map(([role]) => role);
    expect(batchCreators.sort()).toEqual(["accountant", "admin_affairs"]);
  });

  it("only supervisor is restricted by cost center", () => {
    const restricted = Object.entries(ROLE_PERMISSIONS)
      .filter(([_, perms]) => perms.restrictedByCostCenter)
      .map(([role]) => role);
    expect(restricted).toEqual(["supervisor"]);
  });

  it("only super_admin can manage users", () => {
    const userManagers = Object.entries(ROLE_PERMISSIONS)
      .filter(([_, perms]) => perms.canManageUsers)
      .map(([role]) => role);
    expect(userManagers).toEqual(["super_admin"]);
  });

  it("executive can view executive dashboard", () => {
    expect(ROLE_PERMISSIONS.executive.canViewExecutiveDashboard).toBe(true);
  });

  it("guard has no management capabilities", () => {
    const guard = ROLE_PERMISSIONS.guard;
    expect(guard.canCreateBatch).toBe(false);
    expect(guard.canManageWorkers).toBe(false);
    expect(guard.canManageGroups).toBe(false);
    expect(guard.canManageCostCenters).toBe(false);
    expect(guard.canManageUsers).toBe(false);
    expect(guard.canViewFinancialReports).toBe(false);
    expect(guard.canViewAttendanceReports).toBe(false);
    expect(guard.canViewExecutiveDashboard).toBe(false);
    expect(guard.canAccessOperations).toBe(false);
  });
});

describe("RBAC - Helper Functions", () => {
  it("getRoleLabel returns Arabic label by default", () => {
    expect(getRoleLabel("guard")).toBe("حارس");
    expect(getRoleLabel("supervisor")).toBe("مشرف");
    expect(getRoleLabel("super_admin")).toBe("سوبر أدمن");
  });

  it("getRoleLabel returns English label when specified", () => {
    expect(getRoleLabel("guard", "en")).toBe("Guard");
    expect(getRoleLabel("executive", "en")).toBe("Executive");
  });

  it("getAllRoles returns all 8 roles", () => {
    const roles = getAllRoles();
    expect(roles).toHaveLength(8);
    expect(roles.every(r => r.value && r.label && r.labelAr)).toBe(true);
  });
});
