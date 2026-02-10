import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-admin",
    email: "admin@example.com",
    name: "Test Admin",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("payroll batch creation with operational flags check", () => {
  it("should block batch creation when pending operational flags exist", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const today = new Date().toLocaleDateString('en-CA');

    // First, create a pending operational flag
    await caller.operationalDashboard.createFlag({
      workerId: 1,
      flagDate: today,
      flagType: "confirm_attendance",
      description: "تأكيد حضور للاختبار",
    });

    // Verify there are pending flags
    const pendingCount = await caller.operationalDashboard.getPendingCount();
    expect(pendingCount).toBeGreaterThan(0);

    // Try to create a payroll batch - should fail
    await expect(
      caller.payroll.createBatch({
        periodStart: "2026-02-01",
        periodEnd: "2026-02-10",
        costCenterId: 1,
        items: [
          {
            workerId: 1,
            baseAmount: "1000",
            deductions: "0",
            bonuses: "0",
            netAmount: "1000",
          },
        ],
      })
    ).rejects.toThrow("ملاحظة تشغيلية معلقة");
  });

  it("should allow batch creation after all flags are processed", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Get all pending flags and approve them
    const pendingFlags = await caller.operationalDashboard.getFlags({
      status: "pending",
    });

    for (const flag of pendingFlags) {
      await caller.operationalDashboard.approveFlag({
        flagId: flag.id,
        notes: "تمت الموافقة للاختبار",
      });
    }

    // Verify no pending flags
    const pendingCount = await caller.operationalDashboard.getPendingCount();
    expect(pendingCount).toBe(0);
  });

  it("getPendingCount returns 0 when no pending flags exist after processing", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Process all pending flags first
    const pendingFlags = await caller.operationalDashboard.getFlags({
      status: "pending",
    });

    for (const flag of pendingFlags) {
      await caller.operationalDashboard.approveFlag({
        flagId: flag.id,
        notes: "cleanup",
      });
    }

    const count = await caller.operationalDashboard.getPendingCount();
    expect(count).toBe(0);
  });
});
