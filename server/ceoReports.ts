import { eq, and, inArray, gte, lte, asc } from "drizzle-orm";
import { getDb } from "./db";

export async function getCeoReportsData(
  periodStart: string,
  periodEnd: string,
  costCenterIds?: number[],
  groupIds?: number[]
) {
  const db = await getDb();
  if (!db) return [];

  const { workers, groups, payrollBatches, payrollBatchItems } =
    await import("../drizzle/schema");

  const startDateStr = periodStart.split("T")[0];
  const endDateStr = periodEnd.split("T")[0];

  const conditions = [
    lte(payrollBatches.periodStart, endDateStr),
    gte(payrollBatches.periodEnd, startDateStr),
    inArray(payrollBatches.status, ["approved", "paid"]),
  ];

  if (costCenterIds && costCenterIds.length > 0) {
    conditions.push(inArray(groups.costCenterId, costCenterIds));
  }

  const batchItems = await db
    .select({
      groupId: groups.id,
      groupName: groups.name,
      costCenterId: groups.costCenterId,
      workerId: payrollBatchItems.workerId,
      baseAmount: payrollBatchItems.baseAmount,
      totalDeductions: payrollBatchItems.totalDeductions,
      totalBonuses: payrollBatchItems.totalBonuses,
      netAmount: payrollBatchItems.netAmount,
    })
    .from(payrollBatchItems)
    .innerJoin(payrollBatches, eq(payrollBatchItems.batchId, payrollBatches.id))
    .innerJoin(workers, eq(payrollBatchItems.workerId, workers.id))
    .innerJoin(groups, eq(payrollBatchItems.groupId, groups.id))
    .where(and(...conditions));

  const groupMap = new Map<
    number,
    {
      groupName: string;
      costCenterId: number;
      workerIds: Set<number>;
      totalSalary: number;
      totalDeductions: number;
      totalBonuses: number;
      totalNet: number;
    }
  >();

  batchItems.forEach(row => {
    if (groupIds && groupIds.length > 0 && !groupIds.includes(row.groupId))
      return;
    if (row.costCenterId === null) return;

    const existing = groupMap.get(row.groupId);
    const base = parseFloat(row.baseAmount || "0");
    const deductions = parseFloat(row.totalDeductions || "0");
    const bonuses = parseFloat(row.totalBonuses || "0");
    const net = parseFloat(row.netAmount || "0");

    if (existing) {
      existing.totalSalary += base;
      existing.totalDeductions += deductions;
      existing.totalBonuses += bonuses;
      existing.totalNet += net;
      existing.workerIds.add(row.workerId);
    } else {
      groupMap.set(row.groupId, {
        groupName: row.groupName,
        costCenterId: row.costCenterId,
        workerIds: new Set([row.workerId]),
        totalSalary: base,
        totalDeductions: deductions,
        totalBonuses: bonuses,
        totalNet: net,
      });
    }
  });

  return Array.from(groupMap.entries()).map(([groupId, data], index) => ({
    rowIndex: index + 1,
    groupId,
    groupName: data.groupName,
    costCenterId: data.costCenterId,
    workerCount: data.workerIds.size,
    totalSalary: data.totalSalary,
    totalDeductions: data.totalDeductions,
    totalBonuses: data.totalBonuses,
    totalNet: data.totalNet,
  }));
}

export async function getCeoReportsGroups(costCenterIds?: number[]) {
  const db = await getDb();
  if (!db) return [];

  const { groups } = await import("../drizzle/schema");

  if (costCenterIds && costCenterIds.length > 0) {
    return await db
      .select({
        id: groups.id,
        name: groups.name,
        costCenterId: groups.costCenterId,
      })
      .from(groups)
      .where(inArray(groups.costCenterId, costCenterIds));
  }

  return await db
    .select({
      id: groups.id,
      name: groups.name,
      costCenterId: groups.costCenterId,
    })
    .from(groups);
}

export async function getCeoReportSignatures(
  periodStart: string,
  periodEnd: string,
  costCenterIds: number[],
  groupIds?: number[]
) {
  const db = await getDb();
  if (!db) return [];

  const { groups, payrollBatches, payrollBatchItems, auditLog, users } =
    await import("../drizzle/schema");

  if (groupIds && groupIds.length === 0) return [];

  const startDateStr = periodStart.split("T")[0];
  const endDateStr = periodEnd.split("T")[0];
  const conditions = [
    lte(payrollBatches.periodStart, endDateStr),
    gte(payrollBatches.periodEnd, startDateStr),
    inArray(payrollBatches.status, ["approved", "paid"]),
    inArray(groups.costCenterId, costCenterIds),
  ];

  if (groupIds && groupIds.length > 0) {
    conditions.push(inArray(groups.id, groupIds));
  }

  const batchGroups = await db
    .selectDistinct({
      batchId: payrollBatches.id,
      groupId: groups.id,
      costCenterId: groups.costCenterId,
    })
    .from(payrollBatchItems)
    .innerJoin(payrollBatches, eq(payrollBatchItems.batchId, payrollBatches.id))
    .innerJoin(groups, eq(payrollBatchItems.groupId, groups.id))
    .where(and(...conditions));

  const batchIds = Array.from(new Set(batchGroups.map(row => row.batchId)));
  if (batchIds.length === 0) return [];

  const workflowActions = [
    "SUBMIT_PAYROLL_FOR_REVIEW",
    "ACCOUNTANT_APPROVE_PAYROLL",
    "SUBMIT_TO_FINAL_REVIEW",
    "AUDITOR_APPROVE_PAYROLL",
    "SUBMIT_FOR_APPROVAL",
    "SUBMIT_FOR_APPROVAL_SKIP_ACCOUNTANT",
    "FM_APPROVE_PAYROLL",
    "APPROVE_BATCH_FINAL",
  ];

  const workflowEvents = await db
    .select({
      id: auditLog.id,
      batchId: auditLog.recordId,
      action: auditLog.action,
      fullName: users.fullName,
    })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.userId, users.id))
    .where(
      and(
        eq(auditLog.tableName, "payroll_batches"),
        inArray(auditLog.recordId, batchIds),
        inArray(auditLog.action, workflowActions)
      )
    )
    .orderBy(asc(auditLog.id));

  type BatchSignatures = {
    prepared?: string;
    firstReview?: string;
    financialReviewer?: string;
    accountsManager?: string;
  };

  const signaturesByBatch = new Map<number, BatchSignatures>();

  for (const event of workflowEvents) {
    if (event.batchId === null) continue;
    const fullName = event.fullName?.trim() || undefined;

    if (event.action === "SUBMIT_PAYROLL_FOR_REVIEW") {
      // بداية دورة اعتماد جديدة: أي تواقيع من دورة سابقة لا تخص النسخة الحالية.
      signaturesByBatch.set(event.batchId, {
        prepared: fullName,
      });
      continue;
    }

    const state = signaturesByBatch.get(event.batchId) ?? {};
    if (
      event.action === "ACCOUNTANT_APPROVE_PAYROLL" ||
      event.action === "SUBMIT_TO_FINAL_REVIEW"
    ) {
      state.firstReview = fullName;
    } else if (
      event.action === "AUDITOR_APPROVE_PAYROLL" ||
      event.action === "SUBMIT_FOR_APPROVAL" ||
      event.action === "SUBMIT_FOR_APPROVAL_SKIP_ACCOUNTANT"
    ) {
      state.financialReviewer = fullName;
    } else if (
      event.action === "FM_APPROVE_PAYROLL" ||
      event.action === "APPROVE_BATCH_FINAL"
    ) {
      state.accountsManager = fullName;
    }
    signaturesByBatch.set(event.batchId, state);
  }

  const result = new Map<
    number,
    {
      groupId: number;
      costCenterId: number;
      preparedNames: string[];
      firstReviewNames: string[];
      financialReviewerNames: string[];
      accountsManagerNames: string[];
    }
  >();

  const addUnique = (target: string[], value?: string) => {
    if (value && !target.includes(value)) target.push(value);
  };

  for (const row of batchGroups) {
    if (row.costCenterId === null) continue;
    const batchSignatures = signaturesByBatch.get(row.batchId);
    const current = result.get(row.groupId) ?? {
      groupId: row.groupId,
      costCenterId: row.costCenterId,
      preparedNames: [],
      firstReviewNames: [],
      financialReviewerNames: [],
      accountsManagerNames: [],
    };

    addUnique(current.preparedNames, batchSignatures?.prepared);
    addUnique(current.firstReviewNames, batchSignatures?.firstReview);
    addUnique(
      current.financialReviewerNames,
      batchSignatures?.financialReviewer
    );
    addUnique(current.accountsManagerNames, batchSignatures?.accountsManager);
    result.set(row.groupId, current);
  }

  return Array.from(result.values());
}

