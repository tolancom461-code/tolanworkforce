import { eq, desc, and, or, like, gte, lt, lte, ne, sql, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { getAdministrativeWorkDate } from '../attendance-logic';
import { 
  users, InsertUser, User,
  costCenters,
  groups, Group, InsertGroup,
  groupSchedules,
  workers, InsertWorker,
  attendanceEvents,
  workDays,
  workerDailyFinance,
  payOverrides,
  payrollBatches,
  payrollBatchItems,
  payrollBatchNotes,
  payrollBatchCorrections,
  operationalFlags,
  userCostCenters,
  temporaryAssignments,
  assignmentSettlements,
  deductionRules,
  auditLog,
  notifications,
  pushSubscriptions,
  restaurants,
  dailyWorkAssignments
} from "../../drizzle/schema";
import { sendNotification, sendNotificationToRoles, notifyStageAndAdmins, ADMIN_OWNER_ROLES } from '../notifications';
import { getRoleLabel } from '../permissions';
import { inArray, isNull, isNotNull, between } from "drizzle-orm";
import type { Worker as DbWorker } from "../../drizzle/schema";
import { ENV } from '../_core/env';
import { getDb, getExpandedDateRange, groupEventsByWorkDate } from './connection';
import { transformGroup } from './groups';
import { recordAttendance } from './attendance';
import { getEffectiveGroupForWorkerOnDate } from './recalculation';
import { calculateDailyFinanceFromAttendance } from './daily-finance';

// ============================================
// Auto Finance Calculation
// ============================================

/**
 * حساب وحفظ المالية اليومية تلقائياً عند check_out
 * يتم استدعاء هذه الدالة من recordAttendance
 */
export async function calculateAndSaveDailyFinance(workerId: number, checkOutTime: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { workers, groups, attendanceEvents, workerDailyFinance } = await import('../../drizzle/schema');
  
  // Get check_in time - look back up to 24 hours to support night shifts
  const lookbackTime = new Date(checkOutTime.getTime() - 24 * 60 * 60 * 1000);
  
  const checkInEvents = await db
    .select()
    .from(attendanceEvents)
    .where(
      and(
        eq(attendanceEvents.workerId, workerId),
        eq(attendanceEvents.eventType, 'check_in'),
        gte(attendanceEvents.eventTime, lookbackTime),
        lte(attendanceEvents.eventTime, checkOutTime)
      )
    )
    .orderBy(desc(attendanceEvents.eventTime))
    .limit(1);
  
  if (checkInEvents.length === 0) {
    return;
  }
  
  const checkInTime = checkInEvents[0].eventTime;
  
  // Work date = check_in's calendar date (NOT check_out's date)
  // This correctly handles night shifts where check_out crosses midnight
  const workDate = new Date(checkInTime);
  workDate.setHours(0, 0, 0, 0);
  
  // Get worker base data, then resolve the effective group for this operational day.
  const [workerData] = await db
    .select({
      dailyRate: workers.dailyRate,
      groupId: workers.groupId,
    })
    .from(workers)
    .where(eq(workers.id, workerId))
    .limit(1);
  
  if (!workerData) {
    throw new Error("Worker not found");
  }

  const workDateStr = workDate.toLocaleDateString('en-CA');
  const effectiveGroupId = (await getEffectiveGroupForWorkerOnDate(workerId, workDateStr)) || workerData.groupId;
  const groupData = effectiveGroupId
    ? await db.select().from(groups).where(eq(groups.id, effectiveGroupId)).limit(1)
    : [];
  const effectiveGroup = groupData[0];
  
  const dailyRate = Number(workerData.dailyRate) || 0;
  const minuteCost = Number(effectiveGroup?.minuteCost) || 0;
  const latePenaltyRate = Number(effectiveGroup?.latePenaltyRate) || 0;
  const earlyLeavePenaltyRate = Number(effectiveGroup?.earlyLeavePenaltyRate) || 0;
  
  // Get shift times from weekly schedule based on day of week
  let shiftStartTime: string | null = null;
  let shiftEndTime: string | null = null;
  
  if (effectiveGroupId) {
    const dayOfWeek = workDate.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday (local time)
    
    const [schedule] = await db
      .select()
      .from(groupSchedules)
      .where(
        and(
          eq(groupSchedules.groupId, effectiveGroupId),
          eq(groupSchedules.dayOfWeek, dayOfWeek),
          eq(groupSchedules.isActive, true),
          or(
            isNull(groupSchedules.effectiveDate),
            sql`${groupSchedules.effectiveDate} <= ${workDateStr}`
          )
        )
      )
      .orderBy(desc(groupSchedules.effectiveDate))
      .limit(1);
    
    if (schedule) {
      shiftStartTime = schedule.startTime;
      shiftEndTime = schedule.endTime;
    }
  }
  
  // Use the effective group's wage/minute settings for this day.
  const groupDailyWage = effectiveGroup?.dailyWage ? Number(effectiveGroup.dailyWage) : 0;
  const groupWorkMinutes = effectiveGroup?.workMinutes ? Number(effectiveGroup.workMinutes) : 0;
  
  // Base salary = fixed daily wage (not calculated from minutes)
  let baseSalary = groupDailyWage > 0 ? groupDailyWage : dailyRate;
  let latePenalty = 0;
  let earlyLeavePenalty = 0;
  let workedMinutes = Math.floor((checkOutTime.getTime() - checkInTime.getTime()) / 60000);
  // Cap worked minutes at shift duration
  let financialMinutes = groupWorkMinutes > 0 ? Math.min(workedMinutes, groupWorkMinutes) : workedMinutes;
  let lateMinutes = 0;
  let earlyLeaveMinutes = 0;
  
  // ⚠️ SHIFT-BASED CALCULATIONS: Only if shift is defined in group_schedules
  // If no shift is defined, NO penalties are calculated (worker gets full daily wage)
  if (shiftStartTime && shiftEndTime) {
    // Parse shift times
    const [shiftStartHour, shiftStartMin] = shiftStartTime.split(':').map(Number);
    const [shiftEndHour, shiftEndMin] = shiftEndTime.split(':').map(Number);
    
    // Build shift times in local time to match stored event times
    const shiftDateBase = new Date(workDate.toLocaleDateString('en-CA') + 'T00:00:00');
    const shiftStart = new Date(shiftDateBase);
    shiftStart.setHours(shiftStartHour, shiftStartMin, 0, 0);
    
    let shiftEnd = new Date(shiftDateBase);
    shiftEnd.setHours(shiftEndHour, shiftEndMin, 0, 0);
    
    // If shift ends after midnight
    if (shiftEnd <= shiftStart) {
      shiftEnd.setDate(shiftEnd.getDate() + 1);
    }
    
    // Calculate actual work time within shift boundaries
    const actualStart = checkInTime > shiftStart ? checkInTime : shiftStart;
    const actualEnd = checkOutTime < shiftEnd ? checkOutTime : shiftEnd;
    
    if (actualEnd > actualStart) {
      financialMinutes = Math.floor((actualEnd.getTime() - actualStart.getTime()) / 60000);
      // Cap at shift duration
      if (groupWorkMinutes > 0) {
        financialMinutes = Math.min(financialMinutes, groupWorkMinutes);
      }
    } else {
      financialMinutes = 0;
    }
    
    // Calculate late minutes: only if checked in AFTER shift start
    if (checkInTime > shiftStart) {
      lateMinutes = Math.floor((checkInTime.getTime() - shiftStart.getTime()) / 60000);
    }
    
    // Calculate early leave minutes: only if checked out BEFORE shift end
    if (checkOutTime < shiftEnd) {
      earlyLeaveMinutes = Math.floor((shiftEnd.getTime() - checkOutTime.getTime()) / 60000);
    }
    
    // Calculate penalties using minuteCost
    // penaltyRate is stored as percentage (e.g., 200% = double the minute cost)
    if (latePenaltyRate > 0 && lateMinutes > 0 && minuteCost > 0) {
      latePenalty = lateMinutes * minuteCost * (latePenaltyRate / 100);
    }
    
    if (earlyLeavePenaltyRate > 0 && earlyLeaveMinutes > 0 && minuteCost > 0) {
      earlyLeavePenalty = earlyLeaveMinutes * minuteCost * (earlyLeavePenaltyRate / 100);
    }
  }
  // else: No shift defined = no penalties, worker gets full daily wage
  
  // ⚠️ CAP: Total deductions cannot exceed base salary (net >= 0)
  let totalDeductions = latePenalty + earlyLeavePenalty;
  if (totalDeductions > baseSalary) {
    // Scale down penalties proportionally to cap at baseSalary
    const scale = baseSalary / totalDeductions;
    latePenalty = Math.round(latePenalty * scale * 100) / 100;
    earlyLeavePenalty = Math.round(earlyLeavePenalty * scale * 100) / 100;
    totalDeductions = baseSalary;
  }
  
  const netSalary = baseSalary - totalDeductions;
  
  // Save to worker_daily_finance
  // Check if record exists
  const existing = await db
    .select()
    .from(workerDailyFinance)
    .where(
      and(
        eq(workerDailyFinance.workerId, workerId),
        eq(workerDailyFinance.workDate, workDate)
      )
    )
    .limit(1);
  
  if (existing.length > 0) {
    // Update existing record
    await db
      .update(workerDailyFinance)
      .set({
        checkOutTime,
        workedMinutes,
        financialMinutes,
        lateMinutes,
        earlyLeaveMinutes,
        baseSalary: baseSalary.toString(),
        latePenalty: latePenalty.toString(),
        earlyLeavePenalty: earlyLeavePenalty.toString(),
        netSalary: netSalary.toString(),
        // New columns
        baseAmount: baseSalary.toString(),
        deductions: totalDeductions.toString(),
        bonuses: '0.00',
        netAmount: netSalary.toString(),
        effectiveGroupId: effectiveGroupId || null,
        updatedAt: new Date(),
      })
      .where(eq(workerDailyFinance.id, existing[0].id));
  } else {
    // Insert new record
    await db.insert(workerDailyFinance).values({
      workerId,
      workDate,
      checkInTime,
      checkOutTime,
      workedMinutes,
      financialMinutes,
      lateMinutes,
      earlyLeaveMinutes,
      baseSalary: baseSalary.toString(),
      latePenalty: latePenalty.toString(),
      earlyLeavePenalty: earlyLeavePenalty.toString(),
      netSalary: netSalary.toString(),
      // New columns
      baseAmount: baseSalary.toString(),
      deductions: totalDeductions.toString(),
      bonuses: '0.00',
      netAmount: netSalary.toString(),
      effectiveGroupId: effectiveGroupId || null,
    });
  }
  
}


export async function saveWeeklySchedules(
  groupId: number,
  schedules: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    requiredHours: number;
    isActive: boolean;
    dailyRate?: string; // ✅ المبلغ اليومي المخصص (اختياري)
  }>,
  effectiveDate?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { groupSchedules } = await import('../../drizzle/schema');

  // Delete existing schedules for this group
  await db.delete(groupSchedules).where(eq(groupSchedules.groupId, groupId));

  // Insert new schedules
  for (const schedule of schedules) {
    await db.insert(groupSchedules).values({
      groupId,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      requiredHours: schedule.requiredHours.toString(),
      isActive: schedule.isActive,
      // ✅ حفظ المبلغ اليومي المخصص (NULL إذا لم يتم تحديده)
      dailyRate: schedule.dailyRate || null,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
    });
  }

  return { success: true, count: schedules.length };
}

/**
 * Aggregate payroll data for all workers in a cost center for a period
 */
export async function aggregatePayrollDataByCostCenter(
  costCenterId: number,
  periodStart: string,
  periodEnd: string,
  selectedGroupIds?: number[]
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const periodStartDate = periodStart.split('T')[0];
  const periodEndDate = periodEnd.split('T')[0];

  const groupsInCostCenter = await db
    .select({ id: groups.id })
    .from(groups)
    .where(eq(groups.costCenterId, costCenterId));

  const allGroupIds = groupsInCostCenter.map((group) => group.id);
  const targetGroupIds = selectedGroupIds && selectedGroupIds.length > 0
    ? allGroupIds.filter((id) => selectedGroupIds.includes(id))
    : allGroupIds;

  if (targetGroupIds.length === 0) return [];

  // Read daily finance rows first, then resolve the effective group day-by-day.
  // This supports workers whose base group belongs to another cost center.
  const financeRows = await db
    .select({
      workerId: workerDailyFinance.workerId,
      workDate: workerDailyFinance.workDate,
      baseAmount: workerDailyFinance.baseAmount,
      deductions: workerDailyFinance.deductions,
      bonuses: workerDailyFinance.bonuses,
      netAmount: workerDailyFinance.netAmount,
      storedEffectiveGroupId: workerDailyFinance.effectiveGroupId,
      baseGroupId: workers.groupId,
      workerName: workers.fullName,
    })
    .from(workerDailyFinance)
    .innerJoin(workers, eq(workerDailyFinance.workerId, workers.id))
    .where(
      and(
        sql`${workerDailyFinance.workDate} >= ${periodStartDate}`,
        sql`${workerDailyFinance.workDate} <= ${periodEndDate}`
      )
    );

  const periodWorkerIds = [...new Set(financeRows.map((row) => row.workerId))];
  const [operationalRows, temporaryRows] = periodWorkerIds.length > 0
    ? await Promise.all([
        db
          .select({
            workerId: dailyWorkAssignments.workerId,
            workDate: dailyWorkAssignments.workDate,
            operationalGroupId: dailyWorkAssignments.operationalGroupId,
          })
          .from(dailyWorkAssignments)
          .where(
            and(
              inArray(dailyWorkAssignments.workerId, periodWorkerIds),
              gte(dailyWorkAssignments.workDate, periodStartDate),
              lte(dailyWorkAssignments.workDate, periodEndDate)
            )
          ),
        db
          .select({
            workerId: temporaryAssignments.workerId,
            toGroupId: temporaryAssignments.toGroupId,
            startDate: temporaryAssignments.startDate,
            endDate: temporaryAssignments.endDate,
          })
          .from(temporaryAssignments)
          .where(
            and(
              inArray(temporaryAssignments.workerId, periodWorkerIds),
              eq(temporaryAssignments.status, 'active'),
              lte(temporaryAssignments.startDate, periodEndDate),
              gte(temporaryAssignments.endDate, periodStartDate)
            )
          ),
      ])
    : [[], []];

  const operationalGroupByWorkerDate = new Map<string, number>();
  for (const row of operationalRows) {
    if (row.operationalGroupId) {
      operationalGroupByWorkerDate.set(`${row.workerId}:${row.workDate}`, row.operationalGroupId);
    }
  }

  const temporaryByWorker = new Map<number, typeof temporaryRows>();
  for (const row of temporaryRows) {
    const rows = temporaryByWorker.get(row.workerId) || [];
    rows.push(row);
    temporaryByWorker.set(row.workerId, rows);
  }

  const baseGroupByWorker = new Map<number, number | null>();
  for (const row of financeRows) {
    if (!baseGroupByWorker.has(row.workerId)) baseGroupByWorker.set(row.workerId, row.baseGroupId || null);
  }

  const resolveEffectiveGroup = (workerId: number, workDate: string, baseGroupId?: number | null) => {
    const operationalGroupId = operationalGroupByWorkerDate.get(`${workerId}:${workDate}`);
    if (operationalGroupId) return operationalGroupId;

    const temporary = temporaryByWorker
      .get(workerId)
      ?.find((assignment) => assignment.startDate <= workDate && assignment.endDate >= workDate);
    return temporary?.toGroupId || baseGroupId || baseGroupByWorker.get(workerId) || null;
  };

  type WorkerAggregate = {
    workerId: number;
    workerName: string;
    baseAmount: number;
    deductions: number;
    bonuses: number;
    daysWorked: number;
    groupDays: Map<number, { days: number; lastDate: string }>;
  };

  const workerMap = new Map<number, WorkerAggregate>();

  for (const row of financeRows) {
    const workDate = typeof row.workDate === 'string'
      ? row.workDate
      : new Date(row.workDate).toLocaleDateString('en-CA');
    const effectiveGroupId = resolveEffectiveGroup(row.workerId, workDate, row.baseGroupId);

    if (!effectiveGroupId || !targetGroupIds.includes(effectiveGroupId)) continue;

    const existing = workerMap.get(row.workerId) || {
      workerId: row.workerId,
      workerName: row.workerName,
      baseAmount: 0,
      deductions: 0,
      bonuses: 0,
      daysWorked: 0,
      groupDays: new Map<number, { days: number; lastDate: string }>(),
    };

    // If an explicit Operations transfer was recorded after this daily finance row was created,
    // recalculate only that changed day in memory. Do not broadly recalculate historical rows whose
    // effective_group_id is null, because that could rewrite old payroll semantics unintentionally.
    let baseAmount = parseFloat(row.baseAmount || '0');
    let deductions = parseFloat(row.deductions || '0');
    let bonuses = parseFloat(row.bonuses || '0');
    const hasOperationalTransfer = operationalGroupByWorkerDate.has(`${row.workerId}:${workDate}`);
    if (hasOperationalTransfer && row.storedEffectiveGroupId !== effectiveGroupId) {
      const recalculated = await calculateDailyFinanceFromAttendance(row.workerId, workDate);
      baseAmount = Number(recalculated.baseAmount || 0);
      deductions = Number(recalculated.deductions || 0);
      bonuses = Number(recalculated.bonuses || 0);
    }

    existing.baseAmount += baseAmount;
    existing.deductions += deductions;
    existing.bonuses += bonuses;
    existing.daysWorked += 1;
    const groupDays = existing.groupDays.get(effectiveGroupId) || { days: 0, lastDate: workDate };
    groupDays.days += 1;
    if (workDate > groupDays.lastDate) groupDays.lastDate = workDate;
    existing.groupDays.set(effectiveGroupId, groupDays);
    workerMap.set(row.workerId, existing);
  }

  if (workerMap.size === 0) return [];

  // Preserve approved pay overrides and assign each override to the effective group on its own date.
  const overrides = await db
    .select({
      workerId: payOverrides.workerId,
      overrideDate: payOverrides.overrideDate,
      overrideType: payOverrides.overrideType,
      amount: payOverrides.amount,
    })
    .from(payOverrides)
    .where(
      and(
        eq(payOverrides.status, 'approved'),
        sql`${payOverrides.overrideDate} >= ${periodStartDate}`,
        sql`${payOverrides.overrideDate} <= ${periodEndDate}`,
        inArray(payOverrides.workerId, [...workerMap.keys()])
      )
    );

  for (const override of overrides) {
    const aggregate = workerMap.get(override.workerId);
    if (!aggregate) continue;

    const overrideDate = typeof override.overrideDate === 'string'
      ? override.overrideDate
      : new Date(override.overrideDate).toLocaleDateString('en-CA');
    const effectiveGroupId = resolveEffectiveGroup(override.workerId, overrideDate);
    if (!effectiveGroupId || !targetGroupIds.includes(effectiveGroupId)) continue;

    const amount = parseFloat(override.amount || '0');
    if (override.overrideType === 'bonus') aggregate.bonuses += amount;
    if (override.overrideType === 'deduction') aggregate.deductions += amount;
    const groupDays = aggregate.groupDays.get(effectiveGroupId) || { days: 0, lastDate: overrideDate };
    if (overrideDate > groupDays.lastDate) groupDays.lastDate = overrideDate;
    aggregate.groupDays.set(effectiveGroupId, groupDays);
  }

  return [...workerMap.values()].map((aggregate) => {
    const netAmount = aggregate.baseAmount - aggregate.deductions + aggregate.bonuses;
    const groupStats = [...aggregate.groupDays.entries()];
    const representativeGroupId = groupStats
      .sort((a, b) => b[1].days - a[1].days || b[1].lastDate.localeCompare(a[1].lastDate) || a[0] - b[0])[0]?.[0] || null;
    return {
      workerId: aggregate.workerId,
      workerName: aggregate.workerName,
      // payroll_batch_items currently stores one group_id per worker. Keep a deterministic
      // representative group for compatibility with existing reports; monetary calculation
      // itself is still fully day-by-day across every effective group.
      groupId: representativeGroupId,
      baseAmount: aggregate.baseAmount.toFixed(2),
      deductions: aggregate.deductions.toFixed(2),
      bonuses: aggregate.bonuses.toFixed(2),
      netAmount: netAmount.toFixed(2),
      daysWorked: aggregate.daysWorked,
      isPartial: groupStats.length > 1,
      notes: groupStats.length > 1 ? 'تم احتساب العامل يومياً على أكثر من مجموعة داخل مركز التكلفة' : undefined,
    };
  });
}


// Get all check_out events for a specific date
export async function getCheckOutEventsByDate(date: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { attendanceEvents } = await import('../../drizzle/schema');
  
  // ✅ قاعدة 5 صباحاً: اليوم الإداري يبدأ 5 صباحاً وينتهي 4:59 صباحاً اليوم التالي
  const startOfDay = new Date(`${date}T05:00:00+03:00`);
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDayStr = nextDay.toLocaleDateString('en-CA');
  const endOfDay = new Date(`${nextDayStr}T04:59:59+03:00`);
  
  return await db
    .select()
    .from(attendanceEvents)
    .where(
      and(
        eq(attendanceEvents.eventType, 'check_out'),
        gte(attendanceEvents.eventTime, startOfDay),
        lte(attendanceEvents.eventTime, endOfDay)
      )
    );
}

// Delete all worker daily finance records for a specific date
export async function deleteWorkerDailyFinanceByDate(date: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { workerDailyFinance } = await import('../../drizzle/schema');
  
  await db
    .delete(workerDailyFinance)
    .where(eq(workerDailyFinance.workDate, new Date(date)));
}

// Get comprehensive audit log entries (all operations)
export async function getAuditLog(filters?: {
  startDate?: string;
  endDate?: string;
  action?: string;
  tableName?: string;
  userId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { auditLog, users } = await import('../../drizzle/schema');
  
  const conditions: any[] = [];
  
  if (filters?.startDate) {
    const startDate = new Date(filters.startDate);
    conditions.push(gte(auditLog.createdAt, startDate));
  }
  
  if (filters?.endDate) {
    const endDate = new Date(filters.endDate);
    endDate.setHours(23, 59, 59, 999);
    conditions.push(lte(auditLog.createdAt, endDate));
  }
  
  if (filters?.action) {
    conditions.push(eq(auditLog.action, filters.action));
  }
  
  if (filters?.tableName) {
    conditions.push(eq(auditLog.tableName, filters.tableName));
  }
  
  if (filters?.userId) {
    conditions.push(eq(auditLog.userId, filters.userId));
  }
  
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  
  // Get total count
  const [countResult] = await db
    .select({ value: count() })
    .from(auditLog)
    .where(whereClause);
  
  const total = countResult?.value || 0;
  
  // Get paginated results
  let query = db
    .select({
      id: auditLog.id,
      userId: auditLog.userId,
      userName: users.fullName,
      userRole: users.role,
      action: auditLog.action,
      tableName: auditLog.tableName,
      recordId: auditLog.recordId,
      oldValues: auditLog.oldValues,
      newValues: auditLog.newValues,
      ipAddress: auditLog.ipAddress,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.userId, users.id))
    .where(whereClause)
    .orderBy(desc(auditLog.createdAt))
    .limit(filters?.limit || 50)
    .offset(filters?.offset || 0);
  
  const results = await query;
  
  // Parse JSON strings
  const logs = results.map(row => ({
    ...row,
    oldValues: row.oldValues ? (() => { try { return JSON.parse(row.oldValues as string); } catch { return row.oldValues; } })() : null,
    newValues: row.newValues ? (() => { try { return JSON.parse(row.newValues as string); } catch { return row.newValues; } })() : null,
  }));
  
  return { logs, total };
}

// Get audit log stats (counts by action type)
export async function getAuditLogStats(filters?: {
  startDate?: string;
  endDate?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const conditions: any[] = [];
  
  if (filters?.startDate) {
    conditions.push(gte(auditLog.createdAt, new Date(filters.startDate)));
  }
  if (filters?.endDate) {
    const endDate = new Date(filters.endDate);
    endDate.setHours(23, 59, 59, 999);
    conditions.push(lte(auditLog.createdAt, endDate));
  }
  
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  
  const results = await db
    .select({
      action: auditLog.action,
      count: count(),
    })
    .from(auditLog)
    .where(whereClause)
    .groupBy(auditLog.action)
    .orderBy(desc(count()));
  
  return results;
}

/**
 * Check if a group has any active weekly schedules
 */
export async function checkGroupHasSchedules(groupId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const schedules = await db
    .select()
    .from(groupSchedules)
    .where(
      and(
        eq(groupSchedules.groupId, groupId),
        eq(groupSchedules.isActive, true)
      )
    )
    .limit(1);
  
  return schedules.length > 0;
}

/**
 * Get all groups without active weekly schedules
 */
export async function getGroupsWithoutSchedules() {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  // Get all active groups
  const allGroups = await db
    .select()
    .from(groups)
    .where(eq(groups.isActive, true));
  
  // Check each group for schedules
  const groupsWithoutSchedules = [];
  for (const group of allGroups) {
    const hasSchedules = await checkGroupHasSchedules(group.id);
    if (!hasSchedules) {
      groupsWithoutSchedules.push(transformGroup(group));
    }
  }
  
  return groupsWithoutSchedules;
}


/**
 * Check if a schedule effective date conflicts with existing payroll batches
 * Returns the conflicting batch if found, null otherwise
 */
export async function checkScheduleDateConflict(
  groupId: number,
  effectiveDate: string
): Promise<{ batchCode: string; periodStart: string; periodEnd: string; status: string } | null> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const { payrollBatches, payrollBatchItems, workers } = await import('../../drizzle/schema');
  
  // Get all workers in this group
  const groupWorkers = await db
    .select({ id: workers.id })
    .from(workers)
    .where(eq(workers.groupId, groupId));
  
  if (groupWorkers.length === 0) {
    return null; // No workers in group, no conflict
  }
  
  const workerIds = groupWorkers.map(w => w.id);
  
  // Find payroll batches that:
  // 1. Include workers from this group
  // 2. Have a period that includes or overlaps with the effective date
  const batches = await db
    .select({
      batchCode: payrollBatches.batchCode,
      periodStart: payrollBatches.periodStart,
      periodEnd: payrollBatches.periodEnd,
      status: payrollBatches.status,
    })
    .from(payrollBatches)
    .innerJoin(
      payrollBatchItems,
      eq(payrollBatches.id, payrollBatchItems.batchId)
    )
    .where(
      and(
        sql`${payrollBatchItems.workerId} IN (${sql.join(workerIds.map(id => sql`${id}`), sql`, `)})`,
        sql`${payrollBatches.periodStart} <= ${effectiveDate}`,
        sql`${payrollBatches.periodEnd} >= ${effectiveDate}`
      )
    )
    .limit(1);
  
  if (batches.length > 0) {
    const batch = batches[0];
    return {
      batchCode: batch.batchCode,
      periodStart: batch.periodStart instanceof Date ? batch.periodStart.toLocaleDateString('en-CA') : batch.periodStart,
      periodEnd: batch.periodEnd instanceof Date ? batch.periodEnd.toLocaleDateString('en-CA') : batch.periodEnd,
      status: batch.status || 'draft'
    };
  }
  
  return null;
}

/**
 * Get the earliest safe effective date for a group (after all existing payroll batches)
 */
export async function getEarliestSafeEffectiveDate(groupId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const { payrollBatches, payrollBatchItems, workers } = await import('../../drizzle/schema');
  
  // Get all workers in this group
  const groupWorkers = await db
    .select({ id: workers.id })
    .from(workers)
    .where(eq(workers.groupId, groupId));
  
  if (groupWorkers.length === 0) {
    // No workers, today is safe
    return new Date().toLocaleDateString('en-CA');
  }
  
  const workerIds = groupWorkers.map(w => w.id);
  
  // Find the latest payroll batch end date for this group's workers
  const [latestBatch] = await db
    .select({
      periodEnd: payrollBatches.periodEnd,
    })
    .from(payrollBatches)
    .innerJoin(
      payrollBatchItems,
      eq(payrollBatches.id, payrollBatchItems.batchId)
    )
    .where(
      sql`${payrollBatchItems.workerId} IN (${sql.join(workerIds.map(id => sql`${id}`), sql`, `)})`
    )
    .orderBy(desc(payrollBatches.periodEnd))
    .limit(1);
  
  if (!latestBatch) {
    // No batches found, today is safe
    return new Date().toLocaleDateString('en-CA');
  }
  
  // Return the day after the latest batch end date
  const safeDate = new Date(latestBatch.periodEnd);
  safeDate.setDate(safeDate.getDate() + 1);
  return safeDate.toLocaleDateString('en-CA');
}


/**
 * Get groups with recent schedule changes (within last 24 hours)
 * Returns groups that had schedule modifications and might affect payroll calculation
 */
export async function getRecentScheduleChanges(hoursThreshold: number = 24): Promise<Array<{
  groupId: number;
  groupName: string;
  lastModified: Date;
  modifiedSchedules: number;
}>> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const { groupSchedules, groups } = await import('../../drizzle/schema');
  
  // Calculate the threshold timestamp
  const thresholdDate = new Date();
  thresholdDate.setHours(thresholdDate.getHours() - hoursThreshold);
  
  // Get all schedules modified after threshold, grouped by group
  const recentChanges = await db
    .select({
      groupId: groupSchedules.groupId,
      groupName: groups.name,
      lastModified: sql<Date>`MAX(${groupSchedules.updatedAt})`,
      modifiedSchedules: sql<number>`COUNT(DISTINCT ${groupSchedules.id})`,
    })
    .from(groupSchedules)
    .innerJoin(groups, eq(groupSchedules.groupId, groups.id))
    .where(
      sql`${groupSchedules.updatedAt} >= ${thresholdDate.toISOString().slice(0, 19).replace('T', ' ')}`
    )
    .groupBy(groupSchedules.groupId, groups.name);
  
  return recentChanges.map(change => ({
    groupId: change.groupId,
    groupName: change.groupName,
    lastModified: new Date(change.lastModified),
    modifiedSchedules: Number(change.modifiedSchedules),
  }));
}


/**
 * Get incomplete attendance records for a specific date
 * Returns records that have either check-in without check-out or check-out without check-in
 */
export async function getIncompleteAttendance(workDate: Date): Promise<Array<{
  workerId: number;
  workerCode: string;
  workerName: string;
  groupId: number | null;
  groupName: string;
  checkInId: number | null;
  checkInTime: Date | null;
  checkOutId: number | null;
  checkOutTime: Date | null;
  incompleteType: 'missing_check_out' | 'missing_check_in';
}>> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const { attendanceEvents, workers, groups } = await import('../../drizzle/schema');
  
  // Get date range for the work date - expanded for night shifts
  const dateStr = workDate.toLocaleDateString('en-CA');
  const { startOfDay, endOfSearch } = getExpandedDateRange(dateStr);
  
  // Get all attendance events for the expanded range
  const events = await db
    .select({
      id: attendanceEvents.id,
      workerId: attendanceEvents.workerId,
      eventType: attendanceEvents.eventType,
      eventTime: attendanceEvents.eventTime,
      workerCode: workers.code,
      workerName: workers.fullName,
      groupId: workers.groupId,
      groupName: groups.name,
    })
    .from(attendanceEvents)
    .innerJoin(workers, eq(attendanceEvents.workerId, workers.id))
    .leftJoin(groups, eq(workers.groupId, groups.id))
    .where(
      and(
        gte(attendanceEvents.eventTime, startOfDay),
        lte(attendanceEvents.eventTime, endOfSearch)
      )
    )
    .orderBy(attendanceEvents.workerId, attendanceEvents.eventTime);
  
  // Use groupEventsByWorkDate for correct night shift handling
  const grouped = groupEventsByWorkDate(events);
  const dayData = grouped[dateStr] || {};
  
  // Find incomplete records using the correctly grouped data
  const incompleteRecords: Array<{
    workerId: number;
    workerCode: string;
    workerName: string;
    groupId: number | null;
    groupName: string;
    checkInId: number | null;
    checkInTime: Date | null;
    checkOutId: number | null;
    checkOutTime: Date | null;
    incompleteType: 'missing_check_out' | 'missing_check_in';
  }> = [];
  
  for (const [workerIdStr, wd] of Object.entries(dayData)) {
    const wId = Number(workerIdStr);
    const workerEvent = events.find(e => e.workerId === wId);
    if (!workerEvent) continue;
    
    const hasCheckIn = !!wd.checkIn;
    const hasCheckOut = !!wd.checkOut;
    
    if (hasCheckIn && !hasCheckOut) {
      // Has check-in but no check-out
      incompleteRecords.push({
        workerId: wId,
        workerCode: workerEvent.workerCode,
        workerName: workerEvent.workerName,
        groupId: workerEvent.groupId,
        groupName: workerEvent.groupName || 'N/A',
        checkInId: wd.checkIn.id,
        checkInTime: wd.checkIn.eventTime,
        checkOutId: null,
        checkOutTime: null,
        incompleteType: 'missing_check_out',
      });
    } else if (!hasCheckIn && hasCheckOut) {
      // Has check-out but no check-in (orphan check-out)
      incompleteRecords.push({
        workerId: wId,
        workerCode: workerEvent.workerCode,
        workerName: workerEvent.workerName,
        groupId: workerEvent.groupId,
        groupName: workerEvent.groupName || 'N/A',
        checkInId: null,
        checkInTime: null,
        checkOutId: wd.checkOut.id,
        checkOutTime: wd.checkOut.eventTime,
        incompleteType: 'missing_check_in',
      });
    }
    // Workers with both checkIn and checkOut are complete, skip
  }
  
  return incompleteRecords;
}

/**
 * Check if there are any incomplete attendance records for a date range
 * Used before creating payroll batches to ensure all attendance is complete
 */
export async function checkIncompleteAttendanceForPeriod(
  startDate: Date,
  endDate: Date
): Promise<{
  hasIncomplete: boolean;
  incompleteCount: number;
  incompleteRecords: Array<{
    date: string;
    workerCode: string;
    workerName: string;
    incompleteType: string;
  }>;
}> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const incompleteRecords: Array<{
    date: string;
    workerCode: string;
    workerName: string;
    incompleteType: string;
  }> = [];
  
  // Check each date in the range
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dayIncomplete = await getIncompleteAttendance(currentDate);
    
    for (const record of dayIncomplete) {
      incompleteRecords.push({
        date: currentDate.toLocaleDateString('en-CA'),
        workerCode: record.workerCode,
        workerName: record.workerName,
        incompleteType: record.incompleteType === 'missing_check_out' 
          ? 'حضور بدون انصراف' 
          : 'انصراف بدون حضور',
      });
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return {
    hasIncomplete: incompleteRecords.length > 0,
    incompleteCount: incompleteRecords.length,
    incompleteRecords,
  };
}

/**
 * Check if there are any incomplete attendance records for a date range and cost center
 * Used before creating payroll batches to ensure all attendance for the same period/cost center is complete
 */
export async function checkIncompleteAttendanceForPeriodAndCostCenter(
  startDate: Date,
  endDate: Date,
  costCenterId: number | null,
  groupIds?: number[] // ✅ إذا حُددت، يُقصر الفحص على هذه المجموعات فقط بدل كل مركز التكلفة
): Promise<{
  hasIncomplete: boolean;
  incompleteCount: number;
  incompleteRecords: Array<{
    date: string;
    workerCode: string;
    workerName: string;
    incompleteType: string;
  }>;
}> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const incompleteRecords: Array<{
    date: string;
    workerCode: string;
    workerName: string;
    incompleteType: string;
  }> = [];
  
  // Check each date in the range
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dayIncomplete = await getIncompleteAttendance(currentDate);
    
    for (const record of dayIncomplete) {
      // Filter using the worker's effective group for this exact day, not the base group.
      if (costCenterId) {
        const dateStr = currentDate.toLocaleDateString('en-CA');
        const effectiveGroupId = await getEffectiveGroupForWorkerOnDate(record.workerId, dateStr);
        if (!effectiveGroupId) continue;

        const [effectiveGroup] = await db
          .select({ costCenterId: groups.costCenterId })
          .from(groups)
          .where(eq(groups.id, effectiveGroupId))
          .limit(1);

        if (!effectiveGroup || effectiveGroup.costCenterId !== costCenterId) continue;
        if (groupIds && groupIds.length > 0 && !groupIds.includes(effectiveGroupId)) continue;
      }
      
      incompleteRecords.push({
        date: currentDate.toLocaleDateString('en-CA'),
        workerCode: record.workerCode,
        workerName: record.workerName,
        incompleteType: record.incompleteType === 'missing_check_out' 
          ? 'حضور بدون انصراف' 
          : 'انصراف بدون حضور',
      });
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return {
    hasIncomplete: incompleteRecords.length > 0,
    incompleteCount: incompleteRecords.length,
    incompleteRecords,
  };
}

// دالة مؤقتة لإضافتها إلى server/db.ts
export async function getAbsentWorkers(workDate: Date, groupId?: number) {
  const db = await getDb();
  if (!db) return [];
  


  // Convert workDate to date string properly (workDate may be a Date object from tRPC)
  const dateStr = workDate instanceof Date 
    ? workDate.toLocaleDateString('en-CA') 
    : String(workDate).split('T')[0];
  // Use administrative work_date (5 AM boundary) instead of calendar date

  // Get all workers (optionally filtered by group)
  const workerConditions = [eq(workers.status, 'active')];
  if (groupId) {
    workerConditions.push(eq(workers.groupId, groupId));
  }
  
  const allWorkers = await db
    .select({
      workerId: workers.id,
      workerCode: workers.code,
      workerName: workers.fullName,
      groupId: workers.groupId,
      groupName: groups.name,
    })
    .from(workers)
    .leftJoin(groups, eq(workers.groupId, groups.id))
    .where(and(...workerConditions));


  // Get workers who have check_in records for this administrative date
  const workersWithAttendance = await db
    .select({
      workerId: attendanceEvents.workerId,
    })
    .from(attendanceEvents)
    .where(
      and(
        eq(attendanceEvents.workDate, sql`${dateStr}`),
        eq(attendanceEvents.eventType, 'check_in')
      )
    )
    .groupBy(attendanceEvents.workerId);

  const workerIdsWithAttendance = new Set(
    workersWithAttendance.map((w) => w.workerId)
  );


  // Filter out workers who have attendance
  const absentWorkers = allWorkers.filter(
    (worker) => !workerIdsWithAttendance.has(worker.workerId)
  );


  return absentWorkers;
}


