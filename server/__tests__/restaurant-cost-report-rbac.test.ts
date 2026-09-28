import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";
import * as db from "../db";
import { restaurantsRouter } from "../routers/restaurants";

function createContext(role: string): TrpcContext {
  return {
    user: {
      id: 900001,
      openId: `test-${role}`,
      username: `test-${role}`,
      passwordHash: null,
      fullName: `Test ${role}`,
      email: null,
      phone: null,
      roleId: null,
      isActive: 1,
      loginMethod: "local",
      role: role as any,
      createdAt: "2026-09-21 00:00:00",
      updatedAt: "2026-09-21 00:00:00",
      lastSignedIn: "2026-09-21 00:00:00",
    } as any,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    requestId: "test-request-id",
  };
}

const reportInput = {
  startDate: "2026-09-19",
  endDate: "2026-09-20",
};

describe("restaurants.costReport RBAC", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(["restaurant_operations", "guard", "auditor", "finance_manager", "data_entry"])(
    "rejects role %s at the backend",
    async role => {
      const reportSpy = vi.spyOn(db, "getRestaurantCostReport");
      const caller = restaurantsRouter.createCaller(createContext(role));

      await expect(caller.costReport(reportInput)).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(reportSpy).not.toHaveBeenCalled();
    },
  );

  it.each(["admin_affairs", "accountant", "super_admin"])(
    "allows role %s and audits the report view",
    async role => {
      const reportSpy = vi.spyOn(db, "getRestaurantCostReport").mockResolvedValue([] as any);
      const auditSpy = vi.spyOn(db, "logAudit").mockResolvedValue(undefined as any);
      const caller = restaurantsRouter.createCaller(createContext(role));

      await expect(caller.costReport(reportInput)).resolves.toEqual([]);
      expect(reportSpy).toHaveBeenCalledOnce();
      expect(auditSpy).toHaveBeenCalledWith(expect.objectContaining({
        action: "VIEW_OPERATIONAL_COST_REPORT",
        tableName: "operations_cost_report",
        userId: 900001,
        newValues: expect.objectContaining(reportInput),
      }));
    },
  );

  it("audits operational site creation", async () => {
    vi.spyOn(db, "createRestaurant").mockResolvedValue({ id: 60099, name: "Test Site" } as any);
    const auditSpy = vi.spyOn(db, "logAudit").mockResolvedValue(undefined as any);
    const caller = restaurantsRouter.createCaller(createContext("admin_affairs"));

    await caller.create({
      name: "Test Site",
      costCenterId: 180001,
      siteType: "site",
    });

    expect(auditSpy).toHaveBeenCalledWith(expect.objectContaining({
      action: "CREATE_OPERATIONAL_SITE",
      tableName: "restaurants",
      recordId: 60099,
      userId: 900001,
    }));
  });

  it("audits operational department creation", async () => {
    vi.spyOn(db, "createOperationalDepartment").mockResolvedValue({ id: 70001, name: "Test Department" } as any);
    const auditSpy = vi.spyOn(db, "logAudit").mockResolvedValue(undefined as any);
    const caller = restaurantsRouter.createCaller(createContext("super_admin"));

    await caller.createDepartment({ name: "Test Department" });

    expect(auditSpy).toHaveBeenCalledWith(expect.objectContaining({
      action: "CREATE_OPERATIONAL_DEPARTMENT",
      tableName: "operational_departments",
      recordId: 70001,
      userId: 900001,
    }));
  });
});
