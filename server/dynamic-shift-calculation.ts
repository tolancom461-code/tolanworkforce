/**
 * Dynamic Shift Calculation Module
 * ربط معادلات الحساب بالورديات الديناميكية
 * 
 * هذا الملف يحتوي على دوال لحساب الرواتب بناءً على الورديات الديناميكية
 * بدلاً من الأوقات الثابتة في جدول groups
 */

import { getDb } from "./db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { groupSchedules, groups, workers } from "../drizzle/schema";

export interface DynamicShiftInfo {
  startTime: string;
  endTime: string;
  requiredHours: number;
  effectiveDate: Date | null;
  dayOfWeek: number;
}

/**
 * الحصول على وردية ديناميكية لمجموعة في يوم معين
 * @param groupId معرف المجموعة
 * @param workDate تاريخ العمل
 * @returns معلومات الوردية أو null إذا لم توجد
 */
export async function getDynamicShiftForDate(
  groupId: number,
  workDate: string
): Promise<DynamicShiftInfo | null> {
  const db = await getDb();
  if (!db) return null;

  const date = new Date(workDate);
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  // البحث عن الوردية الديناميكية للمجموعة في هذا اليوم
  // مع التحقق من تاريخ البداية (effectiveDate)
  const schedules = await db
    .select()
    .from(groupSchedules)
    .where(
      and(
        eq(groupSchedules.groupId, groupId),
        eq(groupSchedules.dayOfWeek, dayOfWeek),
        eq(groupSchedules.isActive, true),
        // إذا كان effectiveDate محدداً، يجب أن يكون تاريخ العمل >= effectiveDate
        sql`(${groupSchedules.effectiveDate} IS NULL OR ${groupSchedules.effectiveDate} <= ${workDate})`
      )
    )
    .orderBy(groupSchedules.effectiveDate) // الأحدث أولاً
    .limit(1);

  if (schedules.length === 0) return null;

  const schedule = schedules[0];
  return {
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    requiredHours: parseFloat(schedule.requiredHours.toString()),
    effectiveDate: schedule.effectiveDate,
    dayOfWeek: schedule.dayOfWeek,
  };
}

/**
 * الحصول على أوقات العمل المتوقعة لعامل في يوم معين
 * تأخذ في الاعتبار الورديات الديناميكية أولاً، ثم تعود للأوقات الثابتة
 * 
 * @param workerId معرف العامل
 * @param workDate تاريخ العمل
 * @returns {startTime, endTime, requiredHours, source}
 */
export async function getExpectedShiftTimes(
  workerId: number,
  workDate: string
): Promise<{
  startTime: string;
  endTime: string;
  requiredHours: number;
  source: "dynamic" | "static" | "default";
}> {
  const db = await getDb();
  if (!db) {
    return {
      startTime: "08:00",
      endTime: "17:00",
      requiredHours: 8,
      source: "default",
    };
  }

  // الحصول على معلومات العامل والمجموعة
  const [worker] = await db
    .select()
    .from(workers)
    .where(eq(workers.id, workerId))
    .limit(1);

  if (!worker || !worker.groupId) {
    return {
      startTime: "08:00",
      endTime: "17:00",
      requiredHours: 8,
      source: "default",
    };
  }

  // محاولة الحصول على الوردية الديناميكية
  const dynamicShift = await getDynamicShiftForDate(worker.groupId, workDate);
  if (dynamicShift) {
    return {
      startTime: dynamicShift.startTime,
      endTime: dynamicShift.endTime,
      requiredHours: dynamicShift.requiredHours,
      source: "dynamic",
    };
  }

  // الرجوع للأوقات الثابتة من جدول groups
  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.id, worker.groupId))
    .limit(1);

  if (group && group.shiftStartTime && group.shiftEndTime) {
    const workHours = parseFloat(group.workHours?.toString() || "8");
    return {
      startTime: group.shiftStartTime,
      endTime: group.shiftEndTime,
      requiredHours: workHours,
      source: "static",
    };
  }

  // القيم الافتراضية
  return {
    startTime: "08:00",
    endTime: "17:00",
    requiredHours: 8,
    source: "default",
  };
}

/**
 * حساب دقائق التأخير بناءً على الوردية الديناميكية
 * @param workerId معرف العامل
 * @param workDate تاريخ العمل
 * @param actualCheckInTime وقت الحضور الفعلي
 * @returns دقائق التأخير
 */
export async function calculateLateMintuesFromDynamicShift(
  workerId: number,
  workDate: string,
  actualCheckInTime: Date
): Promise<number> {
  const shiftInfo = await getExpectedShiftTimes(workerId, workDate);

  const [shiftStartHour, shiftStartMin] = shiftInfo.startTime
    .split(":")
    .map(Number);
  const shiftStart = new Date(actualCheckInTime);
  shiftStart.setHours(shiftStartHour, shiftStartMin, 0, 0);

  if (actualCheckInTime > shiftStart) {
    return Math.round(
      (actualCheckInTime.getTime() - shiftStart.getTime()) / (1000 * 60)
    );
  }

  return 0;
}

/**
 * حساب دقائق المغادرة المبكرة بناءً على الوردية الديناميكية
 * @param workerId معرف العامل
 * @param workDate تاريخ العمل
 * @param actualCheckOutTime وقت المغادرة الفعلي
 * @returns دقائق المغادرة المبكرة
 */
export async function calculateEarlyLeaveMinutesFromDynamicShift(
  workerId: number,
  workDate: string,
  actualCheckOutTime: Date
): Promise<number> {
  const shiftInfo = await getExpectedShiftTimes(workerId, workDate);

  const [shiftEndHour, shiftEndMin] = shiftInfo.endTime.split(":").map(Number);
  const shiftEnd = new Date(actualCheckOutTime);
  shiftEnd.setHours(shiftEndHour, shiftEndMin, 0, 0);

  if (actualCheckOutTime < shiftEnd) {
    return Math.round(
      (shiftEnd.getTime() - actualCheckOutTime.getTime()) / (1000 * 60)
    );
  }

  return 0;
}

/**
 * الحصول على معلومات الوردية الديناميكية لمجموعة في فترة زمنية
 * @param groupId معرف المجموعة
 * @param startDate تاريخ البداية
 * @param endDate تاريخ النهاية
 * @returns قائمة الورديات الديناميكية
 */
export async function getDynamicShiftsForPeriod(
  groupId: number,
  startDate: string,
  endDate: string
): Promise<DynamicShiftInfo[]> {
  const db = await getDb();
  if (!db) return [];

  const schedules = await db
    .select()
    .from(groupSchedules)
    .where(
      and(
        eq(groupSchedules.groupId, groupId),
        eq(groupSchedules.isActive, true),
        sql`(${groupSchedules.effectiveDate} IS NULL OR ${groupSchedules.effectiveDate} <= ${endDate})`,
        sql`(${groupSchedules.effectiveDate} IS NULL OR ${groupSchedules.effectiveDate} >= ${startDate})`
      )
    )
    .orderBy(groupSchedules.dayOfWeek);

  return schedules.map((s) => ({
    startTime: s.startTime,
    endTime: s.endTime,
    requiredHours: parseFloat(s.requiredHours.toString()),
    effectiveDate: s.effectiveDate,
    dayOfWeek: s.dayOfWeek,
  }));
}

/**
 * التحقق من وجود وردية ديناميكية نشطة لمجموعة
 * @param groupId معرف المجموعة
 * @returns true إذا كانت هناك وردية ديناميكية نشطة
 */
export async function hasActiveDynamicShifts(groupId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(groupSchedules)
    .where(
      and(
        eq(groupSchedules.groupId, groupId),
        eq(groupSchedules.isActive, true)
      )
    );

  return (result?.count || 0) > 0;
}
