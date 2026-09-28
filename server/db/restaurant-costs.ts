import { and, eq, gte, inArray, lte } from 'drizzle-orm';
import {
  attendanceEvents,
  costCenters,
  dailyWorkAssignments,
  groups,
  payrollBatchItems,
  payrollBatches,
  restaurants,
  temporaryAssignments,
  workerDailyFinance,
  workers,
} from '../../drizzle/schema';
import { getDb } from './connection';

type ReportFilters = {
  siteCostCenterId?: number;
  sourceGroupId?: number;
  siteId?: number;
  workerId?: number;
};

type AllocationRow = {
  workerId: number;
  workerName: string;
  workerCode: string;
  workDate: string;
  cost: number;
  siteId: number | null;
  siteName: string | null;
  siteType: 'restaurant' | 'site' | null;
  siteCostCenterId: number | null;
  siteCostCenterName: string | null;
  sourceGroupId: number | null;
  sourceGroupName: string | null;
  sourceCostCenterId: number | null;
  sourceCostCenterName: string | null;
  operationalGroupId: number | null;
  operationalGroupName: string | null;
  operationalCostCenterId: number | null;
  operationalCostCenterName: string | null;
};

const money = (value: number) => Math.round(value * 100) / 100;

function allocateExactAmount(
  totalAmount: number,
  entries: Array<{ date: string; weight: number }>
): Map<string, number> {
  const result = new Map<string, number>();
  if (!entries.length) return result;

  const totalCentsSigned = Math.round(totalAmount * 100);
  const sign = totalCentsSigned < 0 ? -1 : 1;
  const totalCents = Math.abs(totalCentsSigned);
  const hasPositiveWeights = entries.some((entry) => entry.weight > 0);
  const weights = entries.map((entry) => (hasPositiveWeights ? Math.max(0, entry.weight) : 1));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || entries.length;

  const allocations = entries.map((entry, index) => {
    const raw = (totalCents * weights[index]) / totalWeight;
    const cents = Math.floor(raw);
    return { date: entry.date, cents, remainder: raw - cents };
  });

  let remaining = totalCents - allocations.reduce((sum, allocation) => sum + allocation.cents, 0);
  const residualOrder = [...allocations].sort(
    (a, b) => b.remainder - a.remainder || a.date.localeCompare(b.date)
  );
  let index = 0;
  while (remaining > 0 && residualOrder.length > 0) {
    residualOrder[index % residualOrder.length].cents += 1;
    remaining -= 1;
    index += 1;
  }

  for (const allocation of allocations) {
    result.set(allocation.date, sign * allocation.cents / 100);
  }
  return result;
}

/**
 * تقرير تشغيل مالي يعتمد حصراً على payroll_batch_items لدفعات approved/paid.
 * المبلغ النهائي للعامل في الدفعة يوزّع على أيام نفس مركز تكلفة الدفعة فقط،
 * مع الحفاظ على مجموع netAmount المعتمد بالهللة، ثم يُنسب كل يوم لموقع التشغيل المسجل.
 */
export async function getRestaurantCostReport(
  startDate: string,
  endDate: string,
  filters: ReportFilters = {}
) {
  const db = await getDb();
  if (!db) {
    return {
      financialSource: 'approved_payroll_batches' as const,
      batchCount: 0,
      sites: [],
      unassigned: null,
      totals: { workerCount: 0, workDays: 0, totalCost: 0 },
    };
  }

  const batchConditions = [
    inArray(payrollBatches.status, ['approved', 'paid']),
    lte(payrollBatches.periodStart, endDate),
    gte(payrollBatches.periodEnd, startDate),
  ];
  if (filters.workerId) batchConditions.push(eq(payrollBatchItems.workerId, filters.workerId));

  const batchItems = await db
    .select({
      batchId: payrollBatches.id,
      batchCode: payrollBatches.batchCode,
      periodStart: payrollBatches.periodStart,
      periodEnd: payrollBatches.periodEnd,
      batchCostCenterId: payrollBatches.costCenterId,
      workerId: payrollBatchItems.workerId,
      batchGroupId: payrollBatchItems.groupId,
      netAmount: payrollBatchItems.netAmount,
    })
    .from(payrollBatchItems)
    .innerJoin(payrollBatches, eq(payrollBatchItems.batchId, payrollBatches.id))
    .where(and(...batchConditions));

  if (!batchItems.length) {
    return {
      financialSource: 'approved_payroll_batches' as const,
      batchCount: 0,
      sites: [],
      unassigned: null,
      totals: { workerCount: 0, workDays: 0, totalCost: 0 },
    };
  }

  const workerIds = [...new Set(batchItems.map((item) => item.workerId))];
  const minBatchDate = batchItems.reduce((min, item) => item.periodStart < min ? item.periodStart : min, batchItems[0].periodStart);
  const maxBatchDate = batchItems.reduce((max, item) => item.periodEnd > max ? item.periodEnd : max, batchItems[0].periodEnd);

  const [workerRows, attendanceRows, assignmentRows, financeRows, temporaryRows, groupRows] = await Promise.all([
    db
      .select({ id: workers.id, fullName: workers.fullName, code: workers.code, groupId: workers.groupId })
      .from(workers)
      .where(inArray(workers.id, workerIds)),
    db
      .select({ workerId: attendanceEvents.workerId, workDate: attendanceEvents.workDate })
      .from(attendanceEvents)
      .where(
        and(
          inArray(attendanceEvents.workerId, workerIds),
          eq(attendanceEvents.eventType, 'check_in'),
          gte(attendanceEvents.workDate, minBatchDate),
          lte(attendanceEvents.workDate, maxBatchDate)
        )
      ),
    db
      .select({
        workerId: dailyWorkAssignments.workerId,
        workDate: dailyWorkAssignments.workDate,
        siteId: dailyWorkAssignments.restaurantId,
        sourceGroupId: dailyWorkAssignments.sourceGroupId,
        operationalGroupId: dailyWorkAssignments.operationalGroupId,
        siteName: restaurants.name,
        siteType: restaurants.siteType,
        siteCostCenterId: restaurants.costCenterId,
        siteCostCenterName: costCenters.name,
      })
      .from(dailyWorkAssignments)
      .leftJoin(restaurants, eq(dailyWorkAssignments.restaurantId, restaurants.id))
      .leftJoin(costCenters, eq(restaurants.costCenterId, costCenters.id))
      .where(
        and(
          inArray(dailyWorkAssignments.workerId, workerIds),
          gte(dailyWorkAssignments.workDate, minBatchDate),
          lte(dailyWorkAssignments.workDate, maxBatchDate)
        )
      ),
    db
      .select({
        workerId: workerDailyFinance.workerId,
        workDate: workerDailyFinance.workDate,
      })
      .from(workerDailyFinance)
      .where(
        and(
          inArray(workerDailyFinance.workerId, workerIds),
          gte(workerDailyFinance.workDate, minBatchDate),
          lte(workerDailyFinance.workDate, maxBatchDate)
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
          inArray(temporaryAssignments.workerId, workerIds),
          eq(temporaryAssignments.status, 'active'),
          lte(temporaryAssignments.startDate, maxBatchDate),
          gte(temporaryAssignments.endDate, minBatchDate)
        )
      ),
    db
      .select({
        id: groups.id,
        name: groups.name,
        costCenterId: groups.costCenterId,
        costCenterName: costCenters.name,
      })
      .from(groups)
      .leftJoin(costCenters, eq(groups.costCenterId, costCenters.id)),
  ]);

  const workerMap = new Map(workerRows.map((worker) => [worker.id, worker]));
  const groupMap = new Map(groupRows.map((group) => [group.id, group]));

  const attendanceByWorker = new Map<number, Set<string>>();
  for (const row of attendanceRows) {
    if (!row.workDate) continue;
    const dates = attendanceByWorker.get(row.workerId) || new Set<string>();
    dates.add(row.workDate);
    attendanceByWorker.set(row.workerId, dates);
  }

  const assignmentByWorkerDate = new Map<string, (typeof assignmentRows)[number]>();
  const assignmentDatesByWorker = new Map<number, Set<string>>();
  for (const row of assignmentRows) {
    assignmentByWorkerDate.set(`${row.workerId}:${row.workDate}`, row);
    const dates = assignmentDatesByWorker.get(row.workerId) || new Set<string>();
    dates.add(row.workDate);
    assignmentDatesByWorker.set(row.workerId, dates);
  }

  const financeDatesByWorker = new Map<number, Set<string>>();
  for (const row of financeRows) {
    if (!row.workDate) continue;
    const dates = financeDatesByWorker.get(row.workerId) || new Set<string>();
    dates.add(row.workDate);
    financeDatesByWorker.set(row.workerId, dates);
  }

  const temporaryByWorker = new Map<number, typeof temporaryRows>();
  for (const row of temporaryRows) {
    const rows = temporaryByWorker.get(row.workerId) || [];
    rows.push(row);
    temporaryByWorker.set(row.workerId, rows);
  }

  const resolveEffectiveGroup = (workerId: number, workDate: string, fallbackGroupId: number | null) => {
    const assignment = assignmentByWorkerDate.get(`${workerId}:${workDate}`);
    if (assignment?.operationalGroupId) return assignment.operationalGroupId;

    const temporary = temporaryByWorker
      .get(workerId)
      ?.find((row) => row.startDate <= workDate && row.endDate >= workDate);
    return temporary?.toGroupId || assignment?.sourceGroupId || fallbackGroupId || null;
  };

  const allocations: AllocationRow[] = [];
  const financialOnlyRows: Array<{
    workerId: number;
    workerName: string;
    workerCode: string;
    sourceGroupLabel: string | null;
    cost: number;
  }> = [];
  let financialOnlyUnassignedCost = 0;
  const contributingBatchIds = new Set<number>();

  for (const item of batchItems) {
    const worker = workerMap.get(item.workerId);
    if (!worker) continue;

    const financeDates = [...(financeDatesByWorker.get(item.workerId) || new Set<string>())]
      .filter((date) => date >= item.periodStart && date <= item.periodEnd)
      .sort();
    const attendanceDates = [...(attendanceByWorker.get(item.workerId) || new Set<string>())]
      .filter((date) => date >= item.periodStart && date <= item.periodEnd)
      .sort();
    const fallbackAssignmentDates = [...(assignmentDatesByWorker.get(item.workerId) || new Set<string>())]
      .filter((date) => date >= item.periodStart && date <= item.periodEnd)
      .sort();
    const candidateDates = financeDates.length
      ? financeDates
      : attendanceDates.length
        ? attendanceDates
        : fallbackAssignmentDates;

    // A cost-center batch may contain only some days of a worker. Keep only the days whose
    // effective group belongs to the same cost center as the approved batch.
    const allocationDates = candidateDates.filter((workDate) => {
      const effectiveGroupId = resolveEffectiveGroup(
        item.workerId,
        workDate,
        worker.groupId || item.batchGroupId || null
      );
      const effectiveGroup = effectiveGroupId ? groupMap.get(effectiveGroupId) : undefined;

      if (item.batchCostCenterId && effectiveGroup?.costCenterId) {
        return effectiveGroup.costCenterId === item.batchCostCenterId;
      }
      return true;
    });

    const finalNet = Number(item.netAmount || 0);
    if (!allocationDates.length) {
      // لا توجد أيام يمكن ربطها تشغيلياً؛ لا نخترع موقعاً أو تاريخاً.
      const fallbackSourceGroupId = item.batchGroupId || worker.groupId || null;
      const matchesGroup = !filters.sourceGroupId || fallbackSourceGroupId === filters.sourceGroupId;
      const noSiteFilter = !filters.siteId && !filters.siteCostCenterId;
      if (matchesGroup && noSiteFilter && item.periodStart >= startDate && item.periodEnd <= endDate) {
        const fallbackSourceGroup = fallbackSourceGroupId ? groupMap.get(fallbackSourceGroupId) : undefined;
        contributingBatchIds.add(item.batchId);
        financialOnlyUnassignedCost += finalNet;
        financialOnlyRows.push({
          workerId: item.workerId,
          workerName: worker.fullName,
          workerCode: worker.code,
          sourceGroupLabel: fallbackSourceGroup
            ? `${fallbackSourceGroup.name}${fallbackSourceGroup.costCenterName ? ` — ${fallbackSourceGroup.costCenterName}` : ''}`
            : null,
          cost: finalNet,
        });
      }
      continue;
    }

    // Keep the phase-one report semantics (final approved amount spread across eligible work days),
    // but perform the split in integer cents so the full-period report always reconciles exactly.
    const allocatedCostByDate = allocateExactAmount(
      finalNet,
      allocationDates.map((workDate) => ({ date: workDate, weight: 1 }))
    );

    for (const workDate of allocationDates) {
      if (workDate < startDate || workDate > endDate) continue;

      const assignment = assignmentByWorkerDate.get(`${item.workerId}:${workDate}`);
      const sourceGroupId = assignment?.sourceGroupId || worker.groupId || item.batchGroupId || null;
      const operationalGroupId = resolveEffectiveGroup(item.workerId, workDate, sourceGroupId);
      const sourceGroup = sourceGroupId ? groupMap.get(sourceGroupId) : undefined;
      const operationalGroup = operationalGroupId ? groupMap.get(operationalGroupId) : undefined;

      if (filters.sourceGroupId && sourceGroupId !== filters.sourceGroupId) continue;
      if (filters.siteId && assignment?.siteId !== filters.siteId) continue;
      if (filters.siteCostCenterId && assignment?.siteCostCenterId !== filters.siteCostCenterId) continue;

      contributingBatchIds.add(item.batchId);
      allocations.push({
        workerId: item.workerId,
        workerName: worker.fullName,
        workerCode: worker.code,
        workDate,
        cost: allocatedCostByDate.get(workDate) || 0,
        siteId: assignment?.siteId || null,
        siteName: assignment?.siteName || null,
        siteType: assignment?.siteType || null,
        siteCostCenterId: assignment?.siteCostCenterId || null,
        siteCostCenterName: assignment?.siteCostCenterName || null,
        sourceGroupId,
        sourceGroupName: sourceGroup?.name || null,
        sourceCostCenterId: sourceGroup?.costCenterId || null,
        sourceCostCenterName: sourceGroup?.costCenterName || null,
        operationalGroupId,
        operationalGroupName: operationalGroup?.name || null,
        operationalCostCenterId: operationalGroup?.costCenterId || null,
        operationalCostCenterName: operationalGroup?.costCenterName || null,
      });
    }
  }

  type WorkerAgg = {
    workerId: number;
    workerName: string;
    workerCode: string;
    sourceGroups: Set<string>;
    operationalGroups: Set<string>;
    dates: string[];
    totalCost: number;
  };
  type SiteAgg = {
    siteId: number;
    siteName: string;
    siteType: 'restaurant' | 'site';
    siteCostCenterId: number | null;
    siteCostCenterName: string | null;
    workerIds: Set<number>;
    workDays: number;
    totalCost: number;
    workers: Map<number, WorkerAgg>;
  };

  const bySite = new Map<number, SiteAgg>();
  const unassignedWorkers = new Map<number, WorkerAgg>();
  const allWorkerIds = new Set<number>();
  let totalWorkDays = 0;
  let totalCost = 0;

  const addWorkerDay = (map: Map<number, WorkerAgg>, row: AllocationRow) => {
    let worker = map.get(row.workerId);
    if (!worker) {
      worker = {
        workerId: row.workerId,
        workerName: row.workerName,
        workerCode: row.workerCode,
        sourceGroups: new Set(),
        operationalGroups: new Set(),
        dates: [],
        totalCost: 0,
      };
      map.set(row.workerId, worker);
    }
    if (row.sourceGroupName) {
      worker.sourceGroups.add(`${row.sourceGroupName}${row.sourceCostCenterName ? ` — ${row.sourceCostCenterName}` : ''}`);
    }
    if (row.operationalGroupId && row.operationalGroupId !== row.sourceGroupId && row.operationalGroupName) {
      worker.operationalGroups.add(`${row.operationalGroupName}${row.operationalCostCenterName ? ` — ${row.operationalCostCenterName}` : ''}`);
    }
    worker.dates.push(row.workDate);
    worker.totalCost += row.cost;
  };

  for (const row of financialOnlyRows) {
    allWorkerIds.add(row.workerId);
    let worker = unassignedWorkers.get(row.workerId);
    if (!worker) {
      worker = {
        workerId: row.workerId,
        workerName: row.workerName,
        workerCode: row.workerCode,
        sourceGroups: new Set(),
        operationalGroups: new Set(),
        dates: [],
        totalCost: 0,
      };
      unassignedWorkers.set(row.workerId, worker);
    }
    if (row.sourceGroupLabel) worker.sourceGroups.add(row.sourceGroupLabel);
    worker.totalCost += row.cost;
  }

  for (const row of allocations) {
    allWorkerIds.add(row.workerId);
    totalWorkDays += 1;
    totalCost += row.cost;

    if (row.siteId && row.siteName && row.siteType) {
      let site = bySite.get(row.siteId);
      if (!site) {
        site = {
          siteId: row.siteId,
          siteName: row.siteName,
          siteType: row.siteType,
          siteCostCenterId: row.siteCostCenterId,
          siteCostCenterName: row.siteCostCenterName,
          workerIds: new Set(),
          workDays: 0,
          totalCost: 0,
          workers: new Map(),
        };
        bySite.set(row.siteId, site);
      }
      site.workerIds.add(row.workerId);
      site.workDays += 1;
      site.totalCost += row.cost;
      addWorkerDay(site.workers, row);
    } else {
      addWorkerDay(unassignedWorkers, row);
    }
  }

  const buildPeriods = (dates: string[]) => {
    if (!dates.length) return [] as Array<{ startDate: string; endDate: string; days: number }>;
    const periods: Array<{ startDate: string; endDate: string; days: number }> = [];
    let startDate = dates[0];
    let previousDate = dates[0];
    let days = 1;

    const nextDate = (date: string) => {
      const value = new Date(`${date}T00:00:00Z`);
      value.setUTCDate(value.getUTCDate() + 1);
      return value.toISOString().slice(0, 10);
    };

    for (let index = 1; index < dates.length; index += 1) {
      const currentDate = dates[index];
      if (currentDate === nextDate(previousDate)) {
        previousDate = currentDate;
        days += 1;
        continue;
      }
      periods.push({ startDate, endDate: previousDate, days });
      startDate = currentDate;
      previousDate = currentDate;
      days = 1;
    }
    periods.push({ startDate, endDate: previousDate, days });
    return periods;
  };

  const serializeWorkers = (workerMapAgg: Map<number, WorkerAgg>) =>
    [...workerMapAgg.values()]
      .map((worker) => {
        const dates = [...new Set(worker.dates)].sort();
        return {
          workerId: worker.workerId,
          workerName: worker.workerName,
          workerCode: worker.workerCode,
          sourceGroups: [...worker.sourceGroups],
          operationalGroups: [...worker.operationalGroups],
          workDays: dates.length,
          firstDate: dates[0] || null,
          lastDate: dates[dates.length - 1] || null,
          periods: buildPeriods(dates),
          dates,
          totalCost: money(worker.totalCost),
        };
      })
      .sort((a, b) => b.totalCost - a.totalCost || a.workerName.localeCompare(b.workerName, 'ar'));

  const sites = [...bySite.values()]
    .map((site) => ({
      siteId: site.siteId,
      siteName: site.siteName,
      siteType: site.siteType,
      siteCostCenterId: site.siteCostCenterId,
      siteCostCenterName: site.siteCostCenterName,
      workerCount: site.workerIds.size,
      workDays: site.workDays,
      totalCost: money(site.totalCost),
      workers: serializeWorkers(site.workers),
    }))
    .sort((a, b) => b.totalCost - a.totalCost);

  const unassignedCost = allocations
    .filter((row) => !row.siteId)
    .reduce((sum, row) => sum + row.cost, 0) + financialOnlyUnassignedCost;

  return {
    financialSource: 'approved_payroll_batches' as const,
    approvedStatuses: ['approved', 'paid'] as const,
    batchCount: contributingBatchIds.size,
    sites,
    unassigned:
      unassignedWorkers.size || financialOnlyUnassignedCost
        ? {
            workerCount: unassignedWorkers.size,
            workDays: [...unassignedWorkers.values()].reduce((sum, worker) => sum + new Set(worker.dates).size, 0),
            totalCost: money(unassignedCost),
            workers: serializeWorkers(unassignedWorkers),
            financialOnlyCost: money(financialOnlyUnassignedCost),
          }
        : null,
    totals: {
      workerCount: allWorkerIds.size,
      workDays: totalWorkDays,
      totalCost: money(totalCost + financialOnlyUnassignedCost),
    },
  };
}
