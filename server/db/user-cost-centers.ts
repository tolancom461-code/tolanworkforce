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
  userOperationGroups,
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
import { getDb } from './connection';

// ============================================
// User Cost Centers + Operational Group Scope (RBAC)
// ============================================

export type UserOperationCenterScopeInput = {
  costCenterId: number;
  allGroups: boolean;
  groupIds: number[];
};

export async function assignUserCostCenters(userId: number, costCenterIds: number[], tx?: any) {
  const database = tx ?? (await getDb());
  if (!database) throw new Error('Database not available');

  // هذا المسار القديم يعني: كل مجموعات كل مركز محدد، حفاظاً على التوافق.
  await database.delete(userOperationGroups).where(eq(userOperationGroups.userId, userId));
  await database.delete(userCostCenters).where(eq(userCostCenters.userId, userId));

  const uniqueIds = Array.from(new Set(costCenterIds.map(Number).filter(Boolean)));
  if (uniqueIds.length > 0) {
    await database.insert(userCostCenters).values(
      uniqueIds.map(costCenterId => ({
        userId,
        costCenterId,
        allGroups: 1,
      }))
    );
  }

  return { success: true };
}

export async function assignUserOperationScope(
  userId: number,
  scopes: UserOperationCenterScopeInput[],
  tx?: any
) {
  const database = tx ?? (await getDb());
  if (!database) throw new Error('Database not available');

  const byCenter = new Map<number, UserOperationCenterScopeInput>();
  for (const raw of scopes) {
    const costCenterId = Number(raw.costCenterId);
    if (!costCenterId) continue;
    const groupIds = Array.from(new Set((raw.groupIds || []).map(Number).filter(Boolean)));
    byCenter.set(costCenterId, {
      costCenterId,
      allGroups: !!raw.allGroups,
      groupIds,
    });
  }
  const normalized = Array.from(byCenter.values());

  const explicitPairs = normalized.flatMap(scope =>
    scope.allGroups ? [] : scope.groupIds.map(groupId => ({ costCenterId: scope.costCenterId, groupId }))
  );
  if (explicitPairs.length > 0) {
    const requestedGroupIds = Array.from(new Set(explicitPairs.map(row => row.groupId)));
    const groupRows = await database
      .select({ id: groups.id, costCenterId: groups.costCenterId, isActive: groups.isActive })
      .from(groups)
      .where(inArray(groups.id, requestedGroupIds));
    const groupById = new Map(groupRows.map((row: any) => [Number(row.id), row]));

    for (const pair of explicitPairs) {
      const group = groupById.get(pair.groupId) as any;
      if (!group) throw new Error(`المجموعة رقم ${pair.groupId} غير موجودة`);
      if (Number(group.costCenterId) !== pair.costCenterId) {
        throw new Error('إحدى المجموعات المحددة لا تتبع مركز التكلفة المختار');
      }
      if (!group.isActive) throw new Error('لا يمكن منح صلاحية على مجموعة غير نشطة');
    }
  }

  for (const scope of normalized) {
    if (!scope.allGroups && scope.groupIds.length === 0) {
      throw new Error('اختر مجموعة واحدة على الأقل أو اختر كل المجموعات');
    }
  }

  await database.delete(userOperationGroups).where(eq(userOperationGroups.userId, userId));
  await database.delete(userCostCenters).where(eq(userCostCenters.userId, userId));

  if (normalized.length > 0) {
    await database.insert(userCostCenters).values(
      normalized.map(scope => ({
        userId,
        costCenterId: scope.costCenterId,
        allGroups: scope.allGroups ? 1 : 0,
      }))
    );

    const explicitGroupIds = Array.from(new Set(
      normalized.flatMap(scope => scope.allGroups ? [] : scope.groupIds)
    ));
    if (explicitGroupIds.length > 0) {
      await database.insert(userOperationGroups).values(
        explicitGroupIds.map(groupId => ({ userId, groupId }))
      );
    }
  }

  return { success: true };
}

export async function getUserCostCenters(userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return await db
    .select({
      id: userCostCenters.id,
      costCenterId: userCostCenters.costCenterId,
      costCenterCode: costCenters.code,
      costCenterName: costCenters.name,
      allGroups: userCostCenters.allGroups,
    })
    .from(userCostCenters)
    .innerJoin(costCenters, eq(userCostCenters.costCenterId, costCenters.id))
    .where(eq(userCostCenters.userId, userId));
}

export async function getUserCostCenterIds(userId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const results = await db
    .select({ costCenterId: userCostCenters.costCenterId })
    .from(userCostCenters)
    .where(eq(userCostCenters.userId, userId));

  return results.map(r => r.costCenterId);
}

export async function getUserOperationScope(userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const centers = await getUserCostCenters(userId);
  if (centers.length === 0) return [];

  const explicitGroups = await db
    .select({
      groupId: userOperationGroups.groupId,
      costCenterId: groups.costCenterId,
    })
    .from(userOperationGroups)
    .innerJoin(groups, eq(userOperationGroups.groupId, groups.id))
    .where(eq(userOperationGroups.userId, userId));

  const groupIdsByCenter = new Map<number, number[]>();
  for (const row of explicitGroups) {
    if (!row.costCenterId) continue;
    const list = groupIdsByCenter.get(row.costCenterId) || [];
    list.push(row.groupId);
    groupIdsByCenter.set(row.costCenterId, list);
  }

  return centers.map(center => ({
    ...center,
    allGroups: !!center.allGroups,
    groupIds: center.allGroups ? [] : (groupIdsByCenter.get(center.costCenterId) || []),
  }));
}
