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
  operationalDepartments,
  dailyWorkAssignments
} from "../../drizzle/schema";
import { sendNotification, sendNotificationToRoles, notifyStageAndAdmins, ADMIN_OWNER_ROLES } from '../notifications';
import { getRoleLabel } from '../permissions';
import { inArray, isNull, isNotNull, between } from "drizzle-orm";
import type { Worker as DbWorker } from "../../drizzle/schema";
import { ENV } from '../_core/env';
import { getDb } from './connection';

// ============================================
// تقرير تغطية المجموعات (المجموعات التي فاتها إنشاء دفعة رواتب)
// ============================================

/**
 * لكل مجموعة لديها حضور فعلي: يقارن "آخر يوم شملته أي دفعة رواتب" بـ"آخر يوم حضور فعلي مسجَّل"
 * ويعرض فقط المجموعات التي لديها فجوة (أيام عمل حقيقية لم تُدرج بعد في أي دفعة).
 * إذا لم يُنشأ لها أي دفعة إطلاقاً من قبل، تُحسب الفجوة من أول يوم حضور مسجَّل لها في النظام.
 */
export async function getGroupCoverageReport(filters?: {
  startDate?: string;
  endDate?: string;
  groupId?: number;
  costCenterId?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const groupConditions = [];
  if (filters?.groupId) groupConditions.push(eq(groups.id, filters.groupId));
  if (filters?.costCenterId) groupConditions.push(eq(groups.costCenterId, filters.costCenterId));

  const allGroups = await db
    .select({
      id: groups.id,
      name: groups.name,
      costCenterId: groups.costCenterId,
      costCenterName: costCenters.name,
    })
    .from(groups)
    .leftJoin(costCenters, eq(groups.costCenterId, costCenters.id))
    .where(groupConditions.length > 0 ? and(...groupConditions) : undefined);

  if (allGroups.length === 0) return [];

  const groupIds = allGroups.map(g => g.id);

  // ✅ كل فترات كل الدفعات (غير المرفوضة نهائياً) لكل مجموعة — وليس آخر دفعة فقط
  const batchRows = await db
    .select({
      groupId: payrollBatchItems.groupId,
      periodStart: payrollBatches.periodStart,
      periodEnd: payrollBatches.periodEnd,
    })
    .from(payrollBatchItems)
    .innerJoin(payrollBatches, eq(payrollBatchItems.batchId, payrollBatches.id))
    .where(
      and(
        inArray(payrollBatchItems.groupId, groupIds),
        ne(payrollBatches.status, 'rejected_final')
      )
    );

  const batchRangesByGroup = new Map<number, Array<{ start: string; end: string }>>();
  for (const row of batchRows) {
    if (!row.groupId) continue;
    const ranges = batchRangesByGroup.get(row.groupId) || [];
    ranges.push({ start: row.periodStart, end: row.periodEnd });
    batchRangesByGroup.set(row.groupId, ranges);
  }

  // كل أيام الحضور الفعلي (فيها بصمة حضور حقيقية) لكل مجموعة، ضمن فترة الفلترة إن حُددت
  const attendanceConditions = [
    inArray(workers.groupId, groupIds),
    isNotNull(workerDailyFinance.checkInTime),
  ];
  if (filters?.startDate) attendanceConditions.push(gte(workerDailyFinance.workDate, filters.startDate));
  if (filters?.endDate) attendanceConditions.push(lte(workerDailyFinance.workDate, filters.endDate));

  const attendanceRows = await db
    .select({
      groupId: workers.groupId,
      workDate: workerDailyFinance.workDate,
    })
    .from(workerDailyFinance)
    .innerJoin(workers, eq(workerDailyFinance.workerId, workers.id))
    .where(and(...attendanceConditions));

  const datesByGroup = new Map<number, Set<string>>();
  for (const row of attendanceRows) {
    if (!row.groupId) continue;
    const dates = datesByGroup.get(row.groupId) || new Set<string>();
    dates.add(row.workDate);
    datesByGroup.set(row.groupId, dates);
  }

  // هل هذا اليوم مُغطى بأي دفعة (بغض النظر عن ترتيبها الزمني)؟
  const isDateCovered = (ranges: Array<{ start: string; end: string }>, date: string) =>
    ranges.some(r => date >= r.start && date <= r.end);

  const results: Array<{
    groupId: number;
    groupName: string;
    costCenterId: number | null;
    costCenterName: string | null;
    missingDates: string[]; // كل يوم فيه حضور فعلي ولم يُدرج ضمن أي دفعة، مرتب تصاعدياً
  }> = [];

  for (const g of allGroups) {
    const dates = datesByGroup.get(g.id);
    if (!dates || dates.size === 0) continue; // لا يوجد أي حضور لهذه المجموعة إطلاقاً — لا داعي لعرضها

    const ranges = batchRangesByGroup.get(g.id) || [];
    const missingDates = Array.from(dates)
      .filter(d => !isDateCovered(ranges, d))
      .sort((a, b) => a.localeCompare(b));

    if (missingDates.length === 0) continue; // كل أيامها مُغطاة، لا داعي لعرضها

    results.push({
      groupId: g.id,
      groupName: g.name,
      costCenterId: g.costCenterId,
      costCenterName: g.costCenterName,
      missingDates,
    });
  }

  results.sort((a, b) => b.missingDates.length - a.missingDates.length);
  return results;
}

export async function getAllOperationalDepartments(includeInactive = false) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: operationalDepartments.id,
      name: operationalDepartments.name,
      isActive: operationalDepartments.isActive,
      createdAt: operationalDepartments.createdAt,
      updatedAt: operationalDepartments.updatedAt,
    })
    .from(operationalDepartments)
    .where(includeInactive ? undefined : eq(operationalDepartments.isActive, 1))
    .orderBy(operationalDepartments.name);
}

export async function createOperationalDepartment(name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const trimmed = name.trim();
  if (!trimmed) throw new Error("اسم القسم التشغيلي مطلوب");

  const existing = await db
    .select({ id: operationalDepartments.id })
    .from(operationalDepartments)
    .where(eq(operationalDepartments.name, trimmed))
    .limit(1);
  if (existing.length > 0) throw new Error("يوجد قسم تشغيلي بنفس الاسم مسبقاً");

  const result = await db.insert(operationalDepartments).values({ name: trimmed });
  return { id: (result as any).insertId, name: trimmed };
}

export async function updateOperationalDepartment(id: number, params: { name?: string; isActive?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [current] = await db
    .select()
    .from(operationalDepartments)
    .where(eq(operationalDepartments.id, id))
    .limit(1);
  if (!current) throw new Error("القسم التشغيلي غير موجود");

  const updateData: any = {};
  if (params.name !== undefined) {
    const trimmed = params.name.trim();
    if (!trimmed) throw new Error("اسم القسم التشغيلي مطلوب");
    const duplicate = await db
      .select({ id: operationalDepartments.id })
      .from(operationalDepartments)
      .where(and(eq(operationalDepartments.name, trimmed), ne(operationalDepartments.id, id)))
      .limit(1);
    if (duplicate.length > 0) throw new Error("يوجد قسم تشغيلي بنفس الاسم مسبقاً");
    updateData.name = trimmed;
  }
  if (params.isActive !== undefined) updateData.isActive = params.isActive ? 1 : 0;

  if (Object.keys(updateData).length > 0) {
    await db.update(operationalDepartments).set(updateData).where(eq(operationalDepartments.id, id));
  }
  return { success: true };
}

export async function deleteOperationalDepartment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const linkedSite = await db
    .select({ id: restaurants.id })
    .from(restaurants)
    .where(eq(restaurants.operationalDepartmentId, id))
    .limit(1);
  if (linkedSite.length > 0) {
    throw new Error("لا يمكن حذف قسم مرتبط بمواقع تشغيل. غيّر ربط المواقع أولاً");
  }

  await db.delete(operationalDepartments).where(eq(operationalDepartments.id, id));
  return { success: true };
}

export async function getAllRestaurants(includeInactive = false, costCenterId?: number) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (!includeInactive) conditions.push(eq(restaurants.isActive, 1));
  if (costCenterId) conditions.push(eq(restaurants.costCenterId, costCenterId));

  return await db
    .select({
      id: restaurants.id,
      name: restaurants.name,
      costCenterId: restaurants.costCenterId,
      costCenterName: costCenters.name,
      operationalDepartmentId: restaurants.operationalDepartmentId,
      operationalDepartmentName: operationalDepartments.name,
      operationalDepartmentActive: operationalDepartments.isActive,
      siteType: restaurants.siteType,
      isActive: restaurants.isActive,
      createdAt: restaurants.createdAt,
      updatedAt: restaurants.updatedAt,
    })
    .from(restaurants)
    .leftJoin(costCenters, eq(restaurants.costCenterId, costCenters.id))
    .leftJoin(operationalDepartments, eq(restaurants.operationalDepartmentId, operationalDepartments.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(costCenters.name, operationalDepartments.name, restaurants.name);
}

export async function createRestaurant(params: {
  name: string;
  costCenterId?: number | null;
  operationalDepartmentId?: number | null;
  siteType?: 'restaurant' | 'site';
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const trimmed = params.name.trim();
  if (!trimmed) throw new Error("اسم موقع التشغيل مطلوب");

  if (params.costCenterId) {
    const [costCenter] = await db
      .select({ id: costCenters.id })
      .from(costCenters)
      .where(eq(costCenters.id, params.costCenterId))
      .limit(1);
    if (!costCenter) throw new Error("مركز التكلفة غير موجود");
  }

  if (params.operationalDepartmentId) {
    const [department] = await db
      .select({ id: operationalDepartments.id, isActive: operationalDepartments.isActive })
      .from(operationalDepartments)
      .where(eq(operationalDepartments.id, params.operationalDepartmentId))
      .limit(1);
    if (!department) throw new Error("القسم التشغيلي غير موجود");
    if (!department.isActive) throw new Error("القسم التشغيلي غير نشط");
  }

  const duplicateConditions = [eq(restaurants.name, trimmed)];
  if (params.costCenterId) duplicateConditions.push(eq(restaurants.costCenterId, params.costCenterId));
  else duplicateConditions.push(isNull(restaurants.costCenterId));

  const existing = await db
    .select({ id: restaurants.id })
    .from(restaurants)
    .where(and(...duplicateConditions))
    .limit(1);
  if (existing.length > 0) {
    throw new Error(params.costCenterId
      ? "يوجد موقع تشغيل بنفس الاسم في مركز التكلفة مسبقاً"
      : "يوجد موقع تشغيل غير مرتبط بنفس الاسم مسبقاً");
  }

  const result = await db.insert(restaurants).values({
    name: trimmed,
    costCenterId: params.costCenterId || null,
    operationalDepartmentId: params.operationalDepartmentId || null,
    siteType: params.siteType || 'site',
  });
  return { id: (result as any).insertId, name: trimmed };
}

export async function updateRestaurant(id: number, params: {
  name?: string;
  costCenterId?: number | null;
  operationalDepartmentId?: number | null;
  siteType?: 'restaurant' | 'site';
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [current] = await db.select().from(restaurants).where(eq(restaurants.id, id)).limit(1);
  if (!current) throw new Error("موقع التشغيل غير موجود");

  const updateData: any = {};
  const nextName = params.name !== undefined ? params.name.trim() : current.name;
  const nextCostCenterId = params.costCenterId !== undefined ? params.costCenterId : current.costCenterId;

  if (!nextName) throw new Error("اسم موقع التشغيل مطلوب");

  if (params.costCenterId !== undefined && params.costCenterId !== null) {
    const [costCenter] = await db
      .select({ id: costCenters.id })
      .from(costCenters)
      .where(eq(costCenters.id, params.costCenterId))
      .limit(1);
    if (!costCenter) throw new Error("مركز التكلفة غير موجود");
  }

  if (params.operationalDepartmentId !== undefined && params.operationalDepartmentId !== null) {
    const [department] = await db
      .select({ id: operationalDepartments.id, isActive: operationalDepartments.isActive })
      .from(operationalDepartments)
      .where(eq(operationalDepartments.id, params.operationalDepartmentId))
      .limit(1);
    if (!department) throw new Error("القسم التشغيلي غير موجود");
    if (!department.isActive) throw new Error("القسم التشغيلي غير نشط");
  }

  if (params.costCenterId !== undefined && current.costCenterId !== params.costCenterId) {
    const [historicalAssignment] = await db
      .select({ id: dailyWorkAssignments.id })
      .from(dailyWorkAssignments)
      .where(eq(dailyWorkAssignments.restaurantId, id))
      .limit(1);
    if (historicalAssignment) {
      throw new Error("لا يمكن تغيير مركز تكلفة موقع لديه سجلات تشغيل سابقة. عطّل الموقع وأنشئ موقعاً جديداً للحفاظ على التاريخ");
    }
  }

  if (params.name !== undefined || params.costCenterId !== undefined) {
    const duplicateConditions = [eq(restaurants.name, nextName), ne(restaurants.id, id)];
    if (nextCostCenterId) duplicateConditions.push(eq(restaurants.costCenterId, nextCostCenterId));
    else duplicateConditions.push(isNull(restaurants.costCenterId));

    const duplicate = await db
      .select({ id: restaurants.id })
      .from(restaurants)
      .where(and(...duplicateConditions))
      .limit(1);
    if (duplicate.length > 0) {
      throw new Error(nextCostCenterId
        ? "يوجد موقع تشغيل بنفس الاسم في مركز التكلفة مسبقاً"
        : "يوجد موقع تشغيل غير مرتبط بنفس الاسم مسبقاً");
    }
  }

  if (params.name !== undefined) updateData.name = nextName;
  if (params.costCenterId !== undefined) updateData.costCenterId = params.costCenterId;
  if (params.operationalDepartmentId !== undefined) updateData.operationalDepartmentId = params.operationalDepartmentId;
  if (params.siteType !== undefined) updateData.siteType = params.siteType;
  if (params.isActive !== undefined) updateData.isActive = params.isActive ? 1 : 0;

  if (Object.keys(updateData).length > 0) {
    await db.update(restaurants).set(updateData).where(eq(restaurants.id, id));
  }
  return { success: true };
}


export async function deleteRestaurant(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // لا نحذف نهائياً إن كان للموقع تعيينات سابقة؛ نحافظ على التاريخ ونوقفه فقط.
  const hasAssignments = await db
    .select({ id: dailyWorkAssignments.id })
    .from(dailyWorkAssignments)
    .where(eq(dailyWorkAssignments.restaurantId, id))
    .limit(1);

  if (hasAssignments.length > 0) {
    await db.update(restaurants).set({ isActive: 0 }).where(eq(restaurants.id, id));
    return { success: true, softDeleted: true };
  }

  await db.delete(restaurants).where(eq(restaurants.id, id));
  return { success: true, softDeleted: false };
}

