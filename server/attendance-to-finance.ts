import { getDb } from "./db";
import { attendanceEvents, workerDailyFinance, workers, groups, groupSchedules } from "../drizzle/schema";
import { eq, and, sql, gte, lte } from "drizzle-orm";

/**
 * حساب البيانات المالية اليومية من بيانات الحضور والانصراف
 * يتم حساب ساعات العمل الفعلية بناءً على وردية المجموعة
 */
export async function calculateDailyFinanceFromAttendance(workDate: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // الحصول على جميع بيانات الحضور ليوم معين
    const attendanceData = await db
      .select()
      .from(attendanceEvents)
      .where(sql`DATE(${attendanceEvents.eventTime}) = ${workDate}`);

    if (attendanceData.length === 0) {
      console.log(`No attendance data for ${workDate}`);
      return { processed: 0, errors: [] };
    }

    // تجميع بيانات الحضور حسب العامل
    const attendanceByWorker: Record<number, { checkIn?: Date; checkOut?: Date }> = {};

    for (const event of attendanceData) {
      if (!event.workerId) continue;

      if (!attendanceByWorker[event.workerId]) {
        attendanceByWorker[event.workerId] = {};
      }

      if (event.eventType === "check_in" && !attendanceByWorker[event.workerId].checkIn) {
        attendanceByWorker[event.workerId].checkIn = event.eventTime;
      } else if (event.eventType === "check_out" && !attendanceByWorker[event.workerId].checkOut) {
        attendanceByWorker[event.workerId].checkOut = event.eventTime;
      }
    }

    const errors: string[] = [];
    let processed = 0;

    // معالجة كل عامل
    for (const [workerIdStr, attendance] of Object.entries(attendanceByWorker)) {
      const workerId = parseInt(workerIdStr);

      try {
        // الحصول على بيانات العامل
        const worker = await db
          .select()
          .from(workers)
          .where(eq(workers.id, workerId))
          .limit(1);

        if (!worker || worker.length === 0) {
          errors.push(`Worker ${workerId} not found`);
          continue;
        }

        const workerData = worker[0];
        if (!workerData.groupId) {
          errors.push(`Worker ${workerId} has no group assigned`);
          continue;
        }

        // الحصول على وردية المجموعة ليوم معين
        const dayOfWeek = new Date(workDate).getDay();
        const dayName = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][dayOfWeek];

        const schedule = await db
          .select()
          .from(groupSchedules)
          .where(
            and(
              eq(groupSchedules.groupId, workerData.groupId),
              eq(groupSchedules.dayOfWeek, dayName as any)
            )
          )
          .limit(1);

        if (!schedule || schedule.length === 0) {
          errors.push(`No schedule found for worker ${workerId} on ${dayName}`);
          continue;
        }

        const scheduleData = schedule[0];
        const shiftStart = scheduleData.startTime; // Format: "HH:MM"
        const shiftEnd = scheduleData.endTime; // Format: "HH:MM"

        // حساب ساعات العمل
        let hoursWorked = 0;
        if (attendance.checkIn && attendance.checkOut) {
          const checkInTime = new Date(attendance.checkIn);
          const checkOutTime = new Date(attendance.checkOut);
          const diffMs = checkOutTime.getTime() - checkInTime.getTime();
          hoursWorked = diffMs / (1000 * 60 * 60); // تحويل من ميلي ثانية إلى ساعات
        }

        // حساب الراتب اليومي
        // نفترض أن الراتب اليومي موجود في جدول العامل
        const dailySalary = parseFloat(workerData.dailyRate || '0');
        const hourlyRate = dailySalary / 8; // 8 ساعات عمل يومية
        const baseAmount = hourlyRate * Math.min(hoursWorked, 8); // لا تتجاوز 8 ساعات

        // حذف السجل القديم إن وجد
        await db
          .delete(workerDailyFinance)
          .where(
            and(
              eq(workerDailyFinance.workerId, workerId),
              sql`DATE(${workerDailyFinance.workDate}) = ${workDate}`
            )
          );

        // إدراج السجل الجديد
        const netAmount = baseAmount;
        await db.insert(workerDailyFinance).values({
          workerId,
          workDate: new Date(workDate),
          baseAmount: baseAmount.toString(),
          deductions: "0.00",
          bonuses: "0.00",
          netAmount: netAmount.toString(),
          lateMinutes: 0,
          earlyLeaveMinutes: 0,
          notes: `Attendance calculated from check-in/out`,
        } as any);

        processed++;
      } catch (error) {
        errors.push(`Error processing worker ${workerId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return { processed, errors };
  } catch (error) {
    console.error("Error in calculateDailyFinanceFromAttendance:", error);
    throw error;
  }
}

/**
 * حساب البيانات المالية اليومية لنطاق تواريخ معين
 */
export async function calculateDailyFinanceForDateRange(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const start = new Date(startDate);
  const end = new Date(endDate);
  const results = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    const result = await calculateDailyFinanceFromAttendance(dateStr);
    results.push({ date: dateStr, ...result });
  }

  return results;
}
