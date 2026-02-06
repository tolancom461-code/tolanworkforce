import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    username: "testuser",
    email: "test@example.com",
    role: "admin",
    createdAt: new Date(),
  };
  return { user };
}

describe("Group Edit - Data Population Fix", () => {
  let router: ReturnType<typeof appRouter.createCaller>;
  let createdGroupId: number;

  beforeAll(() => {
    const ctx = createAuthContext();
    router = appRouter.createCaller(ctx);
  });

  it("should create a group with all fields", async () => {
    const result = await router.groups.create({
      code: "TEST-EDIT-FIX-001",
      name: "مجموعة اختبار الإصلاح",
      costCenterId: null,
      dailyWage: "100.50",
      workMinutes: "480",
      latePenaltyRate: "10.25",
      earlyLeavePenaltyRate: "5.75",
      shiftStartTime: "08:00",
      shiftEndTime: "16:00",
      isActive: true,
    });

    expect(result.id).toBeGreaterThan(0);
    createdGroupId = result.id;
    console.log(`✅ Group created with ID: ${createdGroupId}`);
  });

  it("should return group data with correct field names (camelCase) from list", async () => {
    const groups = await router.groups.list();
    const group = groups.find((g) => g.id === createdGroupId);

    expect(group).toBeDefined();
    
    // Verify all fields exist with camelCase names
    expect(group).toHaveProperty("id");
    expect(group).toHaveProperty("code");
    expect(group).toHaveProperty("name");
    expect(group).toHaveProperty("costCenterId");
    expect(group).toHaveProperty("dailyWage");
    expect(group).toHaveProperty("workMinutes");
    expect(group).toHaveProperty("latePenaltyRate");
    expect(group).toHaveProperty("earlyLeavePenaltyRate");
    expect(group).toHaveProperty("shiftStartTime");
    expect(group).toHaveProperty("shiftEndTime");
    expect(group).toHaveProperty("isActive");

    // Verify values are correct
    expect(group?.code).toBe("TEST-EDIT-FIX-001");
    expect(group?.name).toBe("مجموعة اختبار الإصلاح");
    expect(group?.dailyWage).toBe("100.50");
    expect(group?.workMinutes).toBe("480");
    expect(group?.latePenaltyRate).toBe("10.25");
    expect(group?.earlyLeavePenaltyRate).toBe("5.75");
    expect(group?.shiftStartTime).toBe("08:00");
    expect(group?.shiftEndTime).toBe("16:00");

    console.log("✅ List returns correct field names (camelCase)");
  });

  it("should return group data with correct field names (camelCase) from getById", async () => {
    const group = await router.groups.getById({ id: createdGroupId });

    expect(group).toBeDefined();
    
    // Verify all fields exist with camelCase names
    expect(group).toHaveProperty("id");
    expect(group).toHaveProperty("code");
    expect(group).toHaveProperty("name");
    expect(group).toHaveProperty("costCenterId");
    expect(group).toHaveProperty("dailyWage");
    expect(group).toHaveProperty("workMinutes");
    expect(group).toHaveProperty("latePenaltyRate");
    expect(group).toHaveProperty("earlyLeavePenaltyRate");
    expect(group).toHaveProperty("shiftStartTime");
    expect(group).toHaveProperty("shiftEndTime");
    expect(group).toHaveProperty("isActive");

    // Verify values are correct
    expect(group?.code).toBe("TEST-EDIT-FIX-001");
    expect(group?.name).toBe("مجموعة اختبار الإصلاح");
    expect(group?.dailyWage).toBe("100.50");
    expect(group?.workMinutes).toBe("480");
    expect(group?.latePenaltyRate).toBe("10.25");
    expect(group?.earlyLeavePenaltyRate).toBe("5.75");
    expect(group?.shiftStartTime).toBe("08:00");
    expect(group?.shiftEndTime).toBe("16:00");

    console.log("✅ getById returns correct field names (camelCase)");
  });

  it("should verify data consistency between list and getById", async () => {
    const groups = await router.groups.list();
    const groupFromList = groups.find((g) => g.id === createdGroupId);
    
    const groupFromGetById = await router.groups.getById({ id: createdGroupId });

    // All fields should match
    expect(groupFromList?.id).toBe(groupFromGetById?.id);
    expect(groupFromList?.code).toBe(groupFromGetById?.code);
    expect(groupFromList?.name).toBe(groupFromGetById?.name);
    expect(groupFromList?.costCenterId).toBe(groupFromGetById?.costCenterId);
    expect(groupFromList?.dailyWage).toBe(groupFromGetById?.dailyWage);
    expect(groupFromList?.workMinutes).toBe(groupFromGetById?.workMinutes);
    expect(groupFromList?.latePenaltyRate).toBe(groupFromGetById?.latePenaltyRate);
    expect(groupFromList?.earlyLeavePenaltyRate).toBe(groupFromGetById?.earlyLeavePenaltyRate);
    expect(groupFromList?.shiftStartTime).toBe(groupFromGetById?.shiftStartTime);
    expect(groupFromList?.shiftEndTime).toBe(groupFromGetById?.shiftEndTime);
    expect(groupFromList?.isActive).toBe(groupFromGetById?.isActive);

    console.log("✅ Data consistency verified between list and getById");
  });

  it("should update group and verify all fields are returned correctly", async () => {
    // Update the group
    await router.groups.update({
      id: createdGroupId,
      code: "TEST-EDIT-FIX-001-UPD",
      name: "مجموعة اختبار الإصلاح - محدثة",
      dailyWage: "150.75",
      workMinutes: "500",
      latePenaltyRate: "12.50",
      earlyLeavePenaltyRate: "7.25",
      shiftStartTime: "09:00",
      shiftEndTime: "17:00",
    });

    // Fetch updated data
    const updatedGroup = await router.groups.getById({ id: createdGroupId });

    // Verify all fields are updated and returned correctly
    expect(updatedGroup?.code).toBe("TEST-EDIT-FIX-001-UPD");
    expect(updatedGroup?.name).toBe("مجموعة اختبار الإصلاح - محدثة");
    expect(updatedGroup?.dailyWage).toBe("150.75");
    expect(updatedGroup?.workMinutes).toBe("500");
    expect(updatedGroup?.latePenaltyRate).toBe("12.50");
    expect(updatedGroup?.earlyLeavePenaltyRate).toBe("7.25");
    expect(updatedGroup?.shiftStartTime).toBe("09:00");
    expect(updatedGroup?.shiftEndTime).toBe("17:00");

    console.log("✅ Update and retrieval working correctly");
  });

  it("should verify no snake_case fields are returned", async () => {
    const group = await router.groups.getById({ id: createdGroupId });

    // Check that snake_case fields are NOT present
    expect(group).not.toHaveProperty("cost_center_id");
    expect(group).not.toHaveProperty("daily_wage");
    expect(group).not.toHaveProperty("work_minutes");
    expect(group).not.toHaveProperty("late_penalty_rate");
    expect(group).not.toHaveProperty("early_leave_penalty_rate");
    expect(group).not.toHaveProperty("shift_start_time");
    expect(group).not.toHaveProperty("shift_end_time");
    expect(group).not.toHaveProperty("is_active");

    console.log("✅ No snake_case fields present - all camelCase");
  });
});
