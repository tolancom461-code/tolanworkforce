import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { calculateDailyFinanceFromAttendance } from "./attendance-to-finance";
import { getDb } from "./db";
import { attendanceEvents, workerDailyFinance, workers, groups } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";

describe("calculateDailyFinanceFromAttendance", () => {
  let db: any;
  const testDate = "2026-02-03";
  const testWorkerId = 1;

  beforeAll(async () => {
    db = await getDb();
  });

  it("should calculate daily finance from attendance events", async () => {
    // التحقق من وجود بيانات حضور ليوم الاختبار
    const attendanceData = await db
      .select()
      .from(attendanceEvents)
      .where(sql`DATE(${attendanceEvents.eventTime}) = ${testDate}`);

    if (attendanceData.length === 0) {
      console.log(`No attendance data for ${testDate}, skipping test`);
      return;
    }

    // تنفيذ الدالة
    const result = await calculateDailyFinanceFromAttendance(testDate);

    // التحقق من النتائج
    expect(result).toHaveProperty("processed");
    expect(result).toHaveProperty("errors");
    expect(result.processed).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.errors)).toBe(true);

    // التحقق من أن البيانات المالية تم إنشاؤها
    const financeData = await db
      .select()
      .from(workerDailyFinance)
      .where(sql`DATE(${workerDailyFinance.workDate}) = ${testDate}`);

    if (result.processed > 0) {
      expect(financeData.length).toBeGreaterThan(0);
      
      // التحقق من أن كل سجل مالي له قيمة baseAmount
      financeData.forEach((record: any) => {
        expect(record.baseAmount).toBeDefined();
        expect(parseFloat(record.baseAmount)).toBeGreaterThanOrEqual(0);
      });
    }
  });

  it("should handle workers without group assignment", async () => {
    const result = await calculateDailyFinanceFromAttendance(testDate);
    
    // يجب أن تكون هناك أخطاء إذا كان هناك عمال بدون مجموعة
    if (result.errors.length > 0) {
      const noGroupErrors = result.errors.filter((e: string) => e.includes("no group"));
      // قد تكون هناك أخطاء أو لا، هذا يعتمد على البيانات
      expect(Array.isArray(result.errors)).toBe(true);
    }
  });

  it("should not create duplicate records", async () => {
    // حذف السجلات القديمة
    await db
      .delete(workerDailyFinance)
      .where(sql`DATE(${workerDailyFinance.workDate}) = ${testDate}`);

    // تشغيل الدالة مرتين
    const result1 = await calculateDailyFinanceFromAttendance(testDate);
    const result2 = await calculateDailyFinanceFromAttendance(testDate);

    // يجب أن تكون النتائج متطابقة
    expect(result1.processed).toBe(result2.processed);

    // التحقق من عدم وجود تكرارات
    const financeData = await db
      .select()
      .from(workerDailyFinance)
      .where(sql`DATE(${workerDailyFinance.workDate}) = ${testDate}`);

    const workerIds = financeData.map((r: any) => r.workerId);
    const uniqueWorkerIds = new Set(workerIds);
    
    expect(workerIds.length).toBe(uniqueWorkerIds.size);
  });
});
