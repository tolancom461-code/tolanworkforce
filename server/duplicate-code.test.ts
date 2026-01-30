import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as db from "./db";

describe("Duplicate Code Validation", () => {
  // تنظيف قاعدة البيانات قبل وبعد الاختبارات
  beforeEach(async () => {
    // يتم تنظيف البيانات قبل كل اختبار
  });

  afterEach(async () => {
    // يتم تنظيف البيانات بعد كل اختبار
  });

  describe("Group Code Validation", () => {
    it("should throw error when creating group with duplicate code", async () => {
      const groupData = {
        code: "GRP001",
        name: "المجموعة الأولى",
        isActive: true,
      };

      // محاولة إنشاء مجموعة أولى
      const firstId = await db.createGroup(groupData);
      expect(firstId).toBeGreaterThan(0);

      // محاولة إنشاء مجموعة بنفس الكود
      try {
        await db.createGroup(groupData);
        expect.fail("يجب أن يرفع استثناء عند محاولة إنشاء مجموعة بكود مكرر");
      } catch (error: any) {
        expect(error.message).toContain("مسجل مسبقاً");
        expect(error.message).toContain("GRP001");
      }
    });

    it("should allow creating groups with different codes", async () => {
      const group1 = {
        code: "GRP-ALPHA",
        name: "المجموعة ألفا",
        isActive: true,
      };

      const group2 = {
        code: "GRP-BETA",
        name: "المجموعة بيتا",
        isActive: true,
      };

      const id1 = await db.createGroup(group1);
      const id2 = await db.createGroup(group2);

      expect(id1).toBeGreaterThan(0);
      expect(id2).toBeGreaterThan(0);
      expect(id1).not.toBe(id2);
    });

    it("should retrieve group by code", async () => {
      const groupData = {
        code: "GRP-TEST-001",
        name: "مجموعة الاختبار",
        isActive: true,
      };

      const createdId = await db.createGroup(groupData);
      const retrieved = await db.getGroupByCode("GRP-TEST-001");

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(createdId);
      expect(retrieved?.code).toBe("GRP-TEST-001");
      expect(retrieved?.name).toBe("مجموعة الاختبار");
    });
  });

  describe("Worker Code Validation", () => {
    it("should throw error when creating worker with duplicate code", async () => {
      const workerData = {
        code: "WRK001",
        fullName: "أحمد محمد",
        status: "active" as const,
      };

      // محاولة إنشاء عامل أول
      const firstId = await db.createWorker(workerData);
      expect(firstId).toBeGreaterThan(0);

      // محاولة إنشاء عامل بنفس الكود
      try {
        await db.createWorker(workerData);
        expect.fail("يجب أن يرفع استثناء عند محاولة إنشاء عامل بكود مكرر");
      } catch (error: any) {
        expect(error.message).toContain("مسجل مسبقاً");
        expect(error.message).toContain("WRK001");
      }
    });

    it("should allow creating workers with different codes", async () => {
      const worker1 = {
        code: "EMP-001",
        fullName: "علي محمود",
        status: "active" as const,
      };

      const worker2 = {
        code: "EMP-002",
        fullName: "فاطمة أحمد",
        status: "active" as const,
      };

      const id1 = await db.createWorker(worker1);
      const id2 = await db.createWorker(worker2);

      expect(id1).toBeGreaterThan(0);
      expect(id2).toBeGreaterThan(0);
      expect(id1).not.toBe(id2);
    });

    it("should retrieve worker by code", async () => {
      const workerData = {
        code: "WRK-TEST-001",
        fullName: "محمد علي",
        status: "active" as const,
      };

      const createdId = await db.createWorker(workerData);
      const retrieved = await db.getWorkerByCodeDirect("WRK-TEST-001");

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(createdId);
      expect(retrieved?.code).toBe("WRK-TEST-001");
      expect(retrieved?.fullName).toBe("محمد علي");
    });

    it("should return null for non-existent worker code", async () => {
      const retrieved = await db.getWorkerByCodeDirect("NON-EXISTENT-CODE");
      expect(retrieved).toBeNull();
    });

    it("should return null for non-existent group code", async () => {
      const retrieved = await db.getGroupByCode("NON-EXISTENT-GROUP");
      expect(retrieved).toBeNull();
    });
  });

  describe("Error Messages", () => {
    it("should include original group name in error message", async () => {
      const groupData = {
        code: "TEST-GRP",
        name: "مجموعة الاختبار الخاصة",
        isActive: true,
      };

      await db.createGroup(groupData);

      try {
        await db.createGroup(groupData);
        expect.fail("يجب أن يرفع استثناء");
      } catch (error: any) {
        expect(error.message).toContain("مجموعة الاختبار الخاصة");
      }
    });

    it("should include original worker name in error message", async () => {
      const workerData = {
        code: "TEST-WRK",
        fullName: "سارة محمد علي",
        status: "active" as const,
      };

      await db.createWorker(workerData);

      try {
        await db.createWorker(workerData);
        expect.fail("يجب أن يرفع استثناء");
      } catch (error: any) {
        expect(error.message).toContain("سارة محمد علي");
      }
    });
  });
});
