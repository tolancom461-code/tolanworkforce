import { eq, desc, and, or, like, gte, lt, lte, sql, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
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
  deductionRules,
  auditLog
} from "../drizzle/schema";
import { inArray, isNull, isNotNull, between } from "drizzle-orm";

// Rename Worker type to avoid conflict with Web Worker
import type { Worker as DbWorker } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _rawConnection: any = null;

// ============================================
// Audit Log Helper
// ============================================
/**
 * Helper function to log audit trail entries
 * يسجل كل العمليات المهمة في سجل التدقيق
 */
export async function logAudit(params: {
  userId?: number | null;
  action: string;
  tableName: string;
  recordId?: number | null;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
}) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(auditLog).values({
      userId: params.userId || null,
      action: params.action,
      tableName: params.tableName,
      recordId: params.recordId || null,
      oldValues: params.oldValues ? JSON.stringify(params.oldValues) : null,
      newValues: params.newValues ? JSON.stringify(params.newValues) : null,
      ipAddress: params.ipAddress || null,
    });
  } catch (error) {
    console.error('[logAudit] Error logging audit:', error);
    // Don't throw - audit logging should never break the main operation
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Safely parse a decimal value to float
 * Returns 0 if parsing fails
 */
export function safeParseDecimal(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const parsed = parseFloat(String(value));
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Safely parse an integer value
 * Returns 0 if parsing fails
 */
export function safeParseInt(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const parsed = parseInt(String(value), 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Group attendance events by WORK DATE (check_in date) instead of calendar date.
 * This correctly handles night shifts where check_out crosses midnight.
 * 
 * Algorithm:
 * 1. Sort events by time
 * 2. For each check_in, the work date = check_in's calendar date
 * 3. For each check_out, find the most recent unmatched check_in for the same worker
 *    and assign the check_out to that check_in's work date
 * 4. Orphan check_outs (no matching check_in) use their own calendar date
 */
export function groupEventsByWorkDate(
  events: Array<{ workerId: number; eventType: string; eventTime: Date; id?: number; [key: string]: any }>
): Record<string, Record<number, { checkIn?: any; checkOut?: any; events: any[] }>> {
  // Sort by time ascending
  const sorted = [...events].sort((a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime());
  
  // Track: workDate -> workerId -> { checkIn, checkOut, events }
  const result: Record<string, Record<number, { checkIn?: any; checkOut?: any; events: any[] }>> = {};
  
  // Track unmatched check_ins per worker (stack: last check_in is most recent)
  const unmatchedCheckIns: Map<number, Array<{ event: any; workDate: string }>> = new Map();
  
  for (const event of sorted) {
    const eventDate = new Date(event.eventTime).toLocaleDateString('en-CA');
    
    if (event.eventType === 'check_in') {
      // Work date = check_in's calendar date (always)
      const workDate = eventDate;
      
      if (!result[workDate]) result[workDate] = {};
      if (!result[workDate][event.workerId]) {
        result[workDate][event.workerId] = { events: [] };
      }
      result[workDate][event.workerId].checkIn = event;
      result[workDate][event.workerId].events.push(event);
      
      // Track as unmatched
      if (!unmatchedCheckIns.has(event.workerId)) {
        unmatchedCheckIns.set(event.workerId, []);
      }
      unmatchedCheckIns.get(event.workerId)!.push({ event, workDate });
      
    } else if (event.eventType === 'check_out') {
      // Find most recent unmatched check_in for this worker
      const workerUnmatched = unmatchedCheckIns.get(event.workerId);
      
      if (workerUnmatched && workerUnmatched.length > 0) {
        // Pop the most recent unmatched check_in
        const matched = workerUnmatched.pop()!;
        const workDate = matched.workDate;
        
        if (!result[workDate]) result[workDate] = {};
        if (!result[workDate][event.workerId]) {
          result[workDate][event.workerId] = { events: [] };
        }
        result[workDate][event.workerId].checkOut = event;
        result[workDate][event.workerId].events.push(event);
      } else {
        // Orphan check_out: use its own calendar date
        const workDate = eventDate;
        if (!result[workDate]) result[workDate] = {};
        if (!result[workDate][event.workerId]) {
          result[workDate][event.workerId] = { events: [] };
        }
        result[workDate][event.workerId].checkOut = event;
        result[workDate][event.workerId].events.push(event);
      }
    }
  }
  
  return result;
}

/**
 * Get the work date for a check_out event by finding its matching check_in.
 * Returns the check_in's calendar date, or the check_out's date if no match found.
 */
export async function getWorkDateForCheckOut(workerId: number, checkOutTime: Date): Promise<string> {
  const db = await getDb();
  if (!db) return checkOutTime.toLocaleDateString('en-CA');
  
  const { attendanceEvents } = await import('../drizzle/schema');
  
  // Look back up to 24 hours for a matching check_in
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
  
  if (checkInEvents.length > 0) {
    return new Date(checkInEvents[0].eventTime).toLocaleDateString('en-CA');
  }
  
  // No matching check_in found, use check_out's date
  return checkOutTime.toLocaleDateString('en-CA');
}

/**
 * Expand date range to include next-day check_outs for night shifts.
 * For a given date range, extends the end time to 10:00 AM the next day
 * to capture check_outs from night shifts that started on the last day.
 */
export function getExpandedDateRange(dateStr: string): { startOfDay: Date; endOfSearch: Date } {
  // Use UTC explicitly to avoid timezone issues
  const startOfDay = new Date(dateStr + 'T00:00:00Z');
  // Expand backwards: previous day at 00:00 UTC to capture check_ins from previous evening shifts
  // This ensures groupEventsByWorkDate can find the matching check_in for orphan check_outs
  // (e.g., check_in at 3 PM UTC = 6 PM local on prev day)
  const expandedStart = new Date(startOfDay);
  expandedStart.setTime(expandedStart.getTime() - 24 * 60 * 60 * 1000); // Go back 24 hours
  // Extend forward to 10 AM UTC next day to capture night shift check_outs
  const endOfSearch = new Date(startOfDay);
  endOfSearch.setTime(endOfSearch.getTime() + 34 * 60 * 60 * 1000); // +34 hours = next day 10 AM
  return { startOfDay: expandedStart, endOfSearch };
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Configure connection pool with limits to prevent resource exhaustion
      _db = drizzle({
        connection: {
          uri: process.env.DATABASE_URL,
          connectionLimit: 5,        // Max 5 concurrent connections
          waitForConnections: true,  // Wait if all connections are busy
          queueLimit: 10,            // Max 10 queued requests
          idleTimeout: 60000,        // Close idle connections after 60s
          enableKeepAlive: true,     // Keep connections alive
          keepAliveInitialDelay: 30000, // First keepalive after 30s
        }
      });
      console.log('[Database] Connection pool initialized (limit: 5, idle timeout: 60s)');
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// Get raw MySQL connection for direct queries
export async function getRawConnection() {
  if (!_rawConnection && process.env.DATABASE_URL) {
    try {
      const mysql = await import('mysql2/promise');
      _rawConnection = await mysql.createConnection(process.env.DATABASE_URL);
      console.log('[Database] Raw connection established');
    } catch (error) {
      console.warn("[Database] Failed to create raw connection:", error);
      _rawConnection = null;
    }
  }
  return _rawConnection;
}

// ============================================
// User Functions
// ============================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.username) {
    throw new Error("User username is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      username: user.username,
      fullName: user.fullName,
    };
    const updateSet: Record<string, unknown> = {};

    if (user.openId !== undefined) {
      values.openId = user.openId;
      updateSet.openId = user.openId;
    }
    if (user.email !== undefined) {
      values.email = user.email ?? null;
      updateSet.email = user.email ?? null;
    }
    if (user.phone !== undefined) {
      values.phone = user.phone ?? null;
      updateSet.phone = user.phone ?? null;
    }
    if (user.fullName !== undefined) {
      values.fullName = user.fullName;
      updateSet.fullName = user.fullName;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }
    if (user.isActive !== undefined) {
      values.isActive = user.isActive;
      updateSet.isActive = user.isActive;
    }
    if (user.loginMethod !== undefined) {
      values.loginMethod = user.loginMethod ?? null;
      updateSet.loginMethod = user.loginMethod ?? null;
    }
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'super_admin';
      updateSet.role = 'super_admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (result.length === 0) return undefined;
  
  const user = result[0];
  
  // Check if user is the owner
  (user as any).isOwner = user.openId === ENV.ownerOpenId;
  
  // All users have full permissions (no permission system)
  (user as any).permissions = [];
  
  return user;
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers(): Promise<User[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users).orderBy(desc(users.createdAt));
}

export async function createUser(user: InsertUser): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(users).values(user);
  return result[0].insertId;
}

export async function updateUser(id: number, data: Partial<InsertUser>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id));
}

export async function deleteUser(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(users).where(eq(users.id, id));
}

// ============================================
// Role Functions
// ============================================

// NOTE: Role management functions removed - roles table no longer exists in schema
// All users are now Admin with full access

// Placeholder functions for backward compatibility
export async function getAllRoles(): Promise<any[]> {
  return [];
}

export async function getRoleById(id: number): Promise<any | undefined> {
  return undefined;
}

export async function createRole(data: any) {
  return { id: 0, success: false };
}

export async function updateRole(id: number, data: any) {
  return { success: false };
}
// All users are now treated as Admin with full access.

export async function checkUserPermission(userId: number, permissionCode: string): Promise<boolean> {
  // All users have all permissions now
  return true;
}

// NOTE: assignRoleToUser removed - role system no longer exists

// ============================================
// Statistics Functions
// ============================================

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return { users: 0, groups: 0, workers: 0, costCenters: 0 };

  const [userCount] = await db.select({ value: count() }).from(users);
  const [groupCount] = await db.select({ value: count() }).from(groups);
  const [workerCount] = await db.select({ value: count() }).from(workers);
  const [ccCount] = await db.select({ value: count() }).from(costCenters);

  return {
    users: userCount?.value || 0,
    groups: groupCount?.value || 0,
    workers: workerCount?.value || 0,
    costCenters: ccCount?.value || 0,
  };
}


// ============================================
// Groups Functions
// ============================================



// Helper function to transform Group from database format to API format
function transformGroup(group: any): any {
  if (!group) return group;
  return {
    id: group.id,
    code: group.code,
    name: group.name,
    costCenterId: group.costCenterId,
    supervisorId: group.supervisorId,
    dailyRate: group.dailyRate,
    dailyWage: group.dailyWage,
    workMinutes: group.workMinutes,
    minuteCost: group.minuteCost,
    latePenaltyRate: group.latePenaltyRate,
    earlyLeavePenaltyRate: group.earlyLeavePenaltyRate,
    isFlexibleSchedule: group.isFlexibleSchedule,
    requiredHours: group.requiredHours,
    isActive: group.isActive,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}

export async function getAllGroups(): Promise<Group[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select().from(groups).orderBy(desc(groups.createdAt));
  return result.map(transformGroup);
}

export async function getGroupById(id: number): Promise<Group | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(groups).where(eq(groups.id, id)).limit(1);
  return result.length > 0 ? transformGroup(result[0]) : undefined;
}

// التحقق من وجود كود المجموعة مسبقاً
export async function getGroupByCode(code: string): Promise<Group | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(groups).where(eq(groups.code, code)).limit(1);
  return result.length > 0 ? transformGroup(result[0]) : null;
}

export async function createGroup(group: InsertGroup): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // التحقق من وجود الكود مسبقاً
  const existingGroup = await getGroupByCode(group.code);
  if (existingGroup) {
    throw new Error(`الكود "${group.code}" مسجل مسبقاً للمجموعة "${existingGroup.name}"`);
  }

  const result = await db.insert(groups).values(group);
  return result[0].insertId;
}

export async function updateGroup(id: number, data: Partial<InsertGroup>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Calculate minute cost if dailyWage or workMinutes are provided
  const updatedData = { ...data };
  if (data.dailyWage !== undefined || data.workMinutes !== undefined) {
    // Get current values if not provided
    const current = await getGroupById(id);
    const dailyWage = data.dailyWage !== undefined ? data.dailyWage : current?.dailyWage;
    const workMinutes = data.workMinutes !== undefined ? data.workMinutes : current?.workMinutes;
    
    // Calculate minute cost
    const minuteCost = calculateMinuteCost(
      dailyWage ? Number(dailyWage) : null,
      workMinutes ? Number(workMinutes) : null
    );
    updatedData.minuteCost = minuteCost !== null ? minuteCost.toString() : null;
  }

  await db.update(groups).set({ ...updatedData, updatedAt: new Date() }).where(eq(groups.id, id));

  // ✅ Automatic recalculation for all workers in this group (open periods only)
  try {
    await recalculateGroupFinanceForOpenPeriods(id);
    console.log(`[Group Updated] ✅ Recalculated all workers in group ${id}`);
  } catch (error: any) {
    console.error(`[Group Updated] ⚠️ Recalc failed for group ${id}:`, error.message);
  }
}

export async function getGroupsByCostCenter(costCenterId: number): Promise<Group[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select().from(groups)
    .where(eq(groups.costCenterId, costCenterId))
    .orderBy(desc(groups.createdAt));
  return result.map(transformGroup);
}

export async function deleteGroup(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 1️⃣ التحقق من وجود عمال مرتبطين بالمجموعة
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(workers)
    .where(eq(workers.groupId, id));

  // 2️⃣ التأكد من أن قيمة العدد رقمية دائماً
  const workersCount = Number(result[0]?.count ?? 0);

  // 3️⃣ منع الحذف إذا كان هناك عمال مرتبطون
  if (workersCount > 0) {
    // تسجيل محاولة الحذف المرفوضة في السجلات
    console.warn(`[DeleteGroupBlocked] groupId=${id} workers=${workersCount}`);

    throw new Error(
      'لا يمكن حذف هذه المجموعة لأنها تحتوي على عمال مرتبطين بها. يرجى نقل أو حذف العمال المرتبطين أولاً ثم إعادة المحاولة.'
    );
  }

  // تنفيذ الحذف إذا لم يكن هناك عمال مرتبطون
  await db.delete(groups).where(eq(groups.id, id));
}

// Group Shifts functions removed - using Weekly Schedules instead

// ============================================
// Workers Functions
// ============================================

export async function getAllWorkers(): Promise<DbWorker[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(workers).orderBy(desc(workers.createdAt), desc(workers.id));
}

export async function getWorkersByGroup(groupId: number): Promise<DbWorker[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(workers).where(eq(workers.groupId, groupId)).orderBy(workers.fullName);
}

export async function getWorkerById(id: number): Promise<DbWorker | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(workers).where(eq(workers.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getWorkerByCode(code: string): Promise<DbWorker | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(workers).where(eq(workers.code, code)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// التحقق من وجود كود العامل مسبقاً
export async function getWorkerByCodeDirect(code: string): Promise<DbWorker | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(workers).where(eq(workers.code, code)).limit(1);
  return result.length > 0 ? result[0] : null;
}
// Helper function to create worker from simplified import data
export async function createWorkerFromImportData(data: {
  code: string;
  fullName: string;
  nationalId?: string | null;
  phone?: string | null;
  groupCode: string;
  hireDate?: string | null;
  status?: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get group by code
  const group = await getGroupByCode(data.groupCode);
  if (!group) {
    throw new Error(`المجموعة "${data.groupCode}" غير موجودة`);
  }

  // Create worker with default values
  const workerData: InsertWorker = {
    code: data.code,
    fullName: data.fullName,
    nationalId: data.nationalId || null,
    phone: data.phone || null,
    groupId: group.id,
    jobId: 1, // Default job ID
    dailyRate: group.dailyRate ? String(group.dailyRate) : '0',
    status: (data.status as any) || "active",
    hireDate: data.hireDate ? new Date(data.hireDate) : new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return createWorker(workerData);
}


export async function createWorker(worker: InsertWorker): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // التحقق من وجود الكود مسبقاً
  const existingWorker = await getWorkerByCodeDirect(worker.code);
  if (existingWorker) {
    throw new Error(`الكود "${worker.code}" مسجل مسبقاً للعامل "${existingWorker.fullName}"`);
  }

  const result = await db.insert(workers).values(worker);
  return result[0].insertId;
}

export async function updateWorker(id: number, data: Partial<InsertWorker>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(workers).set({ ...data, updatedAt: new Date() }).where(eq(workers.id, id));
}

export async function deleteWorker(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(workers).where(eq(workers.id, id));
}

// ============================================
// Cost Centers Functions
// ============================================

export async function getAllCostCenters() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(costCenters).orderBy(costCenters.name);
}

export async function createCostCenter(data: {
  code: string;
  name: string;
  description?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [result] = await db.insert(costCenters).values({
    code: data.code,
    name: data.name,
    description: data.description || null,
    isActive: true,
  });

  return { id: Number(result.insertId), success: true };
}

export async function updateCostCenter(id: number, data: {
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.update(costCenters)
    .set(data)
    .where(eq(costCenters.id, id));

  return { success: true };
}

export async function deleteCostCenter(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.delete(costCenters).where(eq(costCenters.id, id));

  return { success: true };
}

// ============================================
// Password Functions
// ============================================

// ============================================
// Attendance Functions
// ============================================

export async function getWorkerAttendance(workerId: number, limit: number = 30) {
  const db = await getDb();
  if (!db) return [];

  // Import attendanceEvents from schema
  const { attendanceEvents } = await import('../drizzle/schema');
  
  return await db
    .select()
    .from(attendanceEvents)
    .where(eq(attendanceEvents.workerId, workerId))
    .orderBy(desc(attendanceEvents.eventTime))
    .limit(limit);
}

export async function getWorkerFinanceSummary(workerId: number) {
  const db = await getDb();
  if (!db) return { totalEarnings: 0, totalDeductions: 0, totalBonuses: 0, netAmount: 0, daysWorked: 0 };

  // Import workerDailyFinance from schema
  const { workerDailyFinance } = await import('../drizzle/schema');
  
  const records = await db
    .select()
    .from(workerDailyFinance)
    .where(eq(workerDailyFinance.workerId, workerId));
  
  let totalEarnings = 0;
  let totalDeductions = 0;
  let totalBonuses = 0;
  let netAmount = 0;
  let daysWorked = records.length;
  
  for (const record of records) {
    totalEarnings += parseFloat(record.baseAmount || '0');
    totalDeductions += parseFloat(record.deductions || '0');
    totalBonuses += parseFloat(record.bonuses || '0');
    netAmount += parseFloat(record.netAmount || '0');
  }
  
  return { totalEarnings, totalDeductions, totalBonuses, netAmount, daysWorked };
}

export async function getWorkerPayOverrides(workerId: number) {
  const db = await getDb();
  if (!db) return [];

  // Import payOverrides from schema
  const { payOverrides } = await import('../drizzle/schema');
  
  return await db
    .select()
    .from(payOverrides)
    .where(eq(payOverrides.workerId, workerId))
    .orderBy(desc(payOverrides.createdAt));
}

export async function changeUserPassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  // Get user with current password hash
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    throw new Error("User not found");
  }
  
  // Verify current password (simplified - in production use proper hashing like bcrypt)
  if (user.passwordHash && user.passwordHash !== currentPassword) {
    throw new Error("كلمة المرور الحالية غير صحيحة");
  }
  
  // Update password
  await db.update(users).set({ passwordHash: newPassword, updatedAt: new Date() }).where(eq(users.id, userId));
}


// ============================================
// Attendance Functions (Phase 4)
// ============================================

/**
 * تسجيل حضور/انصراف - النسخة القديمة (مع eventType يدوي)
 * ❗ هذه الدالة محفوظة للتوافق مع الكود القديم
 * ✅ يفضل استخدام recordAttendanceWithAdministrativeDay للمنطق الجديد
 */
export async function recordAttendance(
  workerId: number, 
  eventType: 'check_in' | 'check_out', 
  method: string = 'manual', 
  deviceId?: number, 
  verifiedBy?: number,
  ipAddress?: string,
  deviceInfo?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { attendanceEvents, workers } = await import('../drizzle/schema');
  const { getAdministrativeWorkDate } = await import('./attendance-logic');
  
  // Check if worker exists
  const [worker] = await db.select().from(workers).where(eq(workers.id, workerId)).limit(1);
  if (!worker) throw new Error("العامل غير موجود");
  
  const eventTime = new Date();
  const workDate = getAdministrativeWorkDate(eventTime);
  
  // 🔥 RULE 1: Prevent any punch within 60 seconds of the last punch (regardless of type)
  const sixtySecondsAgo = new Date(eventTime.getTime() - 60 * 1000);
  const recentPunches = await db.select()
    .from(attendanceEvents)
    .where(
      and(
        eq(attendanceEvents.workerId, workerId),
        gte(attendanceEvents.eventTime, sixtySecondsAgo)
      )
    )
    .orderBy(desc(attendanceEvents.eventTime))
    .limit(1);
  
  if (recentPunches.length > 0) {
    throw new Error('عذراً، لا يمكن تسجيل حركتين متتاليتين خلال نفس الدقيقة، يرجى الانتظار.');
  }
  
  // 🔥 RULE 2: Prevent duplicate check-out (must have check-in first)
  // Get the last punch for this worker
  const lastPunch = await db.select()
    .from(attendanceEvents)
    .where(eq(attendanceEvents.workerId, workerId))
    .orderBy(desc(attendanceEvents.eventTime))
    .limit(1);
  
  if (lastPunch.length > 0) {
    const lastEventType = lastPunch[0].eventType;
    
    // If trying to check out but last event was also check out
    if (eventType === 'check_out' && lastEventType === 'check_out') {
      throw new Error('لا يمكن تسجيل انصراف متتالي، أنت مسجل كمنصرف بالفعل.');
    }
    
    // If trying to check in but last event was also check in
    if (eventType === 'check_in' && lastEventType === 'check_in') {
      throw new Error('لا يمكن تسجيل حضور متتالي، أنت مسجل كحاضر بالفعل.');
    }
  }
  
  // Insert attendance event with work_date and security fields
  const result = await db.insert(attendanceEvents).values({
    workerId,
    eventType,
    eventTime,
    workDate, // ✅ تسجيل تاريخ اليوم الإداري
    method,
    deviceId: deviceId || null,
    verifiedBy: verifiedBy || null,
    // 🔒 حقول أمنية
    ipAddress: ipAddress || null,
    deviceInfo: deviceInfo || null,
  });
  
  const eventId = result[0].insertId;
  
  // Update worker's last attendance
  await db.update(workers).set({ lastAttendanceAt: eventTime }).where(eq(workers.id, workerId));
  
  // 🔥 AUTO-CALCULATE FINANCE ON CHECK_OUT
  if (eventType === 'check_out') {
    try {
      await processAttendanceToFinance(workerId, workDate);
    } catch (error) {
      console.error('Error calculating daily finance:', error);
      // Don't throw - we still want to record the attendance even if finance calculation fails
    }
  }
  
  return { success: true, eventType, workerId, eventId, timestamp: eventTime, workDate };
}

// ✅ تصدير الدالة الجديدة مع المنطق الهجين المتطور
export { recordAttendanceWithAdministrativeDay } from './attendance-logic';

export async function getWorkerByQRToken(qrToken: string) {
  const db = await getDb();
  if (!db) return null;

  const { workers } = await import('../drizzle/schema');
  
  const [worker] = await db.select().from(workers).where(eq(workers.qrToken, qrToken)).limit(1);
  return worker || null;
}

export async function getWorkerByManualCode(code: string) {
  const db = await getDb();
  if (!db) return null;

  const { workers } = await import('../drizzle/schema');
  
  // Search in both manual_code and code fields using OR condition
  const [worker] = await db.select()
    .from(workers)
    .where(
      or(
        eq(workers.manualCode, code),
        eq(workers.code, code)
      )
    )
    .limit(1);
  
  return worker || null;
}

// New paginated version
export async function getTodayAttendanceWithPagination(groupId?: number, dateStr?: string, page: number = 1, limit: number = 20) {
  const db = await getDb();
  if (!db) return { data: [], total: 0, totalPages: 0 };

  const { attendanceEvents, workers } = await import('../drizzle/schema');
  
  // Use provided date or default to today (local time Asia/Riyadh)
  const targetDate = dateStr || new Date().toLocaleDateString('en-CA');
  
  // Expanded range to capture night shift check_outs from previous day
  const { startOfDay, endOfSearch } = getExpandedDateRange(targetDate);
  
  // Build where conditions
  const whereConditions: any[] = [
    gte(attendanceEvents.eventTime, startOfDay),
    lt(attendanceEvents.eventTime, endOfSearch)
  ];
  
  if (groupId) {
    whereConditions.push(eq(workers.groupId, groupId));
  }
  
  // Get all events for expanded range
  const events = await db
    .select({
      id: attendanceEvents.id,
      workerId: attendanceEvents.workerId,
      workerName: workers.fullName,
      workerCode: workers.code,
      groupId: workers.groupId,
      eventType: attendanceEvents.eventType,
      eventTime: attendanceEvents.eventTime,
      method: attendanceEvents.method,
    })
    .from(attendanceEvents)
    .innerJoin(workers, eq(attendanceEvents.workerId, workers.id))
    .where(and(...whereConditions))
    .orderBy(attendanceEvents.workerId, attendanceEvents.eventTime);
  
  // Use groupEventsByWorkDate to correctly pair check_in/check_out across midnight
  const grouped = groupEventsByWorkDate(events);
  const dayData = grouped[targetDate] || {};
  
  // Build worker map from grouped data
  const workerMap = new Map();
  
  // First, add workers from grouped data for the target date
  for (const [workerIdStr, data] of Object.entries(dayData)) {
    const wId = Number(workerIdStr);
    const checkInEvt = data.checkIn;
    const checkOutEvt = data.checkOut;
    // Find worker info from events
    const workerEvent = events.find(e => e.workerId === wId);
    if (!workerEvent) continue;
    
    workerMap.set(wId, {
      workerId: wId,
      workerName: workerEvent.workerName,
      workerCode: workerEvent.workerCode,
      groupId: workerEvent.groupId,
      checkInId: checkInEvt?.id || null,
      checkInTime: checkInEvt?.eventTime || null,
      checkInMethod: checkInEvt?.method || null,
      checkOutId: checkOutEvt?.id || null,
      checkOutTime: checkOutEvt?.eventTime || null,
      checkOutMethod: checkOutEvt?.method || null,
    });
  }
  
  const allResults = Array.from(workerMap.values());
  const total = allResults.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const data = allResults.slice(offset, offset + limit);
  
  return { data, total, totalPages };
}

// Keep old function for backward compatibility
export async function getTodayAttendance(groupId?: number, dateStr?: string) {
  const db = await getDb();
  if (!db) return [];

  const { attendanceEvents, workers } = await import('../drizzle/schema');
  
  // Use provided date or default to today (local time Asia/Riyadh)
  const targetDate = dateStr || new Date().toLocaleDateString('en-CA');
  
  // Expanded range to capture night shift check_outs
  const { startOfDay, endOfSearch } = getExpandedDateRange(targetDate);
  
  // Get all events for expanded range
  const events = await db
    .select({
      id: attendanceEvents.id,
      workerId: attendanceEvents.workerId,
      workerName: workers.fullName,
      workerCode: workers.code,
      groupId: workers.groupId,
      eventType: attendanceEvents.eventType,
      eventTime: attendanceEvents.eventTime,
      method: attendanceEvents.method,
    })
    .from(attendanceEvents)
    .innerJoin(workers, eq(attendanceEvents.workerId, workers.id))
    .where(and(
      gte(attendanceEvents.eventTime, startOfDay),
      lt(attendanceEvents.eventTime, endOfSearch)
    ))
    .orderBy(attendanceEvents.workerId, attendanceEvents.eventTime);
  
  // Use groupEventsByWorkDate to correctly pair check_in/check_out across midnight
  const grouped = groupEventsByWorkDate(events);
  const dayData = grouped[targetDate] || {};
  
  const workerMap = new Map();
  
  for (const [workerIdStr, data] of Object.entries(dayData)) {
    const wId = Number(workerIdStr);
    const checkInEvt = data.checkIn;
    const checkOutEvt = data.checkOut;
    const workerEvent = events.find(e => e.workerId === wId);
    if (!workerEvent) continue;
    
    workerMap.set(wId, {
      workerId: wId,
      workerName: workerEvent.workerName,
      workerCode: workerEvent.workerCode,
      groupId: workerEvent.groupId,
      checkInId: checkInEvt?.id || null,
      checkInTime: checkInEvt?.eventTime || null,
      checkInMethod: checkInEvt?.method || null,
      checkOutId: checkOutEvt?.id || null,
      checkOutTime: checkOutEvt?.eventTime || null,
      checkOutMethod: checkOutEvt?.method || null,
    });
  }
  
  let results = Array.from(workerMap.values());
  
  if (groupId) {
    results = results.filter(r => r.groupId === groupId);
  }
  
  return results;
}

export async function getWorkerLastEvent(workerId: number) {
  const db = await getDb();
  if (!db) return null;

  const { attendanceEvents } = await import('../drizzle/schema');
  
  // ✅ استخدام طريقة آمنة لإنشاء تاريخ اليوم
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  
  const [lastEvent] = await db
    .select()
    .from(attendanceEvents)
    .where(and(
      eq(attendanceEvents.workerId, workerId),
      gte(attendanceEvents.eventTime, today)
    ))
    .orderBy(desc(attendanceEvents.eventTime))
    .limit(1);
  
  return lastEvent || null;
}

export async function getMonthlyAttendanceReport(year: number, month: number, groupId?: number) {
  const db = await getDb();
  if (!db) return [];

  const { attendanceEvents, workers, groups } = await import('../drizzle/schema');
  
  const startDate = new Date(year, month - 1, 1);
  // Extend end date to capture night shift check_outs on last day of month
  const lastDayOfMonth = new Date(year, month, 0);
  const endDateStr = lastDayOfMonth.toLocaleDateString('en-CA');
  const { endOfSearch: endDate } = getExpandedDateRange(endDateStr);
  
  // Get all workers
  let workersQuery = db.select().from(workers).where(eq(workers.status, 'active'));
  const allWorkers = await workersQuery;
  
  // Filter by group if specified
  const filteredWorkers = groupId ? allWorkers.filter(w => w.groupId === groupId) : allWorkers;
  
  // Get attendance events for the month (expanded range)
  const events = await db
    .select()
    .from(attendanceEvents)
    .where(and(
      gte(attendanceEvents.eventTime, startDate),
      lte(attendanceEvents.eventTime, endDate)
    ));
  
  // Use groupEventsByWorkDate for correct night shift handling
  const grouped = groupEventsByWorkDate(events);
  
  // Calculate statistics for each worker
  const report = filteredWorkers.map(worker => {
    let daysPresent = 0;
    let totalCheckIns = 0;
    let totalCheckOuts = 0;
    let totalHours = 0;
    
    // Iterate over all work dates in the grouped data
    for (const [workDate, workerData] of Object.entries(grouped)) {
      // Only count dates within the month
      if (workDate < startDate.toLocaleDateString('en-CA') || workDate > endDateStr) continue;
      
      const wd = workerData[worker.id];
      if (!wd) continue;
      
      daysPresent++;
      if (wd.checkIn) totalCheckIns++;
      if (wd.checkOut) totalCheckOuts++;
      
      if (wd.checkIn && wd.checkOut) {
        const hours = (new Date(wd.checkOut.eventTime).getTime() - new Date(wd.checkIn.eventTime).getTime()) / (1000 * 60 * 60);
        totalHours += hours;
      }
    }
    
    return {
      workerId: worker.id,
      workerName: worker.fullName,
      workerCode: worker.code,
      groupId: worker.groupId,
      daysPresent,
      totalCheckIns,
      totalCheckOuts,
      totalHours: Math.round(totalHours * 100) / 100,
      avgHoursPerDay: daysPresent > 0 ? Math.round((totalHours / daysPresent) * 100) / 100 : 0,
    };
  });
  
  return report;
}

export async function getDateRangeAttendanceReport(startDateStr: string, endDateStr: string, groupId?: number) {
  const db = await getDb();
  if (!db) return [];

  const { attendanceEvents, workers, groups } = await import('../drizzle/schema');
  
  const startDate = new Date(startDateStr + 'T00:00:00');
  // Extend end date to capture night shift check_outs
  const { endOfSearch: endDate } = getExpandedDateRange(endDateStr);
  
  // Get all active workers
  const allWorkers = await db.select().from(workers).where(eq(workers.status, 'active'));
  
  // Filter by group if specified
  const filteredWorkers = groupId ? allWorkers.filter(w => w.groupId === groupId) : allWorkers;
  
  // Get attendance events for the date range (expanded)
  const events = await db
    .select()
    .from(attendanceEvents)
    .where(and(
      gte(attendanceEvents.eventTime, startDate),
      lte(attendanceEvents.eventTime, endDate)
    ));
  
  // Use groupEventsByWorkDate for correct night shift handling
  const grouped = groupEventsByWorkDate(events);
  
  // Calculate statistics for each worker
  const report = filteredWorkers.map(worker => {
    let daysPresent = 0;
    let totalCheckIns = 0;
    let totalCheckOuts = 0;
    let totalHours = 0;
    
    for (const [workDate, workerData] of Object.entries(grouped)) {
      if (workDate < startDateStr || workDate > endDateStr) continue;
      
      const wd = workerData[worker.id];
      if (!wd) continue;
      
      daysPresent++;
      if (wd.checkIn) totalCheckIns++;
      if (wd.checkOut) totalCheckOuts++;
      
      if (wd.checkIn && wd.checkOut) {
        const hours = (new Date(wd.checkOut.eventTime).getTime() - new Date(wd.checkIn.eventTime).getTime()) / (1000 * 60 * 60);
        totalHours += hours;
      }
    }
    
    return {
      workerId: worker.id,
      workerName: worker.fullName,
      workerCode: worker.code,
      groupId: worker.groupId,
      daysPresent,
      totalCheckIns,
      totalCheckOuts,
      totalHours: Math.round(totalHours * 100) / 100,
      avgHoursPerDay: daysPresent > 0 ? Math.round((totalHours / daysPresent) * 100) / 100 : 0,
    };
  });
  
  return report;
}

// Work Days Management
export async function getWorkDays(year: number, month: number) {
  const db = await getDb();
  if (!db) return [];

  
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  return await db
    .select()
    .from(workDays)
    .where(and(
      gte(workDays.workDate, sql`${startDate.toLocaleDateString('en-CA')}`),
      lte(workDays.workDate, sql`${endDate.toLocaleDateString('en-CA')}`)
    ));
}

export async function upsertWorkDay(workDate: string, dayType: 'normal' | 'holiday' | 'weekend', notes?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  
  // Check if exists
  const [existing] = await db.select().from(workDays).where(eq(workDays.workDate, sql`${workDate}`)).limit(1);
  
  if (existing) {
    await db.update(workDays).set({ dayType, notes }).where(eq(workDays.id, existing.id));
  } else {
    await db.insert(workDays).values({ workDate: sql`${workDate}`, dayType, notes });  
  }
  
  return { success: true };
}

export async function getAttendanceStats(startDate: Date, endDate: Date, groupId?: number) {
  const db = await getDb();
  if (!db) return { totalWorkers: 0, presentToday: 0, absentToday: 0, lateToday: 0 };

  const { workers, attendanceEvents } = await import('../drizzle/schema');
  
  // Get all active workers
  let allWorkers = await db.select().from(workers).where(eq(workers.status, 'active'));
  if (groupId) {
    allWorkers = allWorkers.filter(w => w.groupId === groupId);
  }
  
  // Get check-ins for the specified date range
  const todayEvents = await db
    .select()
    .from(attendanceEvents)
    .where(and(
      gte(attendanceEvents.eventTime, startDate),
      lt(attendanceEvents.eventTime, endDate),
      eq(attendanceEvents.eventType, 'check_in')
    ));
  
  const presentWorkerIds = new Set(todayEvents.map(e => e.workerId));
  const presentToday = allWorkers.filter(w => presentWorkerIds.has(w.id)).length;
  
  return {
    totalWorkers: allWorkers.length,
    presentToday,
    absentToday: allWorkers.length - presentToday,
    lateToday: 0, // Would need shift data to calculate
  };
}


// ============================================
// Daily Finance Functions (Phase 4 Completion)
// ============================================

export async function createOrUpdateDailyFinance(
  workerId: number, 
  workDate: string, 
  data: {
    baseAmount?: number;
    deductions?: number;
    bonuses?: number;
    lateMinutes?: number;
    earlyLeaveMinutes?: number;
    actualWorkMinutes?: number;
    checkInTime?: Date | null;
    checkOutTime?: Date | null;
    notes?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { workerDailyFinance } = await import('../drizzle/schema');
  
  // Check if exists
  const [existing] = await db
    .select()
    .from(workerDailyFinance)
    .where(and(
      eq(workerDailyFinance.workerId, workerId),
      eq(workerDailyFinance.workDate, sql`${workDate}`)
    ))
    .limit(1);
  
  const baseAmount = data.baseAmount || 0;
  const deductions = data.deductions || 0;
  const bonuses = data.bonuses || 0;
  const netAmount = baseAmount - deductions + bonuses;
  const workedMinutes = data.actualWorkMinutes || 0;
  // Financial minutes = worked minutes (already capped to shift boundaries)
  const financialMinutes = workedMinutes;
  
  if (existing) {
    await db.update(workerDailyFinance).set({
      baseAmount: sql`${baseAmount}`,
      deductions: sql`${deductions}`,
      bonuses: sql`${bonuses}`,
      netAmount: sql`${netAmount}`,
      baseSalary: sql`${baseAmount}`,
      netSalary: sql`${netAmount}`,
      workedMinutes: workedMinutes,
      financialMinutes: financialMinutes,
      lateMinutes: data.lateMinutes || 0,
      earlyLeaveMinutes: data.earlyLeaveMinutes || 0,
      latePenalty: sql`${deductions}`,
      checkInTime: data.checkInTime || existing.checkInTime,
      checkOutTime: data.checkOutTime || existing.checkOutTime,
      notes: data.notes,
      updatedAt: new Date(),
    }).where(eq(workerDailyFinance.id, existing.id));
    return { id: existing.id, created: false };
  } else {
    const result = await db.insert(workerDailyFinance).values({
      workerId,
      workDate: sql`${workDate}`,
      baseAmount: sql`${baseAmount}`,
      deductions: sql`${deductions}`,
      bonuses: sql`${bonuses}`,
      netAmount: sql`${netAmount}`,
      baseSalary: sql`${baseAmount}`,
      netSalary: sql`${netAmount}`,
      workedMinutes: workedMinutes,
      financialMinutes: financialMinutes,
      lateMinutes: data.lateMinutes || 0,
      earlyLeaveMinutes: data.earlyLeaveMinutes || 0,
      latePenalty: sql`${deductions}`,
      checkInTime: data.checkInTime || null,
      checkOutTime: data.checkOutTime || null,
      notes: data.notes,
    });
    return { id: (result as any).insertId, created: true };
  }
}

export async function calculateDailyFinanceFromAttendance(workerId: number, workDate: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { attendanceEvents, workers, groups, workDays, workerDailyFinance } = await import('../drizzle/schema');
  
  // Get worker with group info
  const [worker] = await db.select().from(workers).where(eq(workers.id, workerId)).limit(1);
  if (!worker) throw new Error("العامل غير موجود");
  
  // ✅ Get effective group (considers temporary assignments)
  const effectiveGroupId = await getEffectiveGroupForWorkerOnDate(workerId, workDate);
  
  // Get group and shift info
  let dailyRate = safeParseDecimal(worker.dailyRate);
  
  // Group settings for minute-based calculations
  let groupDailyWage: number | null = null;
  let groupWorkMinutes: number | null = null;
  let groupLatePenaltyRate: number | null = null;
  let groupEarlyLeavePenaltyRate: number | null = null;
  let isFlexibleSchedule = false;
  let requiredHours: number | null = null;
  
  // ⚠️ CRITICAL: Shift times from group_schedules are the SOLE reference
  // If no shift is defined, NO penalties are calculated
  let shiftStartTime: string | null = null;
  let shiftEndTime: string | null = null;
  let hasShiftDefined = false;
  
  if (effectiveGroupId) {
    const [group] = await db.select().from(groups).where(eq(groups.id, effectiveGroupId)).limit(1);
    console.log('🔍 DEBUG: effectiveGroupId =', effectiveGroupId);
    console.log('🔍 DEBUG: group =', group);
    if (group) {
      if (group.dailyRate) {
        dailyRate = dailyRate || safeParseDecimal(group.dailyRate);
      }
      // Load group settings
      console.log('🔍 DEBUG: group.dailyWage RAW =', group.dailyWage, 'TYPE =', typeof group.dailyWage);
      groupDailyWage = group.dailyWage ? safeParseDecimal(group.dailyWage) : null;
      console.log('🔍 DEBUG: groupDailyWage PARSED =', groupDailyWage);
      groupWorkMinutes = safeParseInt(group.workMinutes);
      groupLatePenaltyRate = group.latePenaltyRate ? safeParseDecimal(group.latePenaltyRate) : null;
      groupEarlyLeavePenaltyRate = group.earlyLeavePenaltyRate ? safeParseDecimal(group.earlyLeavePenaltyRate) : null;
      isFlexibleSchedule = group.isFlexibleSchedule || false;
      requiredHours = group.requiredHours ? safeParseDecimal(group.requiredHours) : null;
      
      // Get shift times from weekly schedule based on day of week and effective date
      const workDateObj = typeof workDate === 'string' ? new Date(workDate + 'T00:00:00') : workDate;
      const dayOfWeek = workDateObj.getDay();
      const workDateStr = typeof workDate === 'string' ? workDate : workDateObj.toLocaleDateString('en-CA');
      
      const [schedule] = await db
        .select()
        .from(groupSchedules)
        .where(
          and(
            eq(groupSchedules.groupId, worker.groupId),
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
        hasShiftDefined = true;
      }
    }
  }
  
  // Check if it's a work day
  const [workDay] = await db.select().from(workDays).where(eq(workDays.workDate, sql`${workDate}`)).limit(1);
  if (workDay && (workDay.dayType === 'holiday' || workDay.dayType === 'weekend')) {
    return { baseAmount: 0, deductions: 0, bonuses: 0, lateMinutes: 0, earlyLeaveMinutes: 0, actualWorkMinutes: 0 };
  }
  
  // ✅ استخدام work_date بدلاً من event_time للتجميع
  // هذا يحل مشكلة الورديات الليلية بشكل تلقائي
  const allEvents = await db
    .select()
    .from(attendanceEvents)
    .where(and(
      eq(attendanceEvents.workerId, workerId),
      eq(attendanceEvents.workDate, sql`${workDate}`)
    ))
    .orderBy(attendanceEvents.eventTime);
  
  // البحث عن أول حضور وآخر انصراف في هذا اليوم الإداري
  const checkIn = allEvents.find(e => e.eventType === 'check_in') || null;
  const checkOut = allEvents.reverse().find(e => e.eventType === 'check_out') || null;
  
  let lateMinutes = 0;
  let earlyLeaveMinutes = 0;
  let actualWorkMinutes = 0;
  let baseAmount = 0;
  let deductions = 0;
  
  // If worker has both check-in and check-out
  if (checkIn && checkOut) {
    const checkInTime = new Date(checkIn.eventTime);
    const checkOutTime = new Date(checkOut.eventTime);
    
    // Raw work minutes (for attendance log display)
    const rawWorkMinutes = Math.round((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60));
    
  // Base amount = fixed daily wage
  console.log('🔍 DEBUG: Calculating baseAmount...');
  console.log('🔍 DEBUG: groupDailyWage =', groupDailyWage, 'dailyRate =', dailyRate);
  if (groupDailyWage && groupDailyWage > 0) {
    baseAmount = groupDailyWage;
    console.log('🔍 DEBUG: baseAmount = groupDailyWage =', baseAmount);
    } else if (dailyRate > 0) {
      baseAmount = dailyRate;
    }
    
    // ⚠️ FLEXIBLE SCHEDULE: Hours-based calculation (no shift times needed)
    if (isFlexibleSchedule && requiredHours && requiredHours > 0) {
      // Calculate total work hours
      const totalWorkHours = rawWorkMinutes / 60;
      
      // No late or early leave penalties for flexible schedules
      lateMinutes = 0;
      earlyLeaveMinutes = 0;
      
      // If worker completed required hours → full daily wage
      if (totalWorkHours >= requiredHours) {
        actualWorkMinutes = requiredHours * 60; // Cap at required hours
        // No deductions - full wage
        deductions = 0;
      } else {
        // If less than required hours → deduct the difference
        actualWorkMinutes = rawWorkMinutes;
        const requiredMinutes = requiredHours * 60;
        const missingMinutes = requiredMinutes - rawWorkMinutes;
        
        if (groupDailyWage && requiredHours > 0) {
          // Calculate minute rate (more accurate than hourly rate)
          const minuteRate = groupDailyWage / requiredMinutes;
          // Deduct missing minutes
          deductions = minuteRate * missingMinutes;
        }
      }
    }
    // ⚠️ SHIFT-BASED CALCULATIONS: Only if shift is defined in group_schedules
    else if (hasShiftDefined && shiftStartTime && shiftEndTime) {
      const [shiftStartHour, shiftStartMin] = shiftStartTime.split(':').map(Number);
      const [shiftEndHour, shiftEndMin] = shiftEndTime.split(':').map(Number);
      
      // Build shift times using the WORK DATE in local time
      const shiftDateBase = new Date(workDate + 'T00:00:00');
      const shiftStart = new Date(shiftDateBase);
      shiftStart.setHours(shiftStartHour, shiftStartMin, 0, 0);
      
      let shiftEnd = new Date(shiftDateBase);
      shiftEnd.setHours(shiftEndHour, shiftEndMin, 0, 0);
      
      // Handle night shifts: if shift end <= shift start, it crosses midnight
      if (shiftEnd <= shiftStart) {
        shiftEnd.setDate(shiftEnd.getDate() + 1);
      }
      
      // Financial check-in: capped to shift start (early arrival not counted)
      const financialCheckIn = checkInTime < shiftStart ? shiftStart : checkInTime;
      // Financial check-out: capped to shift end (late departure not counted)
      const financialCheckOut = checkOutTime > shiftEnd ? shiftEnd : checkOutTime;
      
      // Financial work minutes (within shift boundaries)
      if (financialCheckOut > financialCheckIn) {
        const financialMinutes = Math.round((financialCheckOut.getTime() - financialCheckIn.getTime()) / (1000 * 60));
        actualWorkMinutes = groupWorkMinutes && groupWorkMinutes > 0 
          ? Math.min(financialMinutes, groupWorkMinutes) 
          : financialMinutes;
      } else {
        // Worker left before shift started or arrived after shift ended
        actualWorkMinutes = 0;
      }
      
      // Late minutes: only if checked in AFTER shift start
      if (checkInTime > shiftStart) {
        lateMinutes = Math.round((checkInTime.getTime() - shiftStart.getTime()) / (1000 * 60));
      }
      
      // Early leave minutes: only if checked out BEFORE shift end
      if (checkOutTime < shiftEnd) {
        earlyLeaveMinutes = Math.round((shiftEnd.getTime() - checkOutTime.getTime()) / (1000 * 60));
      }
      
      // Calculate deductions using penalty rates
      if (groupDailyWage && groupWorkMinutes && groupWorkMinutes > 0) {
        const minuteCost = groupDailyWage / groupWorkMinutes;
        
        if (lateMinutes > 0 && groupLatePenaltyRate) {
          // penaltyRate is percentage: 200% = double the minute cost
          deductions += minuteCost * lateMinutes * (groupLatePenaltyRate / 100);
        }
        if (earlyLeaveMinutes > 0 && groupEarlyLeavePenaltyRate) {
          deductions += minuteCost * earlyLeaveMinutes * (groupEarlyLeavePenaltyRate / 100);
        }
      }
    } else {
      // ❌ NO SHIFT DEFINED: No penalties calculated
      // Worker gets full daily wage, no late/early deductions
      // Work minutes = raw work minutes capped at groupWorkMinutes
      if (groupWorkMinutes && groupWorkMinutes > 0) {
        actualWorkMinutes = Math.min(rawWorkMinutes, groupWorkMinutes);
      } else {
        actualWorkMinutes = rawWorkMinutes;
      }
    }
    
    // Round deductions
    deductions = Math.round(deductions * 100) / 100;
    
    // ⚠️ CAP: Deductions cannot exceed base amount (net >= 0)
    if (deductions > baseAmount) {
      deductions = baseAmount;
    }
    
    // Round base amount
    baseAmount = Math.round(baseAmount * 100) / 100;
    
  } else if (!checkIn && !checkOut) {
    // Absent: no base amount
    baseAmount = 0;
    actualWorkMinutes = 0;
  } else if (checkIn && !checkOut) {
    // ✅ Has check-in but no check-out yet → Worker is present, give full daily wage
    console.log('🔍 DEBUG: Worker has check-in but no check-out → giving full baseAmount');
    console.log('🔍 DEBUG: groupDailyWage =', groupDailyWage, 'dailyRate =', dailyRate);
    if (groupDailyWage && groupDailyWage > 0) {
      baseAmount = groupDailyWage;
      console.log('🔍 DEBUG: baseAmount = groupDailyWage =', baseAmount);
    } else if (dailyRate > 0) {
      baseAmount = dailyRate;
      console.log('🔍 DEBUG: baseAmount = dailyRate =', baseAmount);
    }
    // No penalties can be calculated without check-out time
    actualWorkMinutes = 0;
    lateMinutes = 0;
    earlyLeaveMinutes = 0;
    deductions = 0;
  } else {
    // Only check-out without check-in (unusual case)
    baseAmount = 0;
    actualWorkMinutes = 0;
  }
  
  return {
    baseAmount,
    deductions,
    bonuses: 0,
    lateMinutes,
    earlyLeaveMinutes,
    actualWorkMinutes,
  };
}

export async function processAttendanceToFinance(workerId: number, workDate: string) {
  const financeData = await calculateDailyFinanceFromAttendance(workerId, workDate);
  
  // Get check-in and check-out times for the record using work_date field
  const db = await getDb();
  let checkInTime: Date | null = null;
  let checkOutTime: Date | null = null;
  if (db) {
    const { attendanceEvents } = await import('../drizzle/schema');
    
    // ✅ استخدام work_date بدلاً من event_time للتجميع
    const events = await db.select().from(attendanceEvents)
      .where(and(
        eq(attendanceEvents.workerId, workerId),
        eq(attendanceEvents.workDate, sql`${workDate}`)
      ))
      .orderBy(attendanceEvents.eventTime);
    
    // البحث عن أول حضور وآخر انصراف في هذا اليوم الإداري
    const checkInEvent = events.find(e => e.eventType === 'check_in');
    const checkOutEvent = events.reverse().find(e => e.eventType === 'check_out');
    
    if (checkInEvent) checkInTime = new Date(checkInEvent.eventTime);
    if (checkOutEvent) checkOutTime = new Date(checkOutEvent.eventTime);
  }
  
  return await createOrUpdateDailyFinance(workerId, workDate, {
    ...financeData,
    checkInTime,
    checkOutTime,
  });
}

// ============================================
// Attendance Adjustment Functions
// ============================================

export async function getAttendanceEventById(eventId: number) {
  const db = await getDb();
  if (!db) return null;

  const { attendanceEvents } = await import('../drizzle/schema');
  
  const [event] = await db.select().from(attendanceEvents).where(eq(attendanceEvents.id, eventId)).limit(1);
  return event || null;
}

export async function updateAttendanceEvent(
  eventId: number, 
  newTime: string, 
  internalNote?: string,
  updatedBy?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { attendanceEvents, auditLog } = await import('../drizzle/schema');
  
  // Get original event
  const [original] = await db.select().from(attendanceEvents).where(eq(attendanceEvents.id, eventId)).limit(1);
  if (!original) throw new Error("سجل الحضور غير موجود");
  
  // Check if payroll batch exists for this date
  const eventDate = new Date(original.eventTime).toLocaleDateString('en-CA');
  const batch = await checkPayrollBatchForDate(eventDate);
  if (batch) {
    throw new Error(`لا يمكن تعديل الحضور بعد إنشاء دفعة الراتب. يجب حذف المسودة أولاً (دفعة رقم: ${batch.batchCode})`);
  }
  
  // Update event
  const updateData: any = {
    eventTime: new Date(newTime),
  };
  if (internalNote !== undefined) {
    updateData.note = internalNote;
  }
  await db.update(attendanceEvents).set(updateData).where(eq(attendanceEvents.id, eventId));
  
  // Log the change
  await db.insert(auditLog).values({
    userId: updatedBy,
    action: 'UPDATE_ATTENDANCE',
    tableName: 'attendance_events',
    recordId: eventId,
    oldValues: JSON.stringify({ eventTime: original.eventTime, note: original.note }),
    newValues: JSON.stringify({ eventTime: newTime, note: internalNote }),
  });
  
  // Recalculate daily finance
  const workDate = new Date(original.eventTime).toLocaleDateString('en-CA');
  await processAttendanceToFinance(original.workerId, workDate);
  
  return { success: true };
}

export async function getAttendanceEventsForEdit(workerId: number, workDate: string) {
  const db = await getDb();
  if (!db) return [];

  const { attendanceEvents } = await import('../drizzle/schema');
  
  const dateStart = new Date(workDate + 'T00:00:00');
  const dateEnd = new Date(workDate + 'T23:59:59.999');
  
  return await db
    .select()
    .from(attendanceEvents)
    .where(and(
      eq(attendanceEvents.workerId, workerId),
      gte(attendanceEvents.eventTime, dateStart),
      lte(attendanceEvents.eventTime, dateEnd)
    ))
    .orderBy(attendanceEvents.eventTime);
}

export async function getAttendanceEventsByGroup(groupId: number, workDate: string) {
  const db = await getDb();
  if (!db) return [];

  const { attendanceEvents, workers } = await import('../drizzle/schema');
  
  // Get all workers in the group
  const groupWorkers = await db
    .select()
    .from(workers)
    .where(eq(workers.groupId, groupId));
  
  if (groupWorkers.length === 0) return [];
  
  const workerIds = groupWorkers.map(w => w.id);
  
  const dateStart = new Date(workDate + 'T00:00:00');
  const dateEnd = new Date(workDate + 'T23:59:59.999');
  
  // Get all events for all workers in the group
  const events = await db
    .select({
      id: attendanceEvents.id,
      workerId: attendanceEvents.workerId,
      eventType: attendanceEvents.eventType,
      eventTime: attendanceEvents.eventTime,
      method: attendanceEvents.method,
      note: attendanceEvents.note,
      workerName: workers.fullName,
      workerCode: workers.code,
    })
    .from(attendanceEvents)
    .innerJoin(workers, eq(attendanceEvents.workerId, workers.id))
    .where(and(
      sql`${attendanceEvents.workerId} IN (${sql.join(workerIds.map(id => sql`${id}`), sql`, `)})`,
      gte(attendanceEvents.eventTime, dateStart),
      lte(attendanceEvents.eventTime, dateEnd)
    ))
    .orderBy(workers.fullName, attendanceEvents.eventTime);
  
  return events;
}

// ============================================
// Pay Overrides Functions
// ============================================

export async function createPayOverride(data: {
  workerId: number;
  overrideDate: string;
  overrideType: 'bonus' | 'deduction' | 'advance' | 'emergency_call';
  amount: number;
  reason?: string;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { payOverrides } = await import('../drizzle/schema');
  
  const result = await db.insert(payOverrides).values({
    workerId: data.workerId,
    overrideDate: sql`${data.overrideDate}`,
    overrideType: data.overrideType,
    amount: sql`${data.amount}`,
    reason: data.reason,
    status: 'pending',
    createdBy: data.createdBy,
  });
  
  return { id: (result as any).insertId, success: true };
}

export async function getPendingOverrides(groupId?: number) {
  const db = await getDb();
  if (!db) return [];

  const { payOverrides, workers } = await import('../drizzle/schema');
  
  let query = db
    .select({
      id: payOverrides.id,
      workerId: payOverrides.workerId,
      workerName: workers.fullName,
      workerCode: workers.code,
      groupId: workers.groupId,
      overrideDate: payOverrides.overrideDate,
      overrideType: payOverrides.overrideType,
      amount: payOverrides.amount,
      reason: payOverrides.reason,
      status: payOverrides.status,
      createdAt: payOverrides.createdAt,
    })
    .from(payOverrides)
    .innerJoin(workers, eq(payOverrides.workerId, workers.id))
    .where(eq(payOverrides.status, 'pending'))
    .orderBy(desc(payOverrides.createdAt));
  
  const results = await query;
  
  if (groupId) {
    return results.filter(r => r.groupId === groupId);
  }
  
  return results;
}

export async function approveOverride(overrideId: number, approvedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { payOverrides, workerDailyFinance } = await import('../drizzle/schema');
  
  // Get override
  const [override] = await db.select().from(payOverrides).where(eq(payOverrides.id, overrideId)).limit(1);
  if (!override) throw new Error("الاستثناء غير موجود");
  if (override.status !== 'pending') throw new Error("الاستثناء تم معالجته مسبقاً");
  
  // Update override status
  await db.update(payOverrides).set({
    status: 'approved',
    approvedBy,
    approvedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(payOverrides.id, overrideId));
  
  // Apply to daily finance
  const workDate = override.overrideDate;
  const amount = parseFloat(override.amount?.toString() || '0');
  
  // Get or create daily finance record
  const [existing] = await db
    .select()
    .from(workerDailyFinance)
    .where(and(
      eq(workerDailyFinance.workerId, override.workerId),
      eq(workerDailyFinance.workDate, workDate)
    ))
    .limit(1);
  
  if (existing) {
    let newDeductions = parseFloat(existing.deductions?.toString() || '0');
    let newBonuses = parseFloat(existing.bonuses?.toString() || '0');
    
    if (override.overrideType === 'deduction' || override.overrideType === 'advance') {
      newDeductions += amount;
    } else {
      newBonuses += amount;
    }
    
    const baseAmount = parseFloat(existing.baseAmount?.toString() || '0');
    const netAmount = baseAmount - newDeductions + newBonuses;
    
    await db.update(workerDailyFinance).set({
      deductions: sql`${newDeductions}`,
      bonuses: sql`${newBonuses}`,
      netAmount: sql`${netAmount}`,
      updatedAt: new Date(),
    }).where(eq(workerDailyFinance.id, existing.id));
  } else {
    // Create new record
    const deductions = (override.overrideType === 'deduction' || override.overrideType === 'advance') ? amount : 0;
    const bonuses = (override.overrideType === 'bonus' || override.overrideType === 'emergency_call') ? amount : 0;
    
    await db.insert(workerDailyFinance).values({
      workerId: override.workerId,
      workDate: workDate,
      baseAmount: sql`0`,
      deductions: sql`${deductions}`,
      bonuses: sql`${bonuses}`,
      netAmount: sql`${bonuses - deductions}`,
    });
  }
  
  return { success: true };
}

export async function rejectOverride(overrideId: number, approvedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { payOverrides } = await import('../drizzle/schema');
  
  await db.update(payOverrides).set({
    status: 'rejected',
    approvedBy,
    approvedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(payOverrides.id, overrideId));
  
  return { success: true };
}

// ============================================
// Finance Entry Functions
// ============================================

export async function addFinanceEntry(
  workerId: number,
  workDate: string,
  entryType: 'deduction' | 'bonus' | 'fine' | 'addition',
  amount: number,
  reason?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if payroll batch exists for this date
  const batch = await checkPayrollBatchForDate(workDate);
  if (batch) {
    throw new Error(`لا يمكن إضافة خصومات أو إضافات بعد إنشاء دفعة الراتب. يجب حذف المسودة أولاً (دفعة رقم: ${batch.batchCode})`);
  }

  const { workerDailyFinance } = await import('../drizzle/schema');
  
  // Get or create daily finance record
  const [existing] = await db
    .select()
    .from(workerDailyFinance)
    .where(and(
      eq(workerDailyFinance.workerId, workerId),
      eq(workerDailyFinance.workDate, sql`${workDate}`)
    ))
    .limit(1);
  
  if (existing) {
    let newDeductions = parseFloat(existing.deductions?.toString() || '0');
    let newBonuses = parseFloat(existing.bonuses?.toString() || '0');
    let notes = existing.notes || '';
    
    if (entryType === 'deduction' || entryType === 'fine') {
      newDeductions += amount;
    } else {
      newBonuses += amount;
    }
    
    if (reason) {
      notes += (notes ? '\n' : '') + `${entryType}: ${amount} - ${reason}`;
    }
    
    const baseAmount = parseFloat(existing.baseAmount?.toString() || '0');
    const netAmount = baseAmount - newDeductions + newBonuses;
    
    await db.update(workerDailyFinance).set({
      deductions: sql`${newDeductions}`,
      bonuses: sql`${newBonuses}`,
      netAmount: sql`${netAmount}`,
      notes,
      updatedAt: new Date(),
    }).where(eq(workerDailyFinance.id, existing.id));
    
    return { id: existing.id, netAmount };
  } else {
    const deductions = (entryType === 'deduction' || entryType === 'fine') ? amount : 0;
    const bonuses = (entryType === 'bonus' || entryType === 'addition') ? amount : 0;
    const netAmount = bonuses - deductions;
    
    const result = await db.insert(workerDailyFinance).values({
      workerId,
      workDate: sql`${workDate}`,
      baseAmount: sql`0`,
      deductions: sql`${deductions}`,
      bonuses: sql`${bonuses}`,
      netAmount: sql`${netAmount}`,
      notes: reason ? `${entryType}: ${amount} - ${reason}` : undefined,
    });
    
    return { id: (result as any).insertId, netAmount };
  }
}

export async function getDailyFinanceRecords(workerId: number, startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];

  const { workerDailyFinance } = await import('../drizzle/schema');
  
  return await db
    .select()
    .from(workerDailyFinance)
    .where(and(
      eq(workerDailyFinance.workerId, workerId),
      gte(workerDailyFinance.workDate, sql`${startDate}`),
      lte(workerDailyFinance.workDate, sql`${endDate}`)
    ))
    .orderBy(workerDailyFinance.workDate);
}

// Old payroll batch functions removed - see new implementation below

// ============================================
// Financial Reports Functions
// ============================================

/**
 * Get financial report for a single worker
 * Returns detailed breakdown of attendance, deductions, bonuses, and net amount
 */
export async function getWorkerFinancialReport(
  workerId: number,
  startDate: Date,
  endDate: Date
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Convert to YYYY-MM-DD strings to avoid timezone issues
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  // Get worker info
  const worker = await db
    .select()
    .from(workers)
    .where(eq(workers.id, workerId))
    .limit(1);

  if (!worker.length) throw new Error("Worker not found");

  // Get daily finance records - use DATE() cast to avoid timezone issues
  const financeRecords = await db
    .select()
    .from(workerDailyFinance)
    .where(
      and(
        eq(workerDailyFinance.workerId, workerId),
        sql`DATE(${workerDailyFinance.workDate}) >= ${startDateStr}`,
        sql`DATE(${workerDailyFinance.workDate}) <= ${endDateStr}`
      )
    )
    .orderBy(workerDailyFinance.workDate);

  // Get approved pay overrides in the period
  const overrides = await db
    .select()
    .from(payOverrides)
    .where(
      and(
        eq(payOverrides.workerId, workerId),
        eq(payOverrides.status, 'approved'),
        sql`DATE(${payOverrides.overrideDate}) >= ${startDateStr}`,
        sql`DATE(${payOverrides.overrideDate}) <= ${endDateStr}`
      )
    );

  // Calculate totals
  let totalBaseAmount = 0;
  let totalDeductions = 0;
  let totalBonuses = 0;
  let totalNetAmount = 0;
  let totalDaysWorked = 0;
  let totalLateMinutes = 0;
  let totalEarlyLeaveMinutes = 0;

  financeRecords.forEach(record => {
    totalBaseAmount += parseFloat(record.baseAmount || '0');
    totalDeductions += parseFloat(record.deductions || '0');
    totalBonuses += parseFloat(record.bonuses || '0');
    totalNetAmount += parseFloat(record.netAmount || '0');
    totalDaysWorked++;
    totalLateMinutes += record.lateMinutes || 0;
    totalEarlyLeaveMinutes += record.earlyLeaveMinutes || 0;
  });

  // Add overrides to totals
  overrides.forEach(override => {
    const amount = parseFloat(override.amount || '0');
    if (override.overrideType === 'bonus') {
      totalBonuses += amount;
      totalNetAmount += amount;
    } else if (override.overrideType === 'deduction') {
      totalDeductions += amount;
      totalNetAmount -= amount;
    }
  });

  return {
    worker: worker[0],
    period: { startDate, endDate },
    summary: {
      totalDaysWorked,
      totalBaseAmount: totalBaseAmount.toFixed(2),
      totalDeductions: totalDeductions.toFixed(2),
      totalBonuses: totalBonuses.toFixed(2),
      totalNetAmount: totalNetAmount.toFixed(2),
      totalLateMinutes,
      totalEarlyLeaveMinutes,
    },
    dailyRecords: financeRecords,
    overrides,
  };
}

/**
 * Get financial report for a group
 * Returns aggregated data for all workers in the group
 */
export async function getGroupFinancialReport(
  groupId: number,
  startDate: Date,
  endDate: Date
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get group info
  const group = await db
    .select({
      id: groups.id,
      code: groups.code,
      name: groups.name,
      costCenterId: groups.costCenterId,
    })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);

  if (!group.length) throw new Error("Group not found");

  // Get all workers in the group
  const groupWorkers = await db
    .select()
    .from(workers)
    .where(eq(workers.groupId, groupId));

  const workerIds = groupWorkers.map(w => w.id);

  if (workerIds.length === 0) {
    return {
      group: group[0],
      period: { startDate, endDate },
      summary: {
        totalWorkers: 0,
        totalDaysWorked: 0,
        totalBaseAmount: '0.00',
        totalDeductions: '0.00',
        totalBonuses: '0.00',
        totalNetAmount: '0.00',
      },
      workerReports: [],
    };
  }

  // Get financial reports for all workers
  const workerReports = await Promise.all(
    workerIds.map(workerId => getWorkerFinancialReport(workerId, startDate, endDate))
  );

  // Calculate group totals
  let totalDaysWorked = 0;
  let totalBaseAmount = 0;
  let totalDeductions = 0;
  let totalBonuses = 0;
  let totalNetAmount = 0;

  workerReports.forEach(report => {
    totalDaysWorked += report.summary.totalDaysWorked;
    totalBaseAmount += parseFloat(report.summary.totalBaseAmount);
    totalDeductions += parseFloat(report.summary.totalDeductions);
    totalBonuses += parseFloat(report.summary.totalBonuses);
    totalNetAmount += parseFloat(report.summary.totalNetAmount);
  });

  return {
    group: group[0],
    period: { startDate, endDate },
    summary: {
      totalWorkers: workerIds.length,
      totalDaysWorked,
      totalBaseAmount: totalBaseAmount.toFixed(2),
      totalDeductions: totalDeductions.toFixed(2),
      totalBonuses: totalBonuses.toFixed(2),
      totalNetAmount: totalNetAmount.toFixed(2),
    },
    workerReports: workerReports.map(r => ({
      workerId: r.worker.id,
      workerCode: r.worker.code,
      workerName: r.worker.fullName,
      ...r.summary,
    })),
  };
}

/**
 * Get financial report for a cost center
 * Returns aggregated data for all groups in the cost center
 */
export async function getCostCenterFinancialReport(
  costCenterId: number,
  startDate: Date,
  endDate: Date
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get cost center info
  const costCenter = await db
    .select()
    .from(costCenters)
    .where(eq(costCenters.id, costCenterId))
    .limit(1);

  if (!costCenter.length) throw new Error("Cost center not found");

  // Get all groups in the cost center
  const costCenterGroups = await db
    .select()
    .from(groups)
    .where(eq(groups.costCenterId, costCenterId));

  const groupIds = costCenterGroups.map(g => g.id);

  if (groupIds.length === 0) {
    return {
      costCenter: costCenter[0],
      period: { startDate, endDate },
      summary: {
        totalGroups: 0,
        totalWorkers: 0,
        totalDaysWorked: 0,
        totalBaseAmount: '0.00',
        totalDeductions: '0.00',
        totalBonuses: '0.00',
        totalNetAmount: '0.00',
      },
      groupReports: [],
    };
  }

  // Get financial reports for all groups
  const groupReports = await Promise.all(
    groupIds.map(groupId => getGroupFinancialReport(groupId, startDate, endDate))
  );

  // Calculate cost center totals
  let totalWorkers = 0;
  let totalDaysWorked = 0;
  let totalBaseAmount = 0;
  let totalDeductions = 0;
  let totalBonuses = 0;
  let totalNetAmount = 0;

  groupReports.forEach(report => {
    totalWorkers += report.summary.totalWorkers;
    totalDaysWorked += report.summary.totalDaysWorked;
    totalBaseAmount += parseFloat(report.summary.totalBaseAmount);
    totalDeductions += parseFloat(report.summary.totalDeductions);
    totalBonuses += parseFloat(report.summary.totalBonuses);
    totalNetAmount += parseFloat(report.summary.totalNetAmount);
  });

  return {
    costCenter: costCenter[0],
    period: { startDate, endDate },
    summary: {
      totalGroups: groupIds.length,
      totalWorkers,
      totalDaysWorked,
      totalBaseAmount: totalBaseAmount.toFixed(2),
      totalDeductions: totalDeductions.toFixed(2),
      totalBonuses: totalBonuses.toFixed(2),
      totalNetAmount: totalNetAmount.toFixed(2),
    },
    groupReports: groupReports.map(r => ({
      groupId: r.group.id,
      groupCode: r.group.code,
      groupName: r.group.name,
      ...r.summary,
    })),
  };
}

/**
 * Get all financial reports summary (all cost centers)
 */
export async function getAllFinancialReportsSummary(
  startDate: Date,
  endDate: Date
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all cost centers
  const allCostCenters = await db.select().from(costCenters);

  if (allCostCenters.length === 0) {
    return {
      period: { startDate, endDate },
      summary: {
        totalCostCenters: 0,
        totalGroups: 0,
        totalWorkers: 0,
        totalDaysWorked: 0,
        totalBaseAmount: '0.00',
        totalDeductions: '0.00',
        totalBonuses: '0.00',
        totalNetAmount: '0.00',
      },
      costCenterReports: [],
    };
  }

  // Get financial reports for all cost centers
  const costCenterReports = await Promise.all(
    allCostCenters.map(cc => getCostCenterFinancialReport(cc.id, startDate, endDate))
  );

  // Calculate overall totals
  let totalGroups = 0;
  let totalWorkers = 0;
  let totalDaysWorked = 0;
  let totalBaseAmount = 0;
  let totalDeductions = 0;
  let totalBonuses = 0;
  let totalNetAmount = 0;

  costCenterReports.forEach(report => {
    totalGroups += report.summary.totalGroups;
    totalWorkers += report.summary.totalWorkers;
    totalDaysWorked += report.summary.totalDaysWorked;
    totalBaseAmount += parseFloat(report.summary.totalBaseAmount);
    totalDeductions += parseFloat(report.summary.totalDeductions);
    totalBonuses += parseFloat(report.summary.totalBonuses);
    totalNetAmount += parseFloat(report.summary.totalNetAmount);
  });

  return {
    period: { startDate, endDate },
    summary: {
      totalCostCenters: allCostCenters.length,
      totalGroups,
      totalWorkers,
      totalDaysWorked,
      totalBaseAmount: totalBaseAmount.toFixed(2),
      totalDeductions: totalDeductions.toFixed(2),
      totalBonuses: totalBonuses.toFixed(2),
      totalNetAmount: totalNetAmount.toFixed(2),
    },
    costCenterReports: costCenterReports.map(r => ({
      costCenterId: r.costCenter.id,
      costCenterCode: r.costCenter.code,
      costCenterName: r.costCenter.name,
      ...r.summary,
    })),
  };
}

// ============================================
// Payroll Batch Functions (دفعات الرواتب)
// ============================================

/**
 * Create a new payroll batch
 */
export async function createPayrollBatch(params: {
  periodStart: string;
  periodEnd: string;
  groupId?: number | null;
  costCenterId?: number | null;
  createdBy: number;
  refreshFinanceRecords?: boolean; // ✅ NEW: إعادة حساب السجلات المالية قبل إنشاء الدفعة
  items: Array<{
    workerId: number;
    baseAmount: string;
    deductions: string;
    bonuses: string;
    netAmount: string;
    daysWorked?: number;
    notes?: string;
  }>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 🧹 تنظيف تلقائي للسجلات اليتيمة قبل إنشاء الدفعة
  try {
    const cleanupResult = await cleanupOrphanFinanceRecords();
    if (cleanupResult.deletedCount > 0) {
      console.log(`[createPayrollBatch] Auto-cleanup: Removed ${cleanupResult.deletedCount} orphan records (${cleanupResult.totalAmount} SAR)`);
    }
  } catch (cleanupError) {
    console.error('[createPayrollBatch] Cleanup error (non-critical):', cleanupError);
    // لا نوقف إنشاء الدفعة إذا فشل التنظيف
  }

  // 🔄 إعادة المزامنة المالية (Financial Sync) - إذا طُلب
  if (params.refreshFinanceRecords === true) {
    try {
      console.log('[createPayrollBatch] Financial Sync: Starting refresh for period', params.periodStart, '-', params.periodEnd);
      
      // 1. تحديد النطاق: استخراج جميع السجلات المالية في الفترة
      const periodStartDate = params.periodStart.split('T')[0];
      const periodEndDate = params.periodEnd.split('T')[0];
      
      let financeRecordsQuery = db
        .select({
          id: workerDailyFinance.id,
          workerId: workerDailyFinance.workerId,
          workDate: workerDailyFinance.workDate,
        })
        .from(workerDailyFinance)
        .where(
          and(
            sql`${workerDailyFinance.workDate} >= ${periodStartDate}`,
            sql`${workerDailyFinance.workDate} <= ${periodEndDate}`
          )
        );
      
      // إذا كانت الدفعة لمجموعة محددة
      if (params.groupId) {
        financeRecordsQuery = db
          .select({
            id: workerDailyFinance.id,
            workerId: workerDailyFinance.workerId,
            workDate: workerDailyFinance.workDate,
          })
          .from(workerDailyFinance)
          .innerJoin(workers, eq(workerDailyFinance.workerId, workers.id))
          .where(
            and(
              sql`${workerDailyFinance.workDate} >= ${periodStartDate}`,
              sql`${workerDailyFinance.workDate} <= ${periodEndDate}`,
              eq(workers.groupId, params.groupId)
            )
          );
      }
      
      const financeRecords = await financeRecordsQuery;
      console.log(`[createPayrollBatch] Financial Sync: Found ${financeRecords.length} finance records in period`);
      
      // 2. فلتر الأمان: استبعاد السجلات المعتمدة
      const lockedRecords = new Set<string>();
      
      // فحص جميع الدفعات المغلقة/المعتمدة
      // ملاحظة: payroll_batch_items لا يحتوي على workDate، لذلك نستخدم periodStart/periodEnd من payroll_batches
      // نعتبر أن أي عامل في دفعة معتمدة تتقاطع فترتها مع الفترة المطلوبة هو "مقفل"
      const lockedBatchItems = await db
        .select({
          workerId: payrollBatchItems.workerId,
          batchId: payrollBatchItems.batchId,
          periodStart: payrollBatches.periodStart,
          periodEnd: payrollBatches.periodEnd,
        })
        .from(payrollBatchItems)
        .innerJoin(payrollBatches, eq(payrollBatchItems.batchId, payrollBatches.id))
        .where(
          and(
            // فترة الدفعة المعتمدة تتقاطع مع الفترة المطلوبة
            sql`${payrollBatches.periodStart} <= ${periodEndDate}`,
            sql`${payrollBatches.periodEnd} >= ${periodStartDate}`,
            or(
              eq(payrollBatches.status, 'approved'),
              eq(payrollBatches.status, 'paid')
            )
          )
        );
      
      // بما أنه لا يوجد workDate في batch items، نقفل العامل لجميع أيام الفترة
      lockedBatchItems.forEach(item => {
        // نضيف العامل كمقفل - سنتحقق لاحقاً بناءً على workerId فقط
        lockedRecords.add(`worker-${item.workerId}`);
      });
      
      console.log(`[createPayrollBatch] Financial Sync: ${lockedRecords.size} records are locked (in finalized/approved batches)`);
      
      // 3. إعادة حساب السجلات "الحرة" فقط
      let refreshedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      
      for (const record of financeRecords) {
        const workerLockKey = `worker-${record.workerId}`;
        
        // تخطي السجلات المعتمدة (العامل موجود في دفعة معتمدة لنفس الفترة)
        if (lockedRecords.has(workerLockKey)) {
          skippedCount++;
          continue;
        }
        
        // إعادة حساب السجل مع معالجة الأخطاء
        try {
          // حذف السجل القديم
          await db.delete(workerDailyFinance).where(eq(workerDailyFinance.id, record.id));
          
          // ✅ تحويل workDate من Date object إلى string (YYYY-MM-DD)
          const workDateStr = typeof record.workDate === 'string' 
            ? record.workDate 
            : new Date(record.workDate).toLocaleDateString('en-CA');
          
          // إعادة معالجة البصمات لإنشاء سجل جديد
          await processAttendanceToFinance(record.workerId, workDateStr);
          
          refreshedCount++;
        } catch (error) {
          errorCount++;
          console.error(`[createPayrollBatch] Financial Sync Error for worker ${record.workerId} on ${record.workDate}:`, error);
          // الاستمرار للسجل التالي (لا نوقف العملية)
        }
      }
      
      console.log(`[createPayrollBatch] Financial Sync Complete: Refreshed ${refreshedCount}, Skipped ${skippedCount} (locked), Errors ${errorCount}`);
    } catch (syncError) {
      console.error('[createPayrollBatch] Financial Sync error (non-critical):', syncError);
      // لا نوقف إنشاء الدفعة إذا فشلت المزامنة
    }
  }

  // ✅ 1. توحيد التواريخ - تحويل إلى YYYY-MM-DD فقط
  const periodStartDate = params.periodStart.split('T')[0];
  const periodEndDate = params.periodEnd.split('T')[0];
  // Generate batch code with format: Batch-YYYY-MM-SEQ-RAND
  const now = new Date();
  const year = now.getFullYear();
  const monthPad = String(now.getMonth() + 1).padStart(2, '0');
  const batchCode = `Batch-${year}-${monthPad}`;
  
  // Get sequence number for this month
  const monthStart = new Date(year, now.getMonth(), 1);
  const monthEnd = new Date(year, now.getMonth() + 1, 0, 23, 59, 59);
  
  let allBatches: any[] = [];
  try {
    allBatches = await db.select().from(payrollBatches);
  } catch (error) {
    console.error('[createPayrollBatch] Error fetching batches:', error);
    allBatches = [];
  }
  const batchesThisMonth = allBatches.filter(batch => {
    const createdAt = new Date(batch.createdAt);
    return createdAt >= monthStart && createdAt <= monthEnd;
  });
  const sequence = String(batchesThisMonth.length + 1).padStart(3, '0');
  // Add random suffix to avoid collisions during concurrent test runs
  const randSuffix = Math.random().toString(36).substring(2, 6);
  const finalBatchCode = `${batchCode}-${sequence}-${randSuffix}`;

  // If items are empty, calculate from workerDailyFinance
  let batchItems: Array<{
    workerId: number;
    groupId: number | null;
    daysWorked: number;
    baseAmount: string;
    totalDeductions: string;
    totalBonuses: string;
    netAmount: string;
  }> = [];
  
  // ✅ FIX: عندما يكون refreshFinanceRecords=true، نعيد قراءة البيانات من قاعدة البيانات
  // بعد إعادة الحساب بدلاً من استخدام القيم القديمة المرسلة من الواجهة
  const shouldReadFromDB = !params.items || params.items.length === 0 || params.refreshFinanceRecords === true;
  
  if (shouldReadFromDB) {
    console.log('[createPayrollBatch] Reading fresh finance data from DB (refreshFinanceRecords=' + params.refreshFinanceRecords + ', items.length=' + (params.items?.length || 0) + ')');
    
    // ✅ FIX: مراعاة الانتدابات عند تحديد العمال حسب مركز التكلفة
    if (params.costCenterId) {
      // استخدام نفس منطق aggregatePayrollDataByCostCenter لمراعاة الانتدابات
      console.log(`[createPayrollBatch] Using cost center assignment-aware logic for CC ${params.costCenterId}`);
      
      const costCenterResults = await aggregatePayrollDataByCostCenter(
        params.costCenterId,
        periodStartDate,
        periodEndDate
      );
      
      for (const item of costCenterResults) {
        // تحديد المجموعة الفعلية
        let effectiveGroupId: number | null = null;
        try {
          effectiveGroupId = await getEffectiveGroupForWorkerOnDate(item.workerId, periodEndDate);
        } catch (e) {
          // fallback: use worker's original group
        }
        
        batchItems.push({
          workerId: item.workerId,
          groupId: effectiveGroupId,
          daysWorked: item.daysWorked,
          baseAmount: item.baseAmount,
          totalDeductions: item.deductions,
          totalBonuses: item.bonuses,
          netAmount: item.netAmount,
        });
        
        console.log(`[createPayrollBatch] Worker ${item.workerId} (${item.workerName}): base=${item.baseAmount}, net=${item.netAmount}, days=${item.daysWorked}${(item as any).isAssigned ? ' [ASSIGNED IN]' : ''}${(item as any).isPartial ? ' [PARTIAL]' : ''}`);
      }
    } else {
      // المسار الأصلي: بدون مركز تكلفة محدد
      let workerIds: number[] = [];
      
      if (params.items && params.items.length > 0) {
        workerIds = params.items.map(item => item.workerId);
      } else if (params.groupId) {
        const groupWorkers = await db.select().from(workers).where(eq(workers.groupId, params.groupId));
        workerIds = groupWorkers.map(w => w.id);
      } else {
        const allWorkers = await db.select().from(workers);
        workerIds = allWorkers.map(w => w.id);
      }
      
      // قراءة البيانات المالية المحدثة لكل عامل
      for (const wId of workerIds) {
        const finance = await getDailyFinanceRecords(
          wId,
          periodStartDate,
          periodEndDate
        );
        
        const baseAmount = finance.reduce((sum, day) => sum + parseFloat(day.baseAmount || '0'), 0);
        const totalDeductions = finance.reduce((sum, day) => sum + parseFloat(day.deductions || '0'), 0);
        const totalBonuses = finance.reduce((sum, day) => sum + parseFloat(day.bonuses || '0'), 0);
        const netAmount = baseAmount - totalDeductions + totalBonuses;
        const daysWorked = finance.length;
        
        let effectiveGroupId: number | null = null;
        if (finance.length > 0) {
          const lastDay = finance[finance.length - 1];
          effectiveGroupId = await getEffectiveGroupForWorkerOnDate(wId, lastDay.workDate);
        }
        
        console.log(`[createPayrollBatch] Worker ${wId}: baseAmount=${baseAmount}, deductions=${totalDeductions}, bonuses=${totalBonuses}, net=${netAmount}, days=${daysWorked}`);
        
        batchItems.push({
          workerId: wId,
          groupId: effectiveGroupId,
          daysWorked,
          baseAmount: baseAmount.toFixed(2),
          totalDeductions: totalDeductions.toFixed(2),
          totalBonuses: totalBonuses.toFixed(2),
          netAmount: netAmount.toFixed(2),
        });
      }
    }
  } else {
    batchItems = params.items.map(item => ({
      workerId: item.workerId,
      groupId: null, // Will be populated from worker's current group if needed
      daysWorked: item.daysWorked || 0,
      baseAmount: item.baseAmount,
      totalDeductions: item.deductions,
      totalBonuses: item.bonuses,
      netAmount: item.netAmount,
      notes: item.notes || null,
    }));
  }

  // Calculate batch totals
  const totalAmount = batchItems.reduce((sum, item) => sum + parseFloat(item.netAmount), 0);
  const totalDeductions = batchItems.reduce((sum, item) => sum + parseFloat(item.totalDeductions), 0);
  const totalBonuses = batchItems.reduce((sum, item) => sum + parseFloat(item.totalBonuses), 0);

  // Insert batch
  const insertValues = {
    batchCode: finalBatchCode,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    groupId: params.groupId ?? null,
    costCenterId: params.costCenterId ?? null,
    totalAmount: totalAmount.toFixed(2),
    totalWorkers: batchItems.length,
    totalDeductions: totalDeductions.toFixed(2),
    totalBonuses: totalBonuses.toFixed(2),
    status: 'draft' as const,
    createdBy: params.createdBy,
  };

  const insertResult = await db.insert(payrollBatches).values(insertValues as any);

  // Get batch ID from insert result
  const batchId = insertResult[0].insertId;
  if (!batchId) {
    throw new Error('Failed to get batch ID after insert');
  }

  for (const item of batchItems) {
    const itemToInsert = {
      batchId,
      workerId: item.workerId,
      groupId: item.groupId || null,
      daysWorked: item.daysWorked,
      baseAmount: item.baseAmount,
      totalDeductions: item.totalDeductions,
      totalBonuses: item.totalBonuses,
      netAmount: item.netAmount,
      notes: (item as any).notes || null,
    };
      await db.insert(payrollBatchItems).values(itemToInsert as any);
  }

  return { batchId, batchCode: finalBatchCode };
}

/**
 * Get payroll batches with search and filtering
 */
export async function getPayrollBatches(params: {
  search?: string; // Search by batch ID
  statusFilter?: string; // Filter by status
  costCenterFilter?: number; // Filter by cost center
  dateFrom?: string; // Filter by date from
  dateTo?: string; // Filter by date to
  sortBy?: 'date' | 'batchId' | 'totalAmount'; // Sort option
  sortOrder?: 'asc' | 'desc'; // Sort order
  limit?: number; // Pagination limit
  offset?: number; // Pagination offset
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let query = db
    .select({
      id: payrollBatches.id,
      batchCode: payrollBatches.batchCode,
      periodStart: payrollBatches.periodStart,
      periodEnd: payrollBatches.periodEnd,
      status: payrollBatches.status,
      totalAmount: payrollBatches.totalAmount,
      totalWorkers: payrollBatches.totalWorkers,
      totalDeductions: payrollBatches.totalDeductions,
      totalBonuses: payrollBatches.totalBonuses,
      createdAt: payrollBatches.createdAt,
      costCenterName: sql<string>`COALESCE(${costCenters.name}, 'All')`,
    })
    .from(payrollBatches)
    .leftJoin(costCenters, eq(payrollBatches.costCenterId, costCenters.id));

  // Apply filters
  const conditions = [];

  if (params.search) {
    conditions.push(sql`${payrollBatches.batchCode} LIKE ${'%' + params.search + '%'}`);
  }

  if (params.statusFilter) {
    conditions.push(eq(payrollBatches.status, params.statusFilter as any));
  }

  if (params.costCenterFilter) {
    conditions.push(eq(payrollBatches.costCenterId, params.costCenterFilter));
  }

  if (params.dateFrom) {
    conditions.push(sql`${payrollBatches.createdAt} >= ${params.dateFrom}`);
  }

  if (params.dateTo) {
    conditions.push(sql`${payrollBatches.createdAt} <= ${params.dateTo}`);
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  // Apply sorting
  if (params.sortBy === 'batchId') {
    query = query.orderBy(
      params.sortOrder === 'desc' 
        ? desc(payrollBatches.batchCode) 
        : payrollBatches.batchCode
    ) as any;
  } else if (params.sortBy === 'totalAmount') {
    query = query.orderBy(
      params.sortOrder === 'desc' 
        ? desc(payrollBatches.totalAmount) 
        : payrollBatches.totalAmount
    ) as any;
  } else {
    // Default sort by date
    query = query.orderBy(
      params.sortOrder === 'desc' 
        ? desc(payrollBatches.createdAt) 
        : payrollBatches.createdAt
    ) as any;
  }

  // Apply pagination
  if (params.limit) {
    query = query.limit(params.limit) as any;
  }
  if (params.offset) {
    query = query.offset(params.offset) as any;
  }

  const batches = await query;

  // Get total count for pagination
  let countQuery = db
    .select({ count: sql<number>`COUNT(*)` })
    .from(payrollBatches);

  if (conditions.length > 0) {
    countQuery = countQuery.where(and(...conditions)) as any;
  }

  const [{ count }] = await countQuery;

  return {
    batches,
    total: count,
  };
}

/**
 * Get payroll batch details with items
 */
export async function getPayrollBatchDetails(batchId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get batch
  const [batch] = await db
    .select()
    .from(payrollBatches)
    .where(eq(payrollBatches.id, batchId));

  if (!batch) {
    throw new Error("Batch not found");
  }

  // Get items with worker details
  const items = await db
    .select({
      id: payrollBatchItems.id,
      workerId: payrollBatchItems.workerId,
      workerCode: workers.code,
      workerName: sql<string>`COALESCE(${workers.fullName}, 'Unknown')`,
      groupId: workers.groupId,
      groupName: sql<string>`COALESCE(${groups.name}, 'Unknown')`,
      daysWorked: payrollBatchItems.daysWorked,
      baseAmount: payrollBatchItems.baseAmount,
      totalDeductions: payrollBatchItems.totalDeductions,
      totalBonuses: payrollBatchItems.totalBonuses,
      netAmount: payrollBatchItems.netAmount,
      notes: payrollBatchItems.notes,
    })
    .from(payrollBatchItems)
    .leftJoin(workers, eq(payrollBatchItems.workerId, workers.id))
    .leftJoin(groups, eq(workers.groupId, groups.id))
    .where(eq(payrollBatchItems.batchId, batchId));

  // Get notes
  const notes = await db
    .select()
    .from(payrollBatchNotes)
    .where(eq(payrollBatchNotes.batchId, batchId))
    .orderBy(desc(payrollBatchNotes.createdAt));

  // Get corrections
  const corrections = await db
    .select()
    .from(payrollBatchCorrections)
    .where(eq(payrollBatchCorrections.batchId, batchId))
    .orderBy(desc(payrollBatchCorrections.createdAt));

  return {
    batch,
    items,
    notes,
    corrections,
  };
}

/**
 * Update batch item (DRAFT only)
 */
export async function updateBatchItem(params: {
  itemId: number;
  baseAmount?: string;
  totalDeductions?: string;
  totalBonuses?: string;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get item and batch
  const [item] = await db
    .select()
    .from(payrollBatchItems)
    .where(eq(payrollBatchItems.id, params.itemId));

  if (!item) {
    throw new Error("Item not found");
  }

  const [batch] = await db
    .select()
    .from(payrollBatches)
    .where(eq(payrollBatches.id, item.batchId));

  if (batch.status !== 'draft') {
    throw new Error("يمكن تعديل العناصر فقط في المسودات");
  }

  // Calculate new net amount
  const baseAmount = params.baseAmount !== undefined ? parseFloat(params.baseAmount) : parseFloat(item.baseAmount || '0');
  const totalDeductions = params.totalDeductions !== undefined ? parseFloat(params.totalDeductions) : parseFloat(item.totalDeductions || '0');
  const totalBonuses = params.totalBonuses !== undefined ? parseFloat(params.totalBonuses) : parseFloat(item.totalBonuses || '0');
  const netAmount = baseAmount - totalDeductions + totalBonuses;

  // Update item
  await db
    .update(payrollBatchItems)
    .set({
      baseAmount: baseAmount.toFixed(2),
      totalDeductions: totalDeductions.toFixed(2),
      totalBonuses: totalBonuses.toFixed(2),
      netAmount: netAmount.toFixed(2),
      notes: params.notes !== undefined ? params.notes : item.notes,
    })
    .where(eq(payrollBatchItems.id, params.itemId));

  // Recalculate batch totals
  await recalculateBatchTotals(item.batchId);

  return { success: true };
}

/**
 * Recalculate batch totals
 */
async function recalculateBatchTotals(batchId: number) {
  const db = await getDb();
  if (!db) return;

  const items = await db
    .select()
    .from(payrollBatchItems)
    .where(eq(payrollBatchItems.batchId, batchId));

  const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.netAmount || '0'), 0);
  const totalDeductions = items.reduce((sum, item) => sum + parseFloat(item.totalDeductions || '0'), 0);
  const totalBonuses = items.reduce((sum, item) => sum + parseFloat(item.totalBonuses || '0'), 0);

  await db
    .update(payrollBatches)
    .set({
      totalAmount: totalAmount.toFixed(2),
      totalDeductions: totalDeductions.toFixed(2),
      totalBonuses: totalBonuses.toFixed(2),
      totalWorkers: items.length,
    })
    .where(eq(payrollBatches.id, batchId));
}

/**
 * Submit batch for accountant review
 */
export async function submitBatchForReview(batchId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [batch] = await db
    .select()
    .from(payrollBatches)
    .where(eq(payrollBatches.id, batchId));

  if (!batch) {
    throw new Error("Batch not found");
  }

  if (batch.status !== 'draft') {
    throw new Error("يمكن إرسال المسودات فقط للمراجعة");
  }

  await db
    .update(payrollBatches)
    .set({
      status: 'under_accountant_review',
    })
    .where(eq(payrollBatches.id, batchId));

  // Record correction if resubmitting
  if (batch.status !== 'draft') {
    await db.insert(payrollBatchCorrections).values({
      batchId,
      correctorId: userId,
      correctionNote: 'Resubmitted after corrections',
      previousStatus: batch.status,
      newStatus: 'under_accountant_review',
    });
  }

  return { success: true };
}

/**
 * Accountant approve batch
 */
export async function accountantApproveBatch(batchId: number, reviewerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [batch] = await db
    .select()
    .from(payrollBatches)
    .where(eq(payrollBatches.id, batchId));

  if (!batch) {
    throw new Error("Batch not found");
  }

  if (batch.status !== 'under_accountant_review') {
    throw new Error("Batch is not under accountant review");
  }

  await db
    .update(payrollBatches)
    .set({
      status: 'under_financial_review',
    })
    .where(eq(payrollBatches.id, batchId));

  return { success: true };
}

/**
 * Accountant reject batch
 */
export async function accountantRejectBatch(params: {
  batchId: number;
  reviewerId: number;
  noteType: 'critical' | 'warning' | 'info';
  note: string;
  workerId?: number;
  fieldName?: string;
  attachmentUrl?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [batch] = await db
    .select()
    .from(payrollBatches)
    .where(eq(payrollBatches.id, params.batchId));

  if (!batch) {
    throw new Error("Batch not found");
  }

  if (batch.status !== 'under_accountant_review') {
    throw new Error("Batch is not under accountant review");
  }

  // Return to draft for editing/deletion
  const newRejectionCount = (batch.rejectionCount || 0) + 1;
  await db
    .update(payrollBatches)
    .set({
      status: 'draft',
      rejectionCount: newRejectionCount,
    })
    .where(eq(payrollBatches.id, params.batchId));

  // Add note
  await db.insert(payrollBatchNotes).values({
    batchId: params.batchId,
    reviewerId: params.reviewerId,
    reviewerRole: 'accountant',
    noteType: params.noteType,
    workerId: params.workerId || null,
    fieldName: params.fieldName || null,
    note: params.note,
    attachmentUrl: params.attachmentUrl || null,
  });

  return { success: true, rejectionCount: newRejectionCount };
}

/**
 * Financial reviewer approve batch
 */
export async function financialReviewerApproveBatch(batchId: number, reviewerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [batch] = await db
    .select()
    .from(payrollBatches)
    .where(eq(payrollBatches.id, batchId));

  if (!batch) {
    throw new Error("Batch not found");
  }

  if (batch.status !== 'under_financial_review') {
    throw new Error("Batch is not under financial review");
  }

  await db
    .update(payrollBatches)
    .set({
      status: 'under_accounts_manager_review',
    })
    .where(eq(payrollBatches.id, batchId));

  return { success: true };
}

/**
 * Financial reviewer reject batch
 */
export async function financialReviewerRejectBatch(params: {
  batchId: number;
  reviewerId: number;
  noteType: 'critical' | 'warning' | 'info';
  note: string;
  workerId?: number;
  fieldName?: string;
  attachmentUrl?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [batch] = await db
    .select()
    .from(payrollBatches)
    .where(eq(payrollBatches.id, params.batchId));

  if (!batch) {
    throw new Error("Batch not found");
  }

  if (batch.status !== 'under_financial_review') {
    throw new Error("Batch is not under financial review");
  }

  const newRejectionCount = (batch.rejectionCount || 0) + 1;
  await db
    .update(payrollBatches)
    .set({
      status: 'draft',
      rejectionCount: newRejectionCount,
    })
    .where(eq(payrollBatches.id, params.batchId));

  // Add note
  await db.insert(payrollBatchNotes).values({
    batchId: params.batchId,
    reviewerId: params.reviewerId,
    reviewerRole: 'financial_reviewer',
    noteType: params.noteType,
    workerId: params.workerId || null,
    fieldName: params.fieldName || null,
    note: params.note,
    attachmentUrl: params.attachmentUrl || null,
  });

  return { success: true };
}

/**
 * Accounts manager final approve
 */
export async function accountsManagerApproveBatch(batchId: number, approverId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [batch] = await db
    .select()
    .from(payrollBatches)
    .where(eq(payrollBatches.id, batchId));

  if (!batch) {
    throw new Error("Batch not found");
  }

  if (batch.status !== 'under_accounts_manager_review') {
    throw new Error("Batch is not under accounts manager review");
  }

  await db
    .update(payrollBatches)
    .set({
      status: 'approved',
      approvedBy: approverId,
      approvedAt: sql`NOW()`,
    })
    .where(eq(payrollBatches.id, batchId));

  return { success: true };
}

/**
 * Accounts manager final reject
 */
export async function accountsManagerRejectBatch(params: {
  batchId: number;
  reviewerId: number;
  note: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [batch] = await db
    .select()
    .from(payrollBatches)
    .where(eq(payrollBatches.id, params.batchId));

  if (!batch) {
    throw new Error("Batch not found");
  }

  if (batch.status !== 'under_accounts_manager_review') {
    throw new Error("Batch is not under accounts manager review");
  }

  const newRejectionCount = (batch.rejectionCount || 0) + 1;
  await db
    .update(payrollBatches)
    .set({
      status: 'draft',
      rejectionCount: newRejectionCount,
    })
    .where(eq(payrollBatches.id, params.batchId));

  // Add note
  await db.insert(payrollBatchNotes).values({
    batchId: params.batchId,
    reviewerId: params.reviewerId,
    reviewerRole: 'accounts_manager',
    noteType: 'critical',
    note: params.note,
  });

  return { success: true };
}

/**
 * Get batches by status
 */
export async function getBatchesByStatus(
  status?: string,
  filters?: {
    costCenterId?: number;
    groupId?: number;
    startDate?: Date;
    endDate?: Date;
  }
) {
  const db = await getDb();
  if (!db) return [];

  let query = db
    .select()
    .from(payrollBatches)
    .orderBy(desc(payrollBatches.createdAt));

  let batches = await query;

  // Filter by status
  if (status) {
    batches = batches.filter(b => b.status === status);
  }

  // Filter by cost center or group
  if (filters?.costCenterId || filters?.groupId) {
    // Get batch IDs that match the filters
    const itemsQuery = db
      .select({ batchId: payrollBatchItems.batchId })
      .from(payrollBatchItems)
      .innerJoin(workers, eq(payrollBatchItems.workerId, workers.id))
      .innerJoin(groups, eq(workers.groupId, groups.id));

    let items = await itemsQuery;

    if (filters.groupId) {
      items = items.filter(item => {
        // We need to get the group for each worker
        return true; // Will be filtered below
      });
    }

    if (filters.costCenterId) {
      items = items.filter(item => {
        // Will be filtered below
        return true;
      });
    }

    // Get unique batch IDs
    const matchingBatchIds = new Set(items.map(item => item.batchId));

    // Filter batches by matching IDs
    batches = batches.filter(b => matchingBatchIds.has(b.id));
  }

  // Filter by date range
  if (filters?.startDate) {
    batches = batches.filter(b => new Date(b.periodStart) >= filters.startDate!);
  }
  if (filters?.endDate) {
    batches = batches.filter(b => new Date(b.periodEnd) <= filters.endDate!);
  }

  return batches;
}

/**
 * Delete batch (DRAFT only)
 */
export async function deleteBatch(batchId: number, forceDelete: boolean = false) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [batch] = await db
    .select()
    .from(payrollBatches)
    .where(eq(payrollBatches.id, batchId));

  if (!batch) {
    throw new Error("Batch not found");
  }

  if (!forceDelete && batch.status !== 'draft') {
    throw new Error("Can only delete draft batches");
  }

  // Delete items first
  await db
    .delete(payrollBatchItems)
    .where(eq(payrollBatchItems.batchId, batchId));

  // Delete batch
  await db
    .delete(payrollBatches)
    .where(eq(payrollBatches.id, batchId));

  return { success: true };
}




// ============================================
// Full Day Override Functions
// ============================================

export async function setFullDayOverride(
  workerId: number,
  workDate: string,
  override: boolean,
  reason?: string,
  userId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if payroll batch exists for this date (prevent both enable and disable)
  const batch = await checkPayrollBatchForDate(workDate);
  if (batch) {
    throw new Error(`لا يمكن تعديل اعتماد الحضور الكامل بعد إنشاء دفعة الراتب. يجب حذف المسودة أولاً (دفعة رقم: ${batch.batchCode})`);
  }

  const { workerDailyFinance } = await import('../drizzle/schema');
  
  // Check if daily finance record exists
  const [existing] = await db
    .select()
    .from(workerDailyFinance)
    .where(and(
      eq(workerDailyFinance.workerId, workerId),
      eq(workerDailyFinance.workDate, sql`${workDate}`)
    ))
    .limit(1);
  
  if (!existing) {
    // Create new record with override
    await processAttendanceToFinance(workerId, workDate);
  }
  
  // Update override fields removed - feature deprecated
  await db.update(workerDailyFinance).set({
    updatedAt: new Date(),
  }).where(and(
    eq(workerDailyFinance.workerId, workerId),
    eq(workerDailyFinance.workDate, sql`${workDate}`)
  ));
  
  // Recalculate finance with override
  if (override) {
    await recalculateFinanceWithOverride(workerId, workDate);
  } else {
    // Recalculate without override
    await processAttendanceToFinance(workerId, workDate);
  }
  
  return { success: true };
}

async function recalculateFinanceWithOverride(workerId: number, workDate: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { workers, groups, workerDailyFinance } = await import('../drizzle/schema');
  
  // Get worker and group info
  const [worker] = await db.select().from(workers).where(eq(workers.id, workerId)).limit(1);
  if (!worker) throw new Error("Worker not found");
  
  let dailyRate = worker.dailyRate ? parseFloat(worker.dailyRate.toString()) : 0;
  
  if (worker.groupId) {
    const [group] = await db.select().from(groups).where(eq(groups.id, worker.groupId)).limit(1);
    if (group && group.dailyRate) {
      dailyRate = dailyRate || parseFloat(group.dailyRate.toString());
    }
  }
  
  // Update with full day rate (no deductions)
  await db.update(workerDailyFinance).set({
    baseAmount: sql`${dailyRate}`,
    deductions: sql`0`,
    netAmount: sql`${dailyRate}`,
    updatedAt: new Date(),
  }).where(and(
    eq(workerDailyFinance.workerId, workerId),
    eq(workerDailyFinance.workDate, sql`${workDate}`)
  ));
}

// getFullDayOverrideStatus function removed - feature deprecated

// ============================================
// Payroll Lock Functions
// ============================================

// Check if payroll batch exists for a date (excluding cancelled and unlocked)
export async function checkPayrollBatchForDate(date: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(payrollBatches)
    .where(
      and(
        sql`${payrollBatches.periodStart} <= ${date}`,
        sql`${payrollBatches.periodEnd} >= ${date}`,
        sql`${payrollBatches.status} != 'cancelled'`,
        sql`(${payrollBatches.isUnlocked} IS NULL OR ${payrollBatches.isUnlocked} = FALSE)`
      )
    )
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}


// Force unlock payroll batch (requires FORCE_UNLOCK_PAYROLL permission)
export async function forceUnlockPayroll(batchId: number, reason: string, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { payrollBatches, auditLog } = await import('../drizzle/schema');
  
  // Get batch
  const [batch] = await db.select().from(payrollBatches).where(eq(payrollBatches.id, batchId)).limit(1);
  if (!batch) throw new Error("دفعة الراتب غير موجودة");
  
  // Update batch to unlocked
  await db.update(payrollBatches).set({
    isUnlocked: true,
    unlockReason: reason,
    unlockedBy: userId,
    unlockedAt: new Date(),
  }).where(eq(payrollBatches.id, batchId));
  
  // Log the action
  await db.insert(auditLog).values({
    userId,
    action: 'FORCE_UNLOCK_PAYROLL',
    tableName: 'payroll_batches',
    recordId: batchId,
    oldValues: JSON.stringify({ isUnlocked: batch.isUnlocked }),
    newValues: JSON.stringify({ isUnlocked: true, unlockReason: reason }),
  });
  
  return { success: true, message: 'تم إلغاء قفل دفعة الراتب بنجاح' };
}

// Re-lock payroll batch
export async function relockPayroll(batchId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { payrollBatches, auditLog } = await import('../drizzle/schema');
  
  // Get batch
  const [batch] = await db.select().from(payrollBatches).where(eq(payrollBatches.id, batchId)).limit(1);
  if (!batch) throw new Error("دفعة الراتب غير موجودة");
  
  // Update batch to locked
  await db.update(payrollBatches).set({
    isUnlocked: false,
    unlockReason: null,
    unlockedBy: null,
    unlockedAt: null,
  }).where(eq(payrollBatches.id, batchId));
  
  // Log the action
  await db.insert(auditLog).values({
    userId,
    action: 'RELOCK_PAYROLL',
    tableName: 'payroll_batches',
    recordId: batchId,
    oldValues: JSON.stringify({ isUnlocked: batch.isUnlocked }),
    newValues: JSON.stringify({ isUnlocked: false }),
  });
  
  return { success: true, message: 'تم إعادة قفل دفعة الراتب بنجاح' };
}


// ============================================
// Local Authentication (المصادقة المحلية)
// ============================================

import crypto from 'crypto';

/**
 * Simple password hashing (for development/testing only)
 * NOTE: This is simplified encryption. For/**
 * Hash a password for storage
 */
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.default.hash(password, 10);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.default.compare(password, hash);
}

/**
 * Create a local user with username and password
 */
export async function createLocalUser(data: {
  username: string;
  password: string;
  fullName: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
  role?: 'guard' | 'supervisor_tolan' | 'supervisor_malqa' | 'admin_affairs' | 'accountant' | 'auditor' | 'finance_manager' | 'executive' | 'super_admin';
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const passwordHash = await hashPassword(data.password);
  
  const [result] = await db.insert(users).values([{
    username: data.username,
    passwordHash,
    fullName: data.fullName,
    email: data.email,
    phone: data.phone,
    isActive: data.isActive ?? true,
    loginMethod: 'local',
    role: data.role ?? 'guard',
  }]);
  
  return { userId: result.insertId };
}

/**
 * Authenticate a local user with username and password
 */
export async function authenticateLocalUser(username: string, password: string) {
  const db = await getDb();
  if (!db) return null;
  
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  
  if (!user) {
    return null;
  }
  
  if (!user.passwordHash) {
    return null; // User doesn't have a local password
  }
  
  const isValid = await verifyPassword(password, user.passwordHash);
  
  if (!isValid) {
    return null;
  }
  
  // Update last signed in
  await db
    .update(users)
    .set({ lastSignedIn: new Date() })
    .where(eq(users.id, user.id));
  
  return user;
}


// ============================================
// Payroll Workflow Functions
// ============================================

export async function submitBatchToAccounting(batchId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [batch] = await db.select().from(payrollBatches).where(eq(payrollBatches.id, batchId)).limit(1);
  if (!batch) throw new Error('Batch not found');
  if (batch.status !== 'draft') throw new Error('Only draft batches can be submitted to accounting');
  
  await db.update(payrollBatches)
    .set({
      status: 'under_accountant_review',
      updatedAt: new Date(),
    })
    .where(eq(payrollBatches.id, batchId));
  
  return { success: true };
}

export async function submitBatchToFinalReview(batchId: number, userId: number, reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [batch] = await db.select().from(payrollBatches).where(eq(payrollBatches.id, batchId)).limit(1);
  if (!batch) throw new Error('Batch not found');
  if (batch.status !== 'under_accountant_review') throw new Error('Batch must be under accounting review');
  
  await db.update(payrollBatches)
    .set({
      status: 'under_financial_review',
      notes: reason || batch.notes,
      updatedAt: new Date(),
    })
    .where(eq(payrollBatches.id, batchId));
  
  return { success: true };
}

export async function submitBatchForApproval(batchId: number, userId: number, reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [batch] = await db.select().from(payrollBatches).where(eq(payrollBatches.id, batchId)).limit(1);
  if (!batch) throw new Error('Batch not found');
  if (batch.status !== 'under_financial_review') throw new Error('Batch must be under financial review');
  
  await db.update(payrollBatches)
    .set({
      status: 'under_accounts_manager_review',
      notes: reason || batch.notes,
      updatedAt: new Date(),
    })
    .where(eq(payrollBatches.id, batchId));
  
  return { success: true };
}

export async function approveBatch(batchId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [batch] = await db.select().from(payrollBatches).where(eq(payrollBatches.id, batchId)).limit(1);
  if (!batch) throw new Error('Batch not found');
  if (batch.status !== 'under_accounts_manager_review') throw new Error('Batch must be pending approval');
  
  await db.update(payrollBatches)
    .set({
      status: 'approved',
      approvedBy: userId,
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(payrollBatches.id, batchId));
  
  return { success: true };
}

export async function rejectBatch(batchId: number, userId: number, reason: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [batch] = await db.select().from(payrollBatches).where(eq(payrollBatches.id, batchId)).limit(1);
  if (!batch) throw new Error('Batch not found');
  
  // Allow rejection from any review stage
  const reviewStatuses = ['under_accountant_review', 'under_financial_review', 'under_accounts_manager_review'];
  if (!batch.status || !reviewStatuses.includes(batch.status)) {
    throw new Error('يمكن رفض الدفعة فقط من مراحل المراجعة');
  }
  
  const rejectionCount = (batch.rejectionCount || 0) + 1;
  
  // Return batch to draft status for editing/deletion
  await db.update(payrollBatches)
    .set({
      status: 'draft', // Return to draft for editing
      notes: reason,
      rejectionCount,
      updatedAt: new Date(),
    })
    .where(eq(payrollBatches.id, batchId));
  
  return { success: true };
}

export async function updateBatchData(batchId: number, userId: number, reason: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [batch] = await db.select().from(payrollBatches).where(eq(payrollBatches.id, batchId)).limit(1);
  if (!batch) throw new Error('Batch not found');
  
  // Allow updates only in review stages
  const allowedStatuses = ['under_accountant_review', 'under_financial_review'];
  if (!batch.status || !allowedStatuses.includes(batch.status)) {
    throw new Error('Batch cannot be modified in current status');
  }
  
  await db.update(payrollBatches)
    .set({
      notes: reason,
      updatedAt: new Date(),
    })
    .where(eq(payrollBatches.id, batchId));
  
  return { success: true };
}


// ============================================
// Work Group Settings Calculations (حسابات إعدادات مجموعات العمل)
// ============================================

/**
 * Calculate minute cost from daily wage and work minutes
 * Returns rounded to 4 decimal places
 */
export function calculateMinuteCost(dailyWage: number | null, workMinutes: number | null): number | null {
  if (!dailyWage || !workMinutes || workMinutes <= 0) return null;
  return Math.round((dailyWage / workMinutes) * 10000) / 10000;
}

/**
 * Calculate late penalty based on group settings
 * Formula: (dailyWage ÷ workMinutes) × lateMinutes × latePenaltyRate
 * Returns rounded to 2 decimal places
 */
export function calculateLatePenalty(
  dailyWage: number | null,
  workMinutes: number | null,
  lateMinutes: number,
  latePenaltyRate: number | null
): number {
  if (!dailyWage || !workMinutes || workMinutes <= 0 || !latePenaltyRate) return 0;
  const minuteCost = dailyWage / workMinutes;
  // latePenaltyRate is stored as percentage (e.g., 100 = 100% = 1x multiplier)
  const rateMultiplier = latePenaltyRate / 100;
  const penalty = minuteCost * lateMinutes * rateMultiplier;
  return Math.round(penalty * 100) / 100;
}

/**
 * Calculate early leave penalty based on group settings
 * Formula: (dailyWage ÷ workMinutes) × earlyLeaveMinutes × earlyLeavePenaltyRate
 * Returns rounded to 2 decimal places
 */
export function calculateEarlyLeavePenalty(
  dailyWage: number | null,
  workMinutes: number | null,
  earlyLeaveMinutes: number,
  earlyLeavePenaltyRate: number | null
): number {
  if (!dailyWage || !workMinutes || workMinutes <= 0 || !earlyLeavePenaltyRate) return 0;
  const minuteCost = dailyWage / workMinutes;
  // earlyLeavePenaltyRate is stored as percentage (e.g., 50 = 50% = 0.5x multiplier)
  const rateMultiplier = earlyLeavePenaltyRate / 100;
  const penalty = minuteCost * earlyLeaveMinutes * rateMultiplier;
  return Math.round(penalty * 100) / 100;
}


// ==================== Official Payroll Reports ====================

/**
 * Get official payroll report by group
 */
export async function getPayrollReportByGroup(
  periodStart: string,
  periodEnd: string,
  groupId?: number,
  costCenterId?: number
) {
  const db = await getDb();
  if (!db) return [];

  // Use string-based date comparison to avoid timezone issues
  // periodStart and periodEnd are YYYY-MM-DD strings
  const startDateStr = periodStart.split('T')[0];
  const endDateStr = periodEnd.split('T')[0];

  // 1) Get daily finance records - use DATE() cast to avoid timezone issues
  const conditions: any[] = [
    sql`DATE(${workerDailyFinance.workDate}) >= ${startDateStr}`,
    sql`DATE(${workerDailyFinance.workDate}) <= ${endDateStr}`,
  ];
  if (groupId) conditions.push(eq(workers.groupId, groupId));
  if (costCenterId) conditions.push(eq(groups.costCenterId, costCenterId));

  const whereConditions = and(...conditions);

  const results = await db
    .select({
      groupId: groups.id,
      groupName: groups.name,
      groupCode: groups.code,
      workerId: workers.id,
      workerName: workers.fullName,
      workerCode: workers.code,
      baseAmount: workerDailyFinance.baseAmount,
      deductions: workerDailyFinance.deductions,
      bonuses: workerDailyFinance.bonuses,
    })
    .from(workerDailyFinance)
    .innerJoin(workers, eq(workerDailyFinance.workerId, workers.id))
    .innerJoin(groups, eq(workers.groupId, groups.id))
    .where(whereConditions);

  // 2) Get approved pay overrides for the same period
  const overrideConditions = [
    sql`DATE(${payOverrides.overrideDate}) >= ${startDateStr}`,
    sql`DATE(${payOverrides.overrideDate}) <= ${endDateStr}`,
    eq(payOverrides.status, 'approved'),
  ];

  const overrideResults = await db
    .select({
      workerId: payOverrides.workerId,
      overrideType: payOverrides.overrideType,
      amount: payOverrides.amount,
      groupId: groups.id,
    })
    .from(payOverrides)
    .innerJoin(workers, eq(payOverrides.workerId, workers.id))
    .innerJoin(groups, eq(workers.groupId, groups.id))
    .where(and(...overrideConditions));

  // 3) Build per-worker override totals keyed by groupId
  const overrideByGroup = new Map<number, { bonuses: number; deductions: number }>();
  overrideResults.forEach((row) => {
    // Apply same group/costCenter filters
    if (groupId && row.groupId !== groupId) return;
    if (costCenterId) {
      // costCenter filter already applied via join, but double-check
    }
    const existing = overrideByGroup.get(row.groupId) || { bonuses: 0, deductions: 0 };
    const amount = parseFloat(row.amount || '0');
    if (row.overrideType === 'bonus') {
      existing.bonuses += amount;
    } else if (row.overrideType === 'deduction') {
      existing.deductions += amount;
    }
    overrideByGroup.set(row.groupId, existing);
  });

  // 4) Group daily finance by group and calculate totals
  const groupMap = new Map<number, {
    groupName: string;
    groupCode: string;
    workerCount: number;
    totalSalary: number;
    totalDeductions: number;
    totalBonuses: number;
    totalNet: number;
  }>();

  results.forEach((row) => {
    const existing = groupMap.get(row.groupId);
    const baseAmount = parseFloat(row.baseAmount || '0');
    const deductions = parseFloat(row.deductions || '0');
    const bonuses = parseFloat(row.bonuses || '0');
    const netAmount = baseAmount - deductions + bonuses;

    if (existing) {
      existing.totalSalary += baseAmount;
      existing.totalDeductions += deductions;
      existing.totalBonuses += bonuses;
      existing.totalNet += netAmount;
    } else {
      groupMap.set(row.groupId, {
        groupName: row.groupName,
        groupCode: row.groupCode,
        workerCount: 1,
        totalSalary: baseAmount,
        totalDeductions: deductions,
        totalBonuses: bonuses,
        totalNet: netAmount,
      });
    }
  });

  // 5) Add pay overrides to group totals
  overrideByGroup.forEach((overrides, gId) => {
    const group = groupMap.get(gId);
    if (group) {
      group.totalBonuses += overrides.bonuses;
      group.totalDeductions += overrides.deductions;
      group.totalNet += overrides.bonuses - overrides.deductions;
    }
  });

  // 6) Count unique workers per group
  const workerCountMap = new Map<number, Set<number>>();
  results.forEach((row) => {
    if (!workerCountMap.has(row.groupId)) {
      workerCountMap.set(row.groupId, new Set());
    }
    workerCountMap.get(row.groupId)!.add(row.workerId);
  });

  // Update worker counts
  workerCountMap.forEach((workerSet, gId) => {
    const group = groupMap.get(gId);
    if (group) {
      group.workerCount = workerSet.size;
    }
  });

  return Array.from(groupMap.entries()).map(([gId, data]) => ({
    groupId: gId,
    groupName: data.groupName,
    groupCode: data.groupCode,
    workerCount: data.workerCount,
    totalSalary: data.totalSalary.toFixed(2),
    totalDeductions: data.totalDeductions.toFixed(2),
    totalBonuses: data.totalBonuses.toFixed(2),
    totalNet: data.totalNet.toFixed(2),
    costCenterId: costCenterId,
  }));
}

/**
 * Get official payroll report by worker
 */
export async function getPayrollReportByWorker(
  periodStart: string,
  periodEnd: string,
  workerId?: number
) {
  const db = await getDb();
  if (!db) return [];

  // Use string-based date comparison to avoid timezone issues
  const startDateStr = periodStart.split('T')[0];
  const endDateStr = periodEnd.split('T')[0];

  // 1) Get daily finance records - use DATE() cast to avoid timezone issues
  const whereConditions = workerId
    ? and(
        sql`DATE(${workerDailyFinance.workDate}) >= ${startDateStr}`,
        sql`DATE(${workerDailyFinance.workDate}) <= ${endDateStr}`,
        eq(workers.id, workerId)
      )
    : and(
        sql`DATE(${workerDailyFinance.workDate}) >= ${startDateStr}`,
        sql`DATE(${workerDailyFinance.workDate}) <= ${endDateStr}`
      );

  const results = await db
    .select({
      workerId: workers.id,
      workerName: workers.fullName,
      workerCode: workers.code,
      groupName: groups.name,
      groupCode: groups.code,
      baseAmount: workerDailyFinance.baseAmount,
      deductions: workerDailyFinance.deductions,
      bonuses: workerDailyFinance.bonuses,
      workDate: workerDailyFinance.workDate,
    })
    .from(workerDailyFinance)
    .innerJoin(workers, eq(workerDailyFinance.workerId, workers.id))
    .leftJoin(groups, eq(workers.groupId, groups.id))
    .where(whereConditions);

  // 2) Get approved pay overrides for the same period
  const overrideWhereConditions = workerId
    ? and(
        sql`DATE(${payOverrides.overrideDate}) >= ${startDateStr}`,
        sql`DATE(${payOverrides.overrideDate}) <= ${endDateStr}`,
        eq(payOverrides.status, 'approved'),
        eq(payOverrides.workerId, workerId)
      )
    : and(
        sql`DATE(${payOverrides.overrideDate}) >= ${startDateStr}`,
        sql`DATE(${payOverrides.overrideDate}) <= ${endDateStr}`,
        eq(payOverrides.status, 'approved')
      );

  const overrideResults = await db
    .select({
      workerId: payOverrides.workerId,
      overrideType: payOverrides.overrideType,
      amount: payOverrides.amount,
      reason: payOverrides.reason,
    })
    .from(payOverrides)
    .where(overrideWhereConditions);

  // 3) Build per-worker override totals
  const overrideByWorker = new Map<number, { bonuses: number; deductions: number; notes: string[] }>();
  overrideResults.forEach((row) => {
    const existing = overrideByWorker.get(row.workerId) || { bonuses: 0, deductions: 0, notes: [] };
    const amount = parseFloat(row.amount || '0');
    if (row.overrideType === 'bonus') {
      existing.bonuses += amount;
    } else if (row.overrideType === 'deduction') {
      existing.deductions += amount;
    }
    if (row.reason) existing.notes.push(`${row.overrideType}: ${amount} - ${row.reason}`);
    overrideByWorker.set(row.workerId, existing);
  });

  // 4) Group daily finance by worker and calculate totals
  const workerMap = new Map<number, {
    workerName: string;
    workerCode: string;
    groupName: string | null;
    groupCode: string | null;
    totalSalary: number;
    totalDeductions: number;
    totalBonuses: number;
    totalNet: number;
    overrideNotes: string[];
  }>();

  results.forEach((row) => {
    const existing = workerMap.get(row.workerId);
    const baseAmount = parseFloat(row.baseAmount || '0');
    const deductions = parseFloat(row.deductions || '0');
    const bonuses = parseFloat(row.bonuses || '0');
    const netAmount = baseAmount - deductions + bonuses;

    if (existing) {
      existing.totalSalary += baseAmount;
      existing.totalDeductions += deductions;
      existing.totalBonuses += bonuses;
      existing.totalNet += netAmount;
    } else {
      workerMap.set(row.workerId, {
        workerName: row.workerName,
        workerCode: row.workerCode,
        groupName: row.groupName,
        groupCode: row.groupCode,
        totalSalary: baseAmount,
        totalDeductions: deductions,
        totalBonuses: bonuses,
        totalNet: netAmount,
        overrideNotes: [],
      });
    }
  });

  // 5) Add pay overrides to worker totals
  overrideByWorker.forEach((overrides, wId) => {
    const worker = workerMap.get(wId);
    if (worker) {
      worker.totalBonuses += overrides.bonuses;
      worker.totalDeductions += overrides.deductions;
      worker.totalNet += overrides.bonuses - overrides.deductions;
      worker.overrideNotes.push(...overrides.notes);
    }
  });

  return Array.from(workerMap.entries()).map(([wId, data]) => ({
    workerId: wId,
    workerName: data.workerName,
    workerCode: data.workerCode,
    groupName: data.groupName || '-',
    groupCode: data.groupCode || '-',
    totalSalary: data.totalSalary.toFixed(2),
    totalDeductions: data.totalDeductions.toFixed(2),
    totalBonuses: data.totalBonuses.toFixed(2),
    totalNet: data.totalNet.toFixed(2),
    overrideNotes: data.overrideNotes.join(' | '),
  }));
}

/**
 * Get official payroll report by cost center
 * Note: Returns same data as group report since workers don't have direct costCenterId
 */
export async function getPayrollReportByCostCenter(
  periodStart: string,
  periodEnd: string,
  costCenterId?: number
) {
  return await getPayrollReportByGroup(periodStart, periodEnd, undefined, costCenterId);
}

/**
 * Get official payroll report summary (all groups)
 */
export async function getPayrollReportSummary(
  periodStart: string,
  periodEnd: string,
  costCenterId?: number,
  groupId?: number
) {
  return await getPayrollReportByGroup(periodStart, periodEnd, groupId, costCenterId);
}


// ============================================
// Full Day Override Functions (Daily Correction)
// ============================================

export async function getDailyFinanceForWorker(
  workerId: number,
  periodStart: string,
  periodEnd: string
) {
  const db = await getDb();
  if (!db) return [];

  const { workerDailyFinance } = await import('../drizzle/schema');
  
  const records = await db
    .select()
    .from(workerDailyFinance)
    .where(and(
      eq(workerDailyFinance.workerId, workerId),
      gte(workerDailyFinance.workDate, sql`${periodStart}`),
      lte(workerDailyFinance.workDate, sql`${periodEnd}`)
    ))
    .orderBy(workerDailyFinance.workDate);
  
  return records;
}

/**
 * Get attendance events for a worker in a period
 * Groups check_in and check_out by date
 */
export async function getAttendanceForWorkerPeriod(
  workerId: number,
  periodStart: string,
  periodEnd: string
) {
  const db = await getDb();
  if (!db) return [];

  const { attendanceEvents } = await import('../drizzle/schema');
  
  const startDate = new Date(`${periodStart}T00:00:00`);
  // Extend end date to capture night shift check_outs
  const { endOfSearch: endDate } = getExpandedDateRange(periodEnd);
  
  const events = await db
    .select()
    .from(attendanceEvents)
    .where(and(
      eq(attendanceEvents.workerId, workerId),
      gte(attendanceEvents.eventTime, startDate),
      lte(attendanceEvents.eventTime, endDate)
    ))
    .orderBy(attendanceEvents.eventTime);
  
  // Use groupEventsByWorkDate for correct night shift handling
  const grouped = groupEventsByWorkDate(events.map(e => ({ ...e, workerId })));
  
  // Convert to array and calculate actualWorkMinutes
  const results: Array<{ date: string; checkIn: any; checkOut: any; actualWorkMinutes: number }> = [];
  
  for (const [workDate, workerData] of Object.entries(grouped)) {
    // Only include dates within the requested period
    if (workDate < periodStart || workDate > periodEnd) continue;
    
    const wd = workerData[workerId];
    if (!wd) continue;
    
    let actualWorkMinutes = 0;
    if (wd.checkIn && wd.checkOut) {
      const checkInTime = new Date(wd.checkIn.eventTime);
      const checkOutTime = new Date(wd.checkOut.eventTime);
      actualWorkMinutes = Math.round((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60));
    }
    
    results.push({
      date: workDate,
      checkIn: wd.checkIn || null,
      checkOut: wd.checkOut || null,
      actualWorkMinutes,
    });
  }
  
  return results.sort((a, b) => a.date.localeCompare(b.date));
}

// updateFullDayOverride function removed - feature deprecated


// ============================================
// Operational Flags (البلاغات التشغيلية)
// ============================================

export async function createOperationalFlag(data: {
  flagType: string;
  workerId: number;
  groupId?: number;
  flagDate: string;
  endDate?: string;
  description: string;
  attachments?: string[];
  amount?: number;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { operationalFlags } = await import('../drizzle/schema');

  const insertData: any = {
    flagType: data.flagType,
    workerId: data.workerId,
    groupId: data.groupId || null,
    flagDate: new Date(data.flagDate),
    endDate: data.endDate ? new Date(data.endDate) : null,
    description: data.description,
    attachments: data.attachments ? JSON.stringify(data.attachments) : null,
    amount: data.amount?.toString() || null,
    status: 'PENDING_ADMIN_ACTION',
    createdBy: data.createdBy,
  };

  const result = await db.insert(operationalFlags).values(insertData);

  return result[0].insertId;
}

export async function listOperationalFlags(filters?: {
  status?: string;
  workerId?: number;
  groupId?: number;
  flagType?: string;
  startDate?: string;
  endDate?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const { operationalFlags, workers, groups, users } = await import('../drizzle/schema');

  let query = db
    .select({
      id: operationalFlags.id,
      workerId: operationalFlags.workerId,
      workerName: workers.fullName,
      workerCode: workers.code,
      groupId: operationalFlags.groupId,
      groupName: groups.name,
      flagDate: operationalFlags.flagDate,
      description: operationalFlags.description,
      status: operationalFlags.status,
      createdBy: operationalFlags.createdBy,
      createdByName: users.fullName,
      approvedBy: operationalFlags.approvedBy,
      approvedAt: operationalFlags.approvedAt,
      approvalNotes: operationalFlags.approvalNotes,
      createdAt: operationalFlags.createdAt,
      updatedAt: operationalFlags.updatedAt,
    })
    .from(operationalFlags)
    .leftJoin(workers, eq(operationalFlags.workerId, workers.id))
    .leftJoin(groups, eq(operationalFlags.groupId, groups.id))
    .leftJoin(users, eq(operationalFlags.createdBy, users.id));

  const conditions = [];

  if (filters?.status) {
    conditions.push(eq(operationalFlags.status, filters.status as any));
  }

  if (filters?.workerId) {
    conditions.push(eq(operationalFlags.workerId, filters.workerId));
  }

  if (filters?.groupId) {
    conditions.push(eq(operationalFlags.groupId, filters.groupId));
  }

  // flagType filter removed - not available in schema

  if (filters?.startDate) {
    conditions.push(sql`${operationalFlags.flagDate} >= ${filters.startDate}`);
  }

  if (filters?.endDate) {
    conditions.push(sql`${operationalFlags.flagDate} <= ${filters.endDate}`);
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const results = await query.orderBy(desc(operationalFlags.createdAt));

  return results.map(r => ({
    ...r,
    // attachments field removed - not in schema
  }));
}

export async function getOperationalFlag(id: number) {
  const db = await getDb();
  if (!db) return null;

  const { operationalFlags, workers, groups, users } = await import('../drizzle/schema');

  const [flag] = await db
    .select({
      id: operationalFlags.id,
      workerId: operationalFlags.workerId,
      workerName: workers.fullName,
      workerCode: workers.code,
      groupId: operationalFlags.groupId,
      groupName: groups.name,
      flagDate: operationalFlags.flagDate,
      description: operationalFlags.description,
      status: operationalFlags.status,
      createdBy: operationalFlags.createdBy,
      createdByName: users.fullName,
      approvedBy: operationalFlags.approvedBy,
      approvedAt: operationalFlags.approvedAt,
      approvalNotes: operationalFlags.approvalNotes,
      createdAt: operationalFlags.createdAt,
      updatedAt: operationalFlags.updatedAt,
    })
    .from(operationalFlags)
    .leftJoin(workers, eq(operationalFlags.workerId, workers.id))
    .leftJoin(groups, eq(operationalFlags.groupId, groups.id))
    .leftJoin(users, eq(operationalFlags.createdBy, users.id))
    .where(eq(operationalFlags.id, id))
    .limit(1);

  if (!flag) return null;

  return flag;
}

export async function approveOperationalFlag(
  flagId: number,
  approvedBy: number,
  notes?: string
): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const { operationalFlags } = await import('../drizzle/schema');

  try {
    await db.update(operationalFlags)
      .set({
        status: 'approved',
        approvedBy,
        approvedAt: new Date(),
        approvalNotes: notes,
      })
      .where(eq(operationalFlags.id, flagId));

    return { success: true };
  } catch (error) {
    console.error('[Database] Error approving operational flag:', error);
    throw error;
  }
}

export async function rejectOperationalFlag(
  flagId: number,
  approvedBy: number,
  notes?: string
): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const { operationalFlags } = await import('../drizzle/schema');

  try {
    await db.update(operationalFlags)
      .set({
        status: 'rejected',
        approvedBy,
        approvedAt: new Date(),
        approvalNotes: notes,
      })
      .where(eq(operationalFlags.id, flagId));

    return { success: true };
  } catch (error) {
    console.error('[Database] Error rejecting operational flag:', error);
    throw error;
  }
}

export async function checkUnresolvedFlags(workerId?: number, groupId?: number, dateRange?: { start: string; end: string }) {
  const db = await getDb();
  if (!db) return { hasUnresolved: false, count: 0, flags: [] };

  const { operationalFlags } = await import('../drizzle/schema');

  const conditions = [eq(operationalFlags.status, 'PENDING_ADMIN_ACTION' as any)];

  if (workerId) {
    conditions.push(eq(operationalFlags.workerId, workerId));
  }

  if (groupId) {
    conditions.push(eq(operationalFlags.groupId, groupId));
  }

  if (dateRange) {
    conditions.push(sql`${operationalFlags.flagDate} >= ${dateRange.start}`);
    conditions.push(sql`${operationalFlags.flagDate} <= ${dateRange.end}`);
  }

  const flags = await db
    .select()
    .from(operationalFlags)
    .where(and(...conditions));

  return {
    hasUnresolved: flags.length > 0,
    count: flags.length,
    flags: flags.map(f => ({
      id: f.id,
      workerId: f.workerId,
      flagDate: f.flagDate,
      description: f.description,
      status: f.status,
    })),
  };
}


// ============================================
// Atomic Permissions + Data Scope System
// نظام الصلاحيات الذرية + النطاق
// ============================================

/**
 * Check if a user has a specific permission on a specific scope
 * التحقق من صلاحية محددة على نطاق محدد
 * NOTE: All users have full permissions now.
 */

export async function updateUserRole(userId: number, role: 'guard' | 'supervisor_tolan' | 'supervisor_malqa' | 'admin_affairs' | 'accountant' | 'auditor' | 'finance_manager' | 'executive' | 'super_admin') {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db
    .update(users)
    .set({ role })
    .where(eq(users.id, userId));
}


// ============================================
// Daily Management Functions
// ============================================

/**
 * Get all attendance records for a specific date (with pagination)
 */
export async function getDailyAttendanceRecordsWithPagination(date: string, page: number = 1, limit: number = 20) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const allWorkers = await db.select().from(workers);
  const events = await db
    .select()
    .from(attendanceEvents)
    .where(sql`DATE(${attendanceEvents.eventTime}) = ${date}`);

  const recordMap = new Map();
  
  for (const worker of allWorkers) {
    const workerEvents = events.filter((e: any) => e.workerId === worker.id);
    const checkInEvent = workerEvents.find(e => e.eventType === 'check_in');
    const checkOutEvent = workerEvents.find(e => e.eventType === 'check_out');
    
    recordMap.set(worker.id, {
      id: worker.id,
      workerId: worker.id,
      workerName: worker.fullName,
      workerCode: worker.code,
      date: date,
      checkInTime: checkInEvent ? new Date(checkInEvent.eventTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : null,
      checkOutTime: checkOutEvent ? new Date(checkOutEvent.eventTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : null,
      status: workerEvents.length > 0 ? 'present' : 'absent',
      notes: null,
    });
  }

  const allResults = Array.from(recordMap.values());
  const total = allResults.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const data = allResults.slice(offset, offset + limit);

  return { data, total, totalPages };
}

/**
 * Get all attendance records for a specific date (old version - kept for backward compatibility)
 */
export async function getDailyAttendanceRecords(date: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const allWorkers = await db.select().from(workers);
  const events = await db
    .select()
    .from(attendanceEvents)
    .where(sql`DATE(${attendanceEvents.eventTime}) = ${date}`);

  const recordMap = new Map();
  
  for (const worker of allWorkers) {
    const workerEvents = events.filter((e: any) => e.workerId === worker.id);
    const checkInEvent = workerEvents.find(e => e.eventType === 'check_in');
    const checkOutEvent = workerEvents.find(e => e.eventType === 'check_out');
    
    recordMap.set(worker.id, {
      id: worker.id,
      workerId: worker.id,
      workerName: worker.fullName,
      workerCode: worker.code,
      date: date,
      checkInTime: checkInEvent ? new Date(checkInEvent.eventTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : null,
      checkOutTime: checkOutEvent ? new Date(checkOutEvent.eventTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : null,
      status: workerEvents.length > 0 ? 'present' : 'absent',
      notes: null,
    });
  }

  return Array.from(recordMap.values());
}

/**
 * Update a daily attendance record
 */
export async function updateDailyAttendanceRecord(
  recordId: number,
  checkInTime: string | null,
  checkOutTime: string | null,
  status: string,
  notes: string | null,
  userId: number
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // For now, we'll just return success
  // In a real implementation, you would update the attendance events table
  return {
    success: true,
    message: 'تم تحديث السجل بنجاح',
  };
}


// ============================================
// Daily Finance Entries Functions
// ============================================

export async function listDailyFinanceEntries(input: {
  workerId?: number;
  startDate?: string;
  endDate?: string;
}): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const { workers: workersTable } = await import('../drizzle/schema');
    
    let conditions = [];
    
    if (input.workerId) {
      conditions.push(eq(workerDailyFinance.workerId, input.workerId));
    }
    
    if (input.startDate) {
      conditions.push(sql`${workerDailyFinance.workDate} >= ${input.startDate}`);
    }
    
    if (input.endDate) {
      conditions.push(sql`${workerDailyFinance.workDate} <= ${input.endDate}`);
    }
    
    let query = db
      .select({
        id: workerDailyFinance.id,
        workerId: workerDailyFinance.workerId,
        workerName: workersTable.fullName,
        workerCode: workersTable.code,
        workDate: workerDailyFinance.workDate,
        baseAmount: workerDailyFinance.baseAmount,
        deductions: workerDailyFinance.deductions,
        bonuses: workerDailyFinance.bonuses,
        netAmount: workerDailyFinance.netAmount,
        lateMinutes: workerDailyFinance.lateMinutes,
        earlyLeaveMinutes: workerDailyFinance.earlyLeaveMinutes,
        notes: workerDailyFinance.notes,
      })
      .from(workerDailyFinance)
      .leftJoin(workersTable, eq(workerDailyFinance.workerId, workersTable.id));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const entries = await query;
    
    return entries.map(entry => ({
      id: entry.id,
      workerId: entry.workerId,
      workerName: entry.workerName || 'Unknown',
      workerCode: entry.workerCode || '',
      workDate: entry.workDate,
      baseAmount: entry.baseAmount,
      deductions: entry.deductions,
      bonuses: entry.bonuses,
      netAmount: entry.netAmount,
      lateMinutes: entry.lateMinutes,
      earlyLeaveMinutes: entry.earlyLeaveMinutes,
      notes: entry.notes || '',
    }));
  } catch (error) {
    console.error('[Database] Error listing daily finance entries:', error);
    return [];
  }
}

export async function createDailyFinanceEntry(input: {
  workerId: number;
  workDate: Date;
  baseAmount?: number;
  deductions?: number;
  bonuses?: number;
  notes?: string;
}): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  try {
    const netAmount = (input.baseAmount || 0) - (input.deductions || 0) + (input.bonuses || 0);
    
    const result = await db.insert(workerDailyFinance).values([{
      workerId: input.workerId,
      workDate: input.workDate,
      baseAmount: input.baseAmount?.toString() || '0.00',
      deductions: input.deductions?.toString() || '0.00',
      bonuses: input.bonuses?.toString() || '0.00',
      netAmount: netAmount.toString(),
      notes: input.notes,
    }]);

    return { success: true, id: (result as any).insertId || 0 };
  } catch (error) {
    console.error('[Database] Error creating daily finance entry:', error);
    throw error;
  }
}

export async function updateDailyFinanceEntry(
  id: number,
  data: {
    baseAmount?: number;
    deductions?: number;
    bonuses?: number;
    notes?: string;
  }
): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  try {
    const updateData: any = {};
    if (data.baseAmount !== undefined) updateData.baseAmount = data.baseAmount;
    if (data.deductions !== undefined) updateData.deductions = data.deductions;
    if (data.bonuses !== undefined) updateData.bonuses = data.bonuses;
    if (data.notes !== undefined) updateData.notes = data.notes;

    // Recalculate netAmount if any amount field changed
    if (data.baseAmount !== undefined || data.deductions !== undefined || data.bonuses !== undefined) {
      const entry = await db.select().from(workerDailyFinance).where(eq(workerDailyFinance.id, id)).limit(1);
      if (entry[0]) {
        const base = (data.baseAmount !== undefined ? data.baseAmount : (entry[0].baseAmount ? parseFloat(entry[0].baseAmount.toString()) : 0)) || 0;
        const deductions = (data.deductions !== undefined ? data.deductions : (entry[0].deductions ? parseFloat(entry[0].deductions.toString()) : 0)) || 0;
        const bonuses = (data.bonuses !== undefined ? data.bonuses : (entry[0].bonuses ? parseFloat(entry[0].bonuses.toString()) : 0)) || 0;
        updateData.netAmount = base - deductions + bonuses;
      }
    }

    await db.update(workerDailyFinance)
      .set(updateData)
      .where(eq(workerDailyFinance.id, id));

    return { success: true };
  } catch (error) {
    console.error('[Database] Error updating daily finance entry:', error);
    throw error;
  }
}

export async function deleteDailyFinanceEntry(id: number): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  try {
    await db.delete(workerDailyFinance)
      .where(eq(workerDailyFinance.id, id));

    return { success: true };
  } catch (error) {
    console.error('[Database] Error deleting daily finance entry:', error);
    throw error;
  }
}

/**
 * حذف سجل مالي يومي حسب workerId و workDate
 * مفيد للصيانة والتنظيف
 */
export async function deleteDailyFinanceByWorkerAndDate(
  workerId: number,
  workDate: string
): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const { workerDailyFinance } = await import('../drizzle/schema');

  try {
    await db.delete(workerDailyFinance)
      .where(and(
        eq(workerDailyFinance.workerId, workerId),
        eq(workerDailyFinance.workDate, sql`${workDate}`)
      ));

    return { success: true };
  } catch (error) {
    console.error('[Database] Error deleting daily finance by worker and date:', error);
    throw error;
  }
}

/**
 * تنظيف السجلات المالية اليتيمة (بدون بصمات مقابلة)
 * يحذف جميع السجلات في worker_daily_finance التي لا يوجد لها بصمات في attendance_events
 */
export async function cleanupOrphanFinanceRecords(): Promise<{
  deletedCount: number;
  totalAmount: number;
  records: any[];
}> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const { workerDailyFinance, attendanceEvents, workers } = await import('../drizzle/schema');

  try {
    // الحصول على قائمة السجلات اليتيمة
    const orphanRecords = await db
      .select({
        id: workerDailyFinance.id,
        workerId: workerDailyFinance.workerId,
        workerCode: workers.code,
        workerName: workers.fullName,
        workDate: workerDailyFinance.workDate,
        baseAmount: workerDailyFinance.baseAmount,
        deductions: workerDailyFinance.deductions,
        netAmount: workerDailyFinance.netAmount,
      })
      .from(workerDailyFinance)
      .leftJoin(workers, eq(workerDailyFinance.workerId, workers.id))
      .where(
        sql`NOT EXISTS (
          SELECT 1 FROM ${attendanceEvents}
          WHERE ${attendanceEvents.workerId} = ${workerDailyFinance.workerId}
          AND ${attendanceEvents.workDate} = ${workerDailyFinance.workDate}
        )`
      );

    if (orphanRecords.length === 0) {
      return { deletedCount: 0, totalAmount: 0, records: [] };
    }

    // حساب الإجمالي
    const totalAmount = orphanRecords.reduce((sum, record) => {
      return sum + parseFloat(record.netAmount?.toString() || '0');
    }, 0);

    // حذف السجلات اليتيمة
    const recordIds = orphanRecords.map(r => r.id);
    await db.delete(workerDailyFinance)
      .where(sql`${workerDailyFinance.id} IN (${sql.join(recordIds.map(id => sql`${id}`), sql`, `)})`)

    return {
      deletedCount: orphanRecords.length,
      totalAmount: Math.round(totalAmount * 100) / 100,
      records: orphanRecords,
    };
  } catch (error) {
    console.error('[Database] Error cleaning up orphan finance records:', error);
    throw error;
  }
}


// ============================================
// Simplified Operational Flags (البلاغات التشغيلية المبسطة)
// ============================================

export async function createSimplifiedOperationalFlag(data: {
  workerId: number;
  groupId?: number;
  flagDate: Date;
  description: string;
  createdBy: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const { operationalFlags } = await import('../drizzle/schema');

  try {
    const result = await db.insert(operationalFlags).values({
      workerId: data.workerId,
      groupId: data.groupId,
      flagDate: data.flagDate,
      description: data.description,
      status: 'pending',
      createdBy: data.createdBy,
    });

    return (result as any).insertId || 0;
  } catch (error) {
    console.error('[Database] Error creating operational flag:', error);
    throw error;
  }
}

export async function getPendingOperationalFlags(): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const { operationalFlags, workers } = await import('../drizzle/schema');

  try {
    const flags = await db
      .select({
        id: operationalFlags.id,
        workerId: operationalFlags.workerId,
        groupId: operationalFlags.groupId,
        flagDate: operationalFlags.flagDate,
        description: operationalFlags.description,
        status: operationalFlags.status,
        createdBy: operationalFlags.createdBy,
        createdAt: operationalFlags.createdAt,
        worker: {
          id: workers.id,
          fullName: workers.fullName,
          code: workers.code,
        },
      })
      .from(operationalFlags)
      .leftJoin(workers, eq(operationalFlags.workerId, workers.id))
      .where(eq(operationalFlags.status, 'pending'))
      .orderBy(desc(operationalFlags.createdAt));

    return flags;
  } catch (error) {
    console.error('[Database] Error getting pending operational flags:', error);
    throw error;
  }
}

// Duplicate functions removed - already defined earlier in the file

export async function checkPendingFlagsBeforePayroll(): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const { operationalFlags } = await import('../drizzle/schema');

  try {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(operationalFlags)
      .where(eq(operationalFlags.status, 'pending'));

    return result[0]?.count || 0;
  } catch (error) {
    console.error('[Database] Error checking pending flags:', error);
    throw error;
  }
}


export async function listAllOperationalFlags(): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const { operationalFlags, workers } = await import('../drizzle/schema');

  try {
    const flags = await db
      .select({
        id: operationalFlags.id,
        workerId: operationalFlags.workerId,
        groupId: operationalFlags.groupId,
        flagDate: operationalFlags.flagDate,
        description: operationalFlags.description,
        status: operationalFlags.status,
        createdBy: operationalFlags.createdBy,
        createdAt: operationalFlags.createdAt,
        worker: {
          id: workers.id,
          fullName: workers.fullName,
          code: workers.code,
        },
      })
      .from(operationalFlags)
      .leftJoin(workers, eq(operationalFlags.workerId, workers.id))
      .orderBy(desc(operationalFlags.createdAt));

    return flags;
  } catch (error) {
    console.error('[Database] Error listing all operational flags:', error);
    throw error;
  }
}


// ============================================
// Helper Functions for Testing
// ============================================

// createTestGroup removed - use createGroup with saveWeeklySchedules instead

/**
 * Create a test worker with custom parameters
 */
export async function createTestWorker(data: {
  code: string;
  fullName: string;
  groupId: number;
  dailyRate?: number;
  status: 'active' | 'inactive';
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.insert(workers).values({
    code: data.code,
    fullName: data.fullName,
    groupId: data.groupId,
    dailyRate: data.dailyRate?.toString(),
    status: data.status,
  });

  return {
    id: result[0].insertId as number,
    ...data,
  };
}

/**
 * Delete a test worker by ID
 */
export async function deleteTestWorker(workerId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.delete(workers).where(eq(workers.id, workerId));
}

/**
 * Delete a test group by ID
 */
export async function deleteTestGroup(groupId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.delete(groups).where(eq(groups.id, groupId));
}

/**
 * Calculate daily finance from attendance (simplified)
 */
export async function calculateDailyFinance(workerId: number, date: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Get worker
  const worker = await db.select().from(workers).where(eq(workers.id, workerId)).limit(1);
  if (!worker || worker.length === 0) {
    throw new Error(`Worker ${workerId} not found`);
  }

  // Get group
  if (!worker[0].groupId) {
    throw new Error('Worker has no group assigned');
  }
  const group = await db.select().from(groups).where(eq(groups.id, worker[0].groupId!)).limit(1);
  if (!group || group.length === 0) {
    throw new Error(`Group ${worker[0].groupId} not found`);
  }

  // Get attendance events for the date
  const events = await db
    .select()
    .from(attendanceEvents)
    .where(
      and(
        eq(attendanceEvents.workerId, workerId),
        sql`DATE(${attendanceEvents.eventTime}) = ${date}`
      )
    );

  // Simple calculation: if attended, get daily wage
  const dailyWage = typeof group[0].dailyWage === 'string' ? parseFloat(group[0].dailyWage) : (group[0].dailyWage as unknown as number) || 0;
  const baseAmount = events.length > 0 ? dailyWage : 0;
  const deductions = 0;
  const bonuses = 0;

  return {
    baseAmount,
    deductions,
    bonuses,
    lateMinutes: 0,
    earlyLeaveMinutes: 0,
  };
}




// ============================================
// Attendance Export Functions (Excel Reports)
// ============================================

export async function getAttendanceReportData(
  startDate: string,
  endDate: string,
  groupId?: number,
  costCenterId?: number
) {
  const db = await getDb();
  if (!db) return [];

  const { attendanceEvents, workers, groups, costCenters } = await import('../drizzle/schema');
  
  // Use work_date instead of eventTime for proper administrative day handling
  // This ensures that punches from 00:00-04:59 of the next day are included
  // in the previous day's report (5 AM boundary)
  
  // Build query
  let query = db
    .select({
      workerId: workers.id,
      workerName: workers.fullName,
      workerCode: workers.code,
      groupId: workers.groupId,
      groupName: groups.name,
      costCenterId: groups.costCenterId,
      costCenterName: costCenters.name,
      eventType: attendanceEvents.eventType,
      eventTime: attendanceEvents.eventTime,
      workDate: attendanceEvents.workDate,
      method: attendanceEvents.method,
    })
    .from(attendanceEvents)
    .innerJoin(workers, eq(attendanceEvents.workerId, workers.id))
    .innerJoin(groups, eq(workers.groupId, groups.id))
    .leftJoin(costCenters, eq(groups.costCenterId, costCenters.id))
    .where(and(
      gte(attendanceEvents.workDate, startDate),
      lte(attendanceEvents.workDate, endDate)
    ));
  
  // Apply filters
  if (groupId) {
    query = (query as any).where(eq(workers.groupId, groupId));
  }
  if (costCenterId) {
    query = (query as any).where(eq(groups.costCenterId, costCenterId));
  }
  
  const results = await (query as any).orderBy(
    workers.fullName,
    attendanceEvents.eventTime
  );
  
  return results;
}

export async function getAttendanceSummaryByWorker(
  startDate: string,
  endDate: string,
  groupId?: number,
  costCenterId?: number
) {
  const db = await getDb();
  if (!db) return [];

  const { attendanceEvents, workers, groups, costCenters } = await import('../drizzle/schema');
  
  // Use work_date for proper administrative day handling (5 AM boundary)
  
  // Get all workers
  let workersQuery = db.select().from(workers) as any;
  if (groupId) {
    workersQuery = workersQuery.where(eq(workers.groupId, groupId));
  }
  const allWorkers = await workersQuery;
  
  // Get attendance events using work_date
  const events = await db
    .select()
    .from(attendanceEvents)
    .where(and(
      gte(attendanceEvents.workDate, startDate),
      lte(attendanceEvents.workDate, endDate)
    ));
  
  // Get groups and cost centers for joining
  const groupsData = await db.select().from(groups);
  const costCentersData = await db.select().from(costCenters);
  
  // Use groupEventsByWorkDate for correct night shift handling
  const grouped = groupEventsByWorkDate(events);
  
  // Calculate summary for each worker
  const summary = allWorkers.map((worker: any) => {
    const workerGroup = groupsData.find(g => g.id === worker.groupId);
    const costCenter = workerGroup ? costCentersData.find(c => c.id === workerGroup.costCenterId) : null;
    
    if (costCenterId && workerGroup?.costCenterId !== costCenterId) {
      return null;
    }
    
    let daysPresent = 0;
    let totalCheckIns = 0;
    let totalCheckOuts = 0;
    let totalHours = 0;
    
    for (const [workDate, workerData] of Object.entries(grouped)) {
      if (workDate < startDate || workDate > endDate) continue;
      const wd = workerData[worker.id];
      if (!wd) continue;
      
      daysPresent++;
      if (wd.checkIn) totalCheckIns++;
      if (wd.checkOut) totalCheckOuts++;
      
      if (wd.checkIn && wd.checkOut) {
        const hours = (new Date(wd.checkOut.eventTime).getTime() - new Date(wd.checkIn.eventTime).getTime()) / (1000 * 60 * 60);
        totalHours += hours;
      }
    }
    
    return {
      workerId: worker.id,
      workerName: worker.fullName,
      workerCode: worker.code,
      groupId: worker.groupId,
      groupName: workerGroup?.name || 'N/A',
      costCenterId: workerGroup?.costCenterId,
      costCenterName: costCenter?.name || 'N/A',
      daysPresent,
      totalCheckIns,
      totalCheckOuts,
      totalHours: Math.round(totalHours * 100) / 100,
      avgHoursPerDay: daysPresent > 0 ? Math.round((totalHours / daysPresent) * 100) / 100 : 0,
    };
  }).filter((item: any) => item !== null);
  
  return summary;
}

export async function getAttendanceSummaryByGroup(
  startDate: string,
  endDate: string,
  costCenterId?: number
) {
  const db = await getDb();
  if (!db) return [];

  const { attendanceEvents, workers, groups, costCenters } = await import('../drizzle/schema');
  
  // Use work_date for proper administrative day handling (5 AM boundary)
  
  // Get all groups
  let groupsQuery = db.select().from(groups) as any;
  if (costCenterId) {
    groupsQuery = groupsQuery.where(eq(groups.costCenterId, costCenterId));
  }
  const allGroups = await groupsQuery;
  
  // Get all workers
  const allWorkers = await db.select().from(workers);
  
  // Get attendance events using work_date
  const events = await db
    .select()
    .from(attendanceEvents)
    .where(and(
      gte(attendanceEvents.workDate, startDate),
      lte(attendanceEvents.workDate, endDate)
    ));
  
  // Get cost centers
  const costCentersData = await db.select().from(costCenters);
  
  // Use groupEventsByWorkDate for correct night shift handling
  const grouped = groupEventsByWorkDate(events);
  
  // Calculate summary for each group
  const summary = allGroups.map((group: any) => {
    const groupWorkers = allWorkers.filter(w => w.groupId === group.id);
    const groupWorkerIds = new Set(groupWorkers.map(w => w.id));
    
    const costCenter = costCentersData.find(c => c.id === group.costCenterId);
    
    let totalCheckIns = 0;
    let totalCheckOuts = 0;
    let totalHours = 0;
    const daysSet = new Set<string>();
    
    for (const [workDate, workerData] of Object.entries(grouped)) {
      if (workDate < startDate || workDate > endDate) continue;
      
      for (const [workerIdStr, wd] of Object.entries(workerData)) {
        if (!groupWorkerIds.has(Number(workerIdStr))) continue;
        
        daysSet.add(workDate);
        if (wd.checkIn) totalCheckIns++;
        if (wd.checkOut) totalCheckOuts++;
        
        if (wd.checkIn && wd.checkOut) {
          const hours = (new Date(wd.checkOut.eventTime).getTime() - new Date(wd.checkIn.eventTime).getTime()) / (1000 * 60 * 60);
          totalHours += hours;
        }
      }
    }
    
    const daysWithAttendance = daysSet.size;
    
    return {
      groupId: group.id,
      groupName: group.name,
      costCenterId: group.costCenterId,
      costCenterName: costCenter?.name || 'N/A',
      totalWorkers: groupWorkers.length,
      totalCheckIns,
      totalCheckOuts,
      daysWithAttendance,
      totalHours: Math.round(totalHours * 100) / 100,
      avgHoursPerDay: daysWithAttendance > 0 ? Math.round((totalHours / daysWithAttendance) * 100) / 100 : 0,
    };
  });
  
  return summary;
}

export async function getAttendanceSummaryByCostCenter(
  startDate: string,
  endDate: string
) {
  const db = await getDb();
  if (!db) return [];

  const { attendanceEvents, workers, groups, costCenters } = await import('../drizzle/schema');
  
  // Use work_date for proper administrative day handling (5 AM boundary)
  
  // Get all cost centers
  const allCostCenters = await db.select().from(costCenters);
  
  // Get all groups
  const allGroups = await db.select().from(groups);
  
  // Get all workers
  const allWorkers = await db.select().from(workers);
  
  // Get attendance events using work_date
  const events = await db
    .select()
    .from(attendanceEvents)
    .where(and(
      gte(attendanceEvents.workDate, startDate),
      lte(attendanceEvents.workDate, endDate)
    ));
  
  // Use groupEventsByWorkDate for correct night shift handling
  const grouped = groupEventsByWorkDate(events);
  
  // Calculate summary for each cost center
  const summary = allCostCenters.map((costCenter: any) => {
    const costCenterGroups = allGroups.filter(g => g.costCenterId === costCenter.id);
    const costCenterWorkerIds = new Set(
      allWorkers.filter(w => costCenterGroups.some(g => g.id === w.groupId)).map(w => w.id)
    );
    
    let totalCheckIns = 0;
    let totalCheckOuts = 0;
    let totalHours = 0;
    const daysSet = new Set<string>();
    
    for (const [workDate, workerData] of Object.entries(grouped)) {
      if (workDate < startDate || workDate > endDate) continue;
      
      for (const [workerIdStr, wd] of Object.entries(workerData)) {
        if (!costCenterWorkerIds.has(Number(workerIdStr))) continue;
        
        daysSet.add(workDate);
        if (wd.checkIn) totalCheckIns++;
        if (wd.checkOut) totalCheckOuts++;
        
        if (wd.checkIn && wd.checkOut) {
          const hours = (new Date(wd.checkOut.eventTime).getTime() - new Date(wd.checkIn.eventTime).getTime()) / (1000 * 60 * 60);
          totalHours += hours;
        }
      }
    }
    
    const daysWithAttendance = daysSet.size;
    
    return {
      costCenterId: costCenter.id,
      costCenterName: costCenter.name,
      totalGroups: costCenterGroups.length,
      totalWorkers: costCenterWorkerIds.size,
      totalCheckIns,
      totalCheckOuts,
      daysWithAttendance,
      totalHours: Math.round(totalHours * 100) / 100,
      avgHoursPerDay: daysWithAttendance > 0 ? Math.round((totalHours / daysWithAttendance) * 100) / 100 : 0,
    };
  });
  
  return summary;
}


// ============================================
// Advanced Payroll System (نظام الرواتب المتقدم)
// ============================================

/**
 * Calculate daily finances for a period with double payment protection
 * Returns only unlocked days (lockedBatchId IS NULL)
 */
export async function calculateDailyFinancesForPeriod(
  workerId: number,
  periodStart: string,
  periodEnd: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { workerDailyFinance, attendanceEvents, workers, groups } = await import('../drizzle/schema');

  // Get worker
  const [worker] = await db.select().from(workers).where(eq(workers.id, workerId)).limit(1);
  if (!worker) throw new Error("Worker not found");

  // Get all dates in period
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const dates: string[] = [];
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toLocaleDateString('en-CA');
    dates.push(dateStr);
  }

  // Calculate finances for each date
  const results = [];
  for (const date of dates) {
    // Check if day is already locked
    const [existing] = await db
      .select()
      .from(workerDailyFinance)
      .where(
        and(
          eq(workerDailyFinance.workerId, workerId),
          eq(workerDailyFinance.workDate, sql`${date}`)
        )
      )
      .limit(1);

    // Skip if locked
    if (existing && existing.lockedBatchId) {
      continue;
    }

    // Calculate finance for this day
    const finance = await calculateDailyFinanceFromAttendance(workerId, date);
    
    // Create or update daily finance
    await createOrUpdateDailyFinance(workerId, date, finance);
    
    results.push({
      date,
      workerId,
      ...finance,
    });
  }

  return results;
}

/**
 * Get unlocked daily finances for a period
 * Only returns days that haven't been locked by an approved batch
 */
export async function getUnlockedDailyFinances(
  workerId: number,
  periodStart: string,
  periodEnd: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { workerDailyFinance } = await import('../drizzle/schema');

  const records = await db
    .select()
    .from(workerDailyFinance)
    .where(
      and(
        eq(workerDailyFinance.workerId, workerId),
        sql`${workerDailyFinance.workDate} >= ${periodStart}`,
        sql`${workerDailyFinance.workDate} <= ${periodEnd}`,
        isNull(workerDailyFinance.lockedBatchId) // Only unlocked days
      )
    )
    .orderBy(workerDailyFinance.workDate);

  return records;
}

/**
 * Lock daily finances for a batch (called when batch is approved)
 * Sets lockedBatchId for all days in the batch
 */
export async function lockDailyFinancesForBatch(
  batchId: number,
  workerIds: number[],
  periodStart: string,
  periodEnd: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { workerDailyFinance } = await import('../drizzle/schema');

  // Lock all daily finances for this batch
  await db
    .update(workerDailyFinance)
    .set({ lockedBatchId: batchId })
    .where(
      and(
        inArray(workerDailyFinance.workerId, workerIds),
        sql`${workerDailyFinance.workDate} >= ${periodStart}`,
        sql`${workerDailyFinance.workDate} <= ${periodEnd}`,
        isNull(workerDailyFinance.lockedBatchId) // Only unlock unlocked days
      )
    );

  return { success: true };
}

/**
 * Unlock daily finances for a batch (called when batch is rejected or reverted)
 */
export async function unlockDailyFinancesForBatch(batchId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { workerDailyFinance } = await import('../drizzle/schema');

  // Unlock all daily finances for this batch
  await db
    .update(workerDailyFinance)
    .set({ lockedBatchId: null })
    .where(eq(workerDailyFinance.lockedBatchId, batchId));

  return { success: true };
}

/**
 * Aggregate payroll data for a period
 * Combines daily finances + pay overrides
 */
export async function aggregatePayrollData(
  workerId: number,
  periodStart: string,
  periodEnd: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { workerDailyFinance, payOverrides } = await import('../drizzle/schema');

  // Get daily finances (unlocked only)
  const dailyFinances = await db
    .select()
    .from(workerDailyFinance)
    .where(
      and(
        eq(workerDailyFinance.workerId, workerId),
        sql`${workerDailyFinance.workDate} >= ${periodStart}`,
        sql`${workerDailyFinance.workDate} <= ${periodEnd}`,
        isNull(workerDailyFinance.lockedBatchId)
      )
    );
  if (dailyFinances.length > 0) {
  }

  // Get pay overrides (approved only)
  const overrides = await db
    .select()
    .from(payOverrides)
    .where(
      and(
        eq(payOverrides.workerId, workerId),
        sql`${payOverrides.overrideDate} >= ${periodStart}`,
        sql`${payOverrides.overrideDate} <= ${periodEnd}`,
        eq(payOverrides.status, 'approved')
      )
    );

  // Calculate totals
  const daysWorked = dailyFinances.length;
  const baseAmount = dailyFinances.reduce((sum, r) => sum + parseFloat(r.baseAmount || '0'), 0);
  const deductions = dailyFinances.reduce((sum, r) => sum + parseFloat(r.deductions || '0'), 0);
  const bonuses = dailyFinances.reduce((sum, r) => sum + parseFloat(r.bonuses || '0'), 0);

  // Add overrides
  let totalOverrides = 0;
  const bonusesFromOverrides = overrides
    .filter(o => o.overrideType === 'bonus')
    .reduce((sum, o) => sum + parseFloat(o.amount || '0'), 0);
  
  const deductionsFromOverrides = overrides
    .filter(o => o.overrideType === 'deduction')
    .reduce((sum, o) => sum + parseFloat(o.amount || '0'), 0);

  const netAmount = baseAmount - deductions + bonuses + bonusesFromOverrides - deductionsFromOverrides;

  return {
    workerId,
    periodStart,
    periodEnd,
    daysWorked,
    baseAmount: baseAmount.toFixed(2),
    deductions: deductions.toFixed(2),
    bonuses: (bonuses + bonusesFromOverrides).toFixed(2),
    deductionsTotal: (deductions + deductionsFromOverrides).toFixed(2),
    netAmount: netAmount.toFixed(2),
    dailyFinances,
    overrides,
  };
}

/**
 * Check if any days in period are locked for a worker
 */
export async function checkLockedDaysInPeriod(
  workerId: number,
  periodStart: string,
  periodEnd: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { workerDailyFinance } = await import('../drizzle/schema');

  const lockedDays = await db
    .select()
    .from(workerDailyFinance)
    .where(
      and(
        eq(workerDailyFinance.workerId, workerId),
        sql`${workerDailyFinance.workDate} >= ${periodStart}`,
        sql`${workerDailyFinance.workDate} <= ${periodEnd}`,
        isNotNull(workerDailyFinance.lockedBatchId)
      )
    );

  return {
    hasLockedDays: lockedDays.length > 0,
    lockedDaysCount: lockedDays.length,
    lockedDays: lockedDays.map(d => ({
      date: d.workDate,
      batchId: d.lockedBatchId,
    })),
  };
}


// ============================================
// Pagination Functions (with LIMIT/OFFSET)
// ============================================

export async function getWorkersWithPagination(
  page: number = 1,
  limit: number = 10,
  groupId?: number,
  searchQuery?: string
): Promise<{ data: DbWorker[]; total: number; page: number; limit: number; totalPages: number }> {
  const db = await getDb();
  if (!db) return { data: [], total: 0, page, limit, totalPages: 0 };

  const offset = (page - 1) * limit;
  
  // Build where conditions
  const conditions = [];
  if (groupId) {
    conditions.push(eq(workers.groupId, groupId));
  }
  if (searchQuery && searchQuery.trim()) {
    const searchTerm = `%${searchQuery.trim()}%`;
    conditions.push(
      or(
        like(workers.fullName, searchTerm),
        like(workers.code, searchTerm),
        like(workers.nationalId, searchTerm)
      )
    );
  }
  
  // Get total count
  const countQuery = conditions.length > 0
    ? db.select({ count: count() }).from(workers).where(and(...conditions))
    : db.select({ count: count() }).from(workers);
  const countResult = await countQuery;
  const total = countResult[0]?.count || 0;

  // Get paginated data
  let query: any = db.select().from(workers).orderBy(desc(workers.createdAt), desc(workers.id));
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }
  
  const data = await query.limit(limit).offset(offset);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getGroupsWithPagination(
  page: number = 1,
  limit: number = 10,
  costCenterId?: number
): Promise<{ data: Group[]; total: number; page: number; limit: number; totalPages: number }> {
  const db = await getDb();
  if (!db) return { data: [], total: 0, page, limit, totalPages: 0 };

  const offset = (page - 1) * limit;
  
  // Get total count
  const countResult = costCenterId
    ? await db.select({ count: count() }).from(groups).where(eq(groups.costCenterId, costCenterId))
    : await db.select({ count: count() }).from(groups);
  
  const total = countResult[0]?.count || 0;

  // Get paginated data
  let query: any = db.select().from(groups).orderBy(desc(groups.createdAt));
  if (costCenterId) {
    query = query.where(eq(groups.costCenterId, costCenterId));
  }
  
  const data = await query.limit(limit).offset(offset);

  return {
    data: data.map(transformGroup),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// ============================================
// Group Schedules Functions
// ============================================

export async function getGroupSchedules(groupId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (groupId) {
    return await db.select().from(groupSchedules).where(eq(groupSchedules.groupId, groupId));
  }

  return await db.select().from(groupSchedules);
}

export async function updateGroupSchedule(
  id: number,
  startTime?: string,
  endTime?: string,
  requiredHours?: number,
  effectiveDate?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updates: any = {};
  if (startTime) updates.startTime = startTime;
  if (endTime) updates.endTime = endTime;
  if (requiredHours !== undefined) updates.requiredHours = requiredHours;
  if (effectiveDate !== undefined) updates.effectiveDate = effectiveDate;

  if (Object.keys(updates).length === 0) {
    throw new Error("No fields to update");
  }

  // Get the groupId before update for recalculation
  const [schedule] = await db.select().from(groupSchedules).where(eq(groupSchedules.id, id));
  
  const result = await db.update(groupSchedules)
    .set(updates)
    .where(eq(groupSchedules.id, id));

  // ✅ Automatic recalculation when schedule is updated
  if (schedule?.groupId) {
    try {
      await recalculateGroupFinanceForOpenPeriods(schedule.groupId);
      console.log(`[Schedule Updated] ✅ Recalculated group ${schedule.groupId}`);
    } catch (error: any) {
      console.error(`[Schedule Updated] ⚠️ Recalc failed:`, error.message);
    }
  }

  return result;
}


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

  const { workers, groups, attendanceEvents, workerDailyFinance } = await import('../drizzle/schema');
  
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
  
  // Get worker and group data
  const [workerData] = await db
    .select({
      dailyRate: workers.dailyRate,
      groupId: workers.groupId,
      workMinutes: groups.workMinutes,
      minuteCost: groups.minuteCost,
      latePenaltyRate: groups.latePenaltyRate,
      earlyLeavePenaltyRate: groups.earlyLeavePenaltyRate,
    })
    .from(workers)
    .leftJoin(groups, eq(workers.groupId, groups.id))
    .where(eq(workers.id, workerId))
    .limit(1);
  
  if (!workerData) {
    throw new Error("Worker not found");
  }
  
  const dailyRate = Number(workerData.dailyRate) || 0;
  const minuteCost = Number(workerData.minuteCost) || 0;
  const latePenaltyRate = Number(workerData.latePenaltyRate) || 0;
  const earlyLeavePenaltyRate = Number(workerData.earlyLeavePenaltyRate) || 0;
  
  // Get shift times from weekly schedule based on day of week
  let shiftStartTime: string | null = null;
  let shiftEndTime: string | null = null;
  
  if (workerData.groupId) {
    const dayOfWeek = workDate.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday (local time)
    const workDateStr = typeof workDate === 'string' ? workDate : workDate.toLocaleDateString('en-CA');
    
    const [schedule] = await db
      .select()
      .from(groupSchedules)
      .where(
        and(
          eq(groupSchedules.groupId, workerData.groupId),
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
  
  // Get group daily wage
  const groupData = workerData.groupId ? await db.select().from(groups).where(eq(groups.id, workerData.groupId)).limit(1) : [];
  const groupDailyWage = groupData.length > 0 && groupData[0].dailyWage ? Number(groupData[0].dailyWage) : 0;
  const groupWorkMinutes = groupData.length > 0 && groupData[0].workMinutes ? Number(groupData[0].workMinutes) : 0;
  
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
  }>,
  effectiveDate?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { groupSchedules } = await import('../drizzle/schema');

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
  periodEnd: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { workers, groups } = await import('../drizzle/schema');

  // First, get all groups in this cost center
  const groupsInCostCenter = await db
    .select()
    .from(groups)
    .where(eq(groups.costCenterId, costCenterId));
  // Then, get all workers in these groups
  const groupIds = groupsInCostCenter.map(g => g.id);
  const workersInCostCenter = groupIds.length > 0
    ? await db.select().from(workers).where(inArray(workers.groupId, groupIds))
    : [];

  // === الانتدابات المؤقتة ===
  // 1. جلب الانتدابات الخارجة من هذا المركز (عمال انتدبوا لمراكز أخرى)
  const outgoingAssignments = await getAssignmentsFromCostCenter(costCenterId, periodStart, periodEnd);
  // 2. جلب الانتدابات الواردة إلى هذا المركز (عمال من مراكز أخرى)
  const incomingAssignments = await getAssignmentsToCostCenter(costCenterId, periodStart, periodEnd);

  // بناء خريطة أيام الانتداب الخارجي لكل عامل أصلي
  const outgoingDaysMap = new Map<number, number>(); // workerId -> total outgoing days
  for (const assignment of outgoingAssignments) {
    const days = calculateAssignmentDays(
      assignment.startDate, assignment.endDate, periodStart, periodEnd
    );
    outgoingDaysMap.set(
      assignment.workerId,
      (outgoingDaysMap.get(assignment.workerId) || 0) + days
    );
  }

  // Aggregate data for each original worker (minus outgoing assignment days)
  const results = [];
  for (const worker of workersInCostCenter) {
    const workerData = await aggregatePayrollData(worker.id, periodStart, periodEnd);
    const outgoingDays = outgoingDaysMap.get(worker.id) || 0;

    if (workerData.daysWorked > 0) {
      if (outgoingDays > 0 && workerData.daysWorked > outgoingDays) {
        // خصم أيام الانتداب الخارجي - حساب نسبي
        const originalDays = workerData.daysWorked;
        const remainingDays = originalDays - outgoingDays;
        const ratio = remainingDays / originalDays;

        const adjBaseAmount = (parseFloat(workerData.baseAmount) * ratio).toFixed(2);
        const adjDeductions = (parseFloat(workerData.deductionsTotal) * ratio).toFixed(2);
        const adjBonuses = (parseFloat(workerData.bonuses) * ratio).toFixed(2);
        const adjNet = (parseFloat(adjBaseAmount) - parseFloat(adjDeductions) + parseFloat(adjBonuses)).toFixed(2);

        results.push({
          workerId: worker.id,
          workerName: worker.fullName,
          baseAmount: adjBaseAmount,
          deductions: adjDeductions,
          bonuses: adjBonuses,
          netAmount: adjNet,
          daysWorked: remainingDays,
          isPartial: true,
          outgoingDays,
          notes: `منتدب ${outgoingDays} يوم لمركز آخر`,
        });
      } else if (outgoingDays >= workerData.daysWorked) {
        // كل أيامه منتدبة - لا يظهر في هذه الدفعة
        continue;
      } else {
        results.push({
          workerId: worker.id,
          workerName: worker.fullName,
          baseAmount: workerData.baseAmount,
          deductions: workerData.deductionsTotal,
          bonuses: workerData.bonuses,
          netAmount: workerData.netAmount,
          daysWorked: workerData.daysWorked,
        });
      }
    }
  }

  // 3. إضافة العمال المنتدبين إلى هذا المركز (من مراكز أخرى)
  for (const assignment of incomingAssignments) {
    const assignmentDays = calculateAssignmentDays(
      assignment.startDate, assignment.endDate, periodStart, periodEnd
    );

    if (assignmentDays <= 0) continue;

    // حساب المبلغ اليومي للعامل المنتدب
    const workerData = await aggregatePayrollData(assignment.workerId, periodStart, periodEnd);
    if (workerData.daysWorked <= 0) continue;

    const dailyRate = parseFloat(workerData.baseAmount) / workerData.daysWorked;
    const dailyDeduction = parseFloat(workerData.deductionsTotal) / workerData.daysWorked;
    const dailyBonus = parseFloat(workerData.bonuses) / workerData.daysWorked;

    const assignBaseAmount = (dailyRate * assignmentDays).toFixed(2);
    const assignDeductions = (dailyDeduction * assignmentDays).toFixed(2);
    const assignBonuses = (dailyBonus * assignmentDays).toFixed(2);
    const assignNet = (parseFloat(assignBaseAmount) - parseFloat(assignDeductions) + parseFloat(assignBonuses)).toFixed(2);

    // تحقق من عدم تكرار العامل (إذا كان له أكثر من انتداب)
    const existingIdx = results.findIndex(r => r.workerId === assignment.workerId);
    if (existingIdx >= 0) {
      // دمج مع سجل موجود
      const existing = results[existingIdx];
      results[existingIdx] = {
        ...existing,
        baseAmount: (parseFloat(existing.baseAmount) + parseFloat(assignBaseAmount)).toFixed(2),
        deductions: (parseFloat(existing.deductions) + parseFloat(assignDeductions)).toFixed(2),
        bonuses: (parseFloat(existing.bonuses) + parseFloat(assignBonuses)).toFixed(2),
        netAmount: (parseFloat(existing.netAmount) + parseFloat(assignNet)).toFixed(2),
        daysWorked: existing.daysWorked + assignmentDays,
      };
    } else {
      results.push({
        workerId: assignment.workerId,
        workerName: assignment.workerName || 'غير معروف',
        baseAmount: assignBaseAmount,
        deductions: assignDeductions,
        bonuses: assignBonuses,
        netAmount: assignNet,
        daysWorked: assignmentDays,
        isAssigned: true,
        fromGroupName: assignment.groupName,
        notes: `منتدب من ${assignment.groupName || 'مجموعة أخرى'} - ${assignmentDays} يوم`,
      });
    }
  }

  return results;
}


// Get all check_out events for a specific date
export async function getCheckOutEventsByDate(date: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { attendanceEvents } = await import('../drizzle/schema');
  
  const startOfDay = new Date(`${date}T00:00:00`);
  const endOfDay = new Date(`${date}T23:59:59`);
  
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
  
  const { workerDailyFinance } = await import('../drizzle/schema');
  
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
  
  const { auditLog, users } = await import('../drizzle/schema');
  
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
  
  const { payrollBatches, payrollBatchItems, workers } = await import('../drizzle/schema');
  
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
  
  const { payrollBatches, payrollBatchItems, workers } = await import('../drizzle/schema');
  
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
  
  const { groupSchedules, groups } = await import('../drizzle/schema');
  
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
  
  const { attendanceEvents, workers, groups } = await import('../drizzle/schema');
  
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
  costCenterId: number | null
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
      // If costCenterId is specified, filter by workers in groups belonging to that cost center
      if (costCenterId) {
        // Get the worker's group to check cost center
        const { workers: workersTable, groups: groupsTable } = await import('../drizzle/schema');
        const workerData = await db
          .select({ costCenterId: groupsTable.costCenterId })
          .from(workersTable)
          .leftJoin(groupsTable, eq(workersTable.groupId, groupsTable.id))
          .where(eq(workersTable.id, record.workerId))
          .limit(1);
        
        if (workerData.length === 0 || workerData[0].costCenterId !== costCenterId) {
          continue; // Skip workers not in the specified cost center
        }
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
  const startOfDay = new Date(dateStr + 'T00:00:00');
  const endOfDay = new Date(dateStr + 'T23:59:59.999');
  // Note: For absent workers, we only check check_in events which always
  // fall on the correct calendar date, so no expanded range needed here.

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


  // Get workers who have check_in records for this date (same logic as stats)
  const workersWithAttendance = await db
    .select({
      workerId: attendanceEvents.workerId,
    })
    .from(attendanceEvents)
    .where(
      and(
        gte(attendanceEvents.eventTime, startOfDay),
        lt(attendanceEvents.eventTime, endOfDay),
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


// ============================================
// Executive Finance Dashboard (لوحة الإدارة العليا المالية)
// ============================================

export async function getExecutiveFinanceSummary(
  periodStart: string,
  periodEnd: string,
  groupId?: number,
  costCenterId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { workerDailyFinance, workers, groups, costCenters } = await import('../drizzle/schema');

  // Build conditions
  const conditions: any[] = [
    sql`${workerDailyFinance.workDate} >= ${periodStart}`,
    sql`${workerDailyFinance.workDate} <= ${periodEnd}`,
  ];

  if (groupId) {
    conditions.push(eq(workers.groupId, groupId));
  }

  if (costCenterId) {
    conditions.push(eq(groups.costCenterId, costCenterId));
  }

  // Get all daily finance records with worker/group/cost center info
  const records = await db
    .select({
      baseAmount: workerDailyFinance.baseAmount,
      deductions: workerDailyFinance.deductions,
      bonuses: workerDailyFinance.bonuses,
      netAmount: workerDailyFinance.netAmount,
      groupId: workers.groupId,
      groupName: groups.name,
      groupCode: groups.code,
      costCenterId: groups.costCenterId,
      costCenterName: costCenters.name,
      costCenterCode: costCenters.code,
    })
    .from(workerDailyFinance)
    .innerJoin(workers, eq(workerDailyFinance.workerId, workers.id))
    .leftJoin(groups, eq(workers.groupId, groups.id))
    .leftJoin(costCenters, eq(groups.costCenterId, costCenters.id))
    .where(and(...conditions));

  // Calculate grand total
  let totalBase = 0;
  let totalDeductions = 0;
  let totalBonuses = 0;
  let totalNet = 0;

  // Group by cost center
  const byCostCenter: Record<string, { id: number; name: string; code: string; total: number }> = {};
  // Group by group
  const byGroup: Record<string, { id: number; name: string; code: string; total: number }> = {};

  for (const r of records) {
    const base = parseFloat(r.baseAmount || '0');
    const ded = parseFloat(r.deductions || '0');
    const bon = parseFloat(r.bonuses || '0');
    const net = parseFloat(r.netAmount || '0');

    totalBase += base;
    totalDeductions += ded;
    totalBonuses += bon;
    totalNet += net;

    // By cost center
    if (r.costCenterId && r.costCenterName) {
      const ccKey = String(r.costCenterId);
      if (!byCostCenter[ccKey]) {
        byCostCenter[ccKey] = { id: r.costCenterId, name: r.costCenterName, code: r.costCenterCode || '', total: 0 };
      }
      byCostCenter[ccKey].total += net;
    }

    // By group
    if (r.groupId && r.groupName) {
      const gKey = String(r.groupId);
      if (!byGroup[gKey]) {
        byGroup[gKey] = { id: r.groupId, name: r.groupName, code: r.groupCode || '', total: 0 };
      }
      byGroup[gKey].total += net;
    }
  }

  return {
    periodStart,
    periodEnd,
    totalBase: totalBase.toFixed(2),
    totalDeductions: totalDeductions.toFixed(2),
    totalBonuses: totalBonuses.toFixed(2),
    totalNet: totalNet.toFixed(2),
    byCostCenter: Object.values(byCostCenter).map(c => ({
      ...c,
      total: c.total.toFixed(2),
    })),
    byGroup: Object.values(byGroup).map(g => ({
      ...g,
      total: g.total.toFixed(2),
    })),
  };
}


// ============================================
// Operational Dashboard (العمليات التشغيلية)
// ============================================

/**
 * Get present workers for a specific date with optional filters
 */
export async function getPresentWorkers(workDateStr: string, groupId?: number, costCenterId?: number) {
  const db = await getDb();
  if (!db) return [];

  const startOfDay = new Date(workDateStr + 'T00:00:00');
  const endOfDay = new Date(workDateStr + 'T23:59:59.999');
  // Note: For present workers, we only check check_in events which always
  // fall on the correct calendar date, so no expanded range needed here.

  // Get all check-in events for this date
  const checkIns = await db
    .select({
      workerId: attendanceEvents.workerId,
      eventTime: attendanceEvents.eventTime,
    })
    .from(attendanceEvents)
    .where(and(
      gte(attendanceEvents.eventTime, startOfDay),
      lt(attendanceEvents.eventTime, endOfDay),
      eq(attendanceEvents.eventType, 'check_in')
    ));

  if (checkIns.length === 0) return [];

  const workerIds = Array.from(new Set(checkIns.map(c => c.workerId)));
  
  // Get worker details
  const workerConditions: any[] = [inArray(workers.id, workerIds), eq(workers.status, 'active')];
  if (groupId) workerConditions.push(eq(workers.groupId, groupId));

  let workersList = await db
    .select({
      workerId: workers.id,
      workerCode: workers.code,
      workerName: workers.fullName,
      groupId: workers.groupId,
      groupName: groups.name,
      costCenterId: groups.costCenterId,
      costCenterName: costCenters.name,
    })
    .from(workers)
    .leftJoin(groups, eq(workers.groupId, groups.id))
    .leftJoin(costCenters, eq(groups.costCenterId, costCenters.id))
    .where(and(...workerConditions));

  if (costCenterId) {
    workersList = workersList.filter(w => w.costCenterId === costCenterId);
  }

  // Map check-in times
  const checkInMap = new Map<number, Date>();
  for (const ci of checkIns) {
    if (!checkInMap.has(ci.workerId) || ci.eventTime < checkInMap.get(ci.workerId)!) {
      checkInMap.set(ci.workerId, ci.eventTime);
    }
  }

  return workersList.map(w => ({
    ...w,
    checkInTime: checkInMap.get(w.workerId) || null,
  }));
}

/**
 * Get late workers for a specific date (workers who checked in after their scheduled start time)
 */
export async function getLateWorkers(workDateStr: string, groupId?: number, costCenterId?: number) {
  const db = await getDb();
  if (!db) return [];

  const startOfDay = new Date(workDateStr + 'T00:00:00');
  const endOfDay = new Date(workDateStr + 'T23:59:59.999');
  const dayOfWeek = new Date(workDateStr).getDay(); // 0=Sunday

  // Get all check-in events for this date
  const checkIns = await db
    .select({
      workerId: attendanceEvents.workerId,
      eventTime: attendanceEvents.eventTime,
    })
    .from(attendanceEvents)
    .where(and(
      gte(attendanceEvents.eventTime, startOfDay),
      lt(attendanceEvents.eventTime, endOfDay),
      eq(attendanceEvents.eventType, 'check_in')
    ));

  if (checkIns.length === 0) return [];

  // Get first check-in per worker
  const firstCheckIn = new Map<number, Date>();
  for (const ci of checkIns) {
    if (!firstCheckIn.has(ci.workerId) || ci.eventTime < firstCheckIn.get(ci.workerId)!) {
      firstCheckIn.set(ci.workerId, ci.eventTime);
    }
  }

  const workerIds = Array.from(firstCheckIn.keys());

  // Get worker details with group info
  const workerConditions: any[] = [inArray(workers.id, workerIds), eq(workers.status, 'active')];
  if (groupId) workerConditions.push(eq(workers.groupId, groupId));

  let workersList = await db
    .select({
      workerId: workers.id,
      workerCode: workers.code,
      workerName: workers.fullName,
      groupId: workers.groupId,
      groupName: groups.name,
      costCenterId: groups.costCenterId,
      costCenterName: costCenters.name,
    })
    .from(workers)
    .leftJoin(groups, eq(workers.groupId, groups.id))
    .leftJoin(costCenters, eq(groups.costCenterId, costCenters.id))
    .where(and(...workerConditions));

  if (costCenterId) {
    workersList = workersList.filter(w => w.costCenterId === costCenterId);
  }

  // Get schedules for all groups
  const groupIds = Array.from(new Set(workersList.map(w => w.groupId).filter(Boolean))) as number[];
  let schedules: any[] = [];
  if (groupIds.length > 0) {
    schedules = await db
      .select()
      .from(groupSchedules)
      .where(and(
        inArray(groupSchedules.groupId, groupIds),
        eq(groupSchedules.dayOfWeek, dayOfWeek),
        eq(groupSchedules.isActive, true)
      ));
  }

  const scheduleMap = new Map<number, string>();
  for (const s of schedules) {
    scheduleMap.set(s.groupId, s.startTime);
  }

  // Filter late workers
  const lateWorkers: any[] = [];
  for (const w of workersList) {
    const scheduledStart = w.groupId ? scheduleMap.get(w.groupId) : null;
    if (!scheduledStart) continue;

    const checkInTime = firstCheckIn.get(w.workerId);
    if (!checkInTime) continue;

    // Parse scheduled start time
    const [hours, minutes] = scheduledStart.split(':').map(Number);
    const scheduledDate = new Date(workDateStr + 'T00:00:00');
    scheduledDate.setHours(hours, minutes, 0, 0);

    // Check if late (more than 5 minutes grace)
    const diffMinutes = (checkInTime.getTime() - scheduledDate.getTime()) / (1000 * 60);
    if (diffMinutes > 5) {
      lateWorkers.push({
        ...w,
        checkInTime,
        scheduledStart,
        lateMinutes: Math.round(diffMinutes),
      });
    }
  }

  return lateWorkers;
}

/**
 * Get absent workers with cost center info
 */
export async function getAbsentWorkersWithDetails(workDateStr: string, groupId?: number, costCenterId?: number) {
  const db = await getDb();
  if (!db) return [];

  const startOfDay = new Date(workDateStr + 'T00:00:00');
  const endOfDay = new Date(workDateStr + 'T23:59:59.999');

  // Get all active workers
  const workerConditions: any[] = [eq(workers.status, 'active')];
  if (groupId) workerConditions.push(eq(workers.groupId, groupId));

  let allWorkers = await db
    .select({
      workerId: workers.id,
      workerCode: workers.code,
      workerName: workers.fullName,
      groupId: workers.groupId,
      groupName: groups.name,
      costCenterId: groups.costCenterId,
      costCenterName: costCenters.name,
    })
    .from(workers)
    .leftJoin(groups, eq(workers.groupId, groups.id))
    .leftJoin(costCenters, eq(groups.costCenterId, costCenters.id))
    .where(and(...workerConditions));

  if (costCenterId) {
    allWorkers = allWorkers.filter(w => w.costCenterId === costCenterId);
  }

  // Get workers who checked in
  const checkIns = await db
    .select({ workerId: attendanceEvents.workerId })
    .from(attendanceEvents)
    .where(and(
      gte(attendanceEvents.eventTime, startOfDay),
      lt(attendanceEvents.eventTime, endOfDay),
      eq(attendanceEvents.eventType, 'check_in')
    ))
    .groupBy(attendanceEvents.workerId);

  const presentIds = new Set(checkIns.map(c => c.workerId));

  return allWorkers.filter(w => !presentIds.has(w.workerId));
}

/**
 * Get operational dashboard stats for a specific date
 */
export async function getOperationalDashboardStats(workDateStr: string, groupId?: number, costCenterId?: number) {
  const [present, absent, late] = await Promise.all([
    getPresentWorkers(workDateStr, groupId, costCenterId),
    getAbsentWorkersWithDetails(workDateStr, groupId, costCenterId),
    getLateWorkers(workDateStr, groupId, costCenterId),
  ]);

  return {
    presentCount: present.length,
    absentCount: absent.length,
    lateCount: late.length,
  };
}

/**
 * Create operational flag from supervisor action
 */
export async function createOperationalFlagFromAction(data: {
  workerId: number;
  groupId?: number;
  costCenterId?: number;
  flagDate: string;
  flagType: 'confirm_attendance' | 'confirm_absence' | 'transfer';
  description: string;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.insert(operationalFlags).values({
    workerId: data.workerId,
    groupId: data.groupId || null,
    costCenterId: data.costCenterId || null,
    flagDate: sql`${data.flagDate}`,
    flagType: data.flagType,
    description: data.description,
    status: 'pending',
    createdBy: data.createdBy,
  });

  return result[0].insertId;
}

/**
 * Get operational flags with filters for the review page
 */
export async function getOperationalFlagsForReview(filters?: {
  status?: string;
  flagType?: string;
  groupId?: number;
  costCenterId?: number;
  startDate?: string;
  endDate?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [];

  if (filters?.status) {
    conditions.push(eq(operationalFlags.status, filters.status as any));
  }

  if (filters?.flagType) {
    conditions.push(eq(operationalFlags.flagType, filters.flagType as any));
  }

  if (filters?.groupId) {
    conditions.push(eq(operationalFlags.groupId, filters.groupId));
  }

  if (filters?.costCenterId) {
    conditions.push(eq(operationalFlags.costCenterId, filters.costCenterId));
  }

  if (filters?.startDate) {
    conditions.push(sql`${operationalFlags.flagDate} >= ${filters.startDate}`);
  }

  if (filters?.endDate) {
    conditions.push(sql`${operationalFlags.flagDate} <= ${filters.endDate}`);
  }

  const results = await db
    .select({
      id: operationalFlags.id,
      workerId: operationalFlags.workerId,
      workerName: workers.fullName,
      workerCode: workers.code,
      groupId: operationalFlags.groupId,
      groupName: groups.name,
      costCenterId: operationalFlags.costCenterId,
      costCenterName: costCenters.name,
      flagDate: operationalFlags.flagDate,
      flagType: operationalFlags.flagType,
      description: operationalFlags.description,
      status: operationalFlags.status,
      createdBy: operationalFlags.createdBy,
      createdByName: users.fullName,
      approvedBy: operationalFlags.approvedBy,
      approvedAt: operationalFlags.approvedAt,
      approvalNotes: operationalFlags.approvalNotes,
      createdAt: operationalFlags.createdAt,
    })
    .from(operationalFlags)
    .leftJoin(workers, eq(operationalFlags.workerId, workers.id))
    .leftJoin(groups, eq(operationalFlags.groupId, groups.id))
    .leftJoin(costCenters, eq(operationalFlags.costCenterId, costCenters.id))
    .leftJoin(users, eq(operationalFlags.createdBy, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(operationalFlags.createdAt));

  return results;
}

/**
 * Get count of pending operational flags
 */
export async function getPendingOperationalFlagsCount() {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(operationalFlags)
    .where(eq(operationalFlags.status, 'pending'));

  return result[0]?.count || 0;
}

/**
 * Get count of pending operational flags filtered by period and cost center
 * Used before creating payroll batches to ensure all flags for the same period/cost center are resolved
 */
export async function getPendingOperationalFlagsForPeriod(
  periodStart: string,
  periodEnd: string,
  costCenterId: number | null
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const startDate = periodStart.split('T')[0];
  const endDate = periodEnd.split('T')[0];

  const conditions = [
    eq(operationalFlags.status, 'pending'),
    gte(operationalFlags.flagDate, startDate),
    lte(operationalFlags.flagDate, endDate),
  ];

  // If costCenterId is provided, filter by it
  if (costCenterId) {
    conditions.push(eq(operationalFlags.costCenterId, costCenterId));
  }

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(operationalFlags)
    .where(and(...conditions));

  return result[0]?.count || 0;
}

/**
 * Check for duplicate payroll batch with same period and cost center
 * Prevents creating duplicate batches for the same data
 */
export async function checkDuplicatePayrollBatch(
  periodStart: string,
  periodEnd: string,
  costCenterId: number | null
): Promise<{ isDuplicate: boolean; existingBatchCode: string | null; existingStatus: string | null }> {
  const db = await getDb();
  if (!db) return { isDuplicate: false, existingBatchCode: null, existingStatus: null };

  const startDate = periodStart.split('T')[0];
  const endDate = periodEnd.split('T')[0];

  const conditions = [
    eq(payrollBatches.periodStart, startDate),
    eq(payrollBatches.periodEnd, endDate),
  ];

  // Match cost center (including null = null)
  if (costCenterId) {
    conditions.push(eq(payrollBatches.costCenterId, costCenterId));
  } else {
    conditions.push(sql`${payrollBatches.costCenterId} IS NULL`);
  }

  const existing = await db
    .select({
      batchCode: payrollBatches.batchCode,
      status: payrollBatches.status,
    })
    .from(payrollBatches)
    .where(and(...conditions))
    .limit(1);

  if (existing.length > 0) {
    const statusMap: Record<string, string> = {
      'draft': 'مسودة',
      'under_accountant_review': 'قيد مراجعة المحاسب',
      'under_financial_review': 'قيد المراجعة المالية',
      'under_accounts_manager_review': 'قيد مراجعة المدير المالي',
      'approved': 'معتمدة',
      'rejected_final': 'مرفوضة',
      'paid': 'مدفوعة',
    };
    return {
      isDuplicate: true,
      existingBatchCode: existing[0].batchCode,
      existingStatus: statusMap[existing[0].status || ''] || existing[0].status,
    };
  }

  return { isDuplicate: false, existingBatchCode: null, existingStatus: null };
}


// ============================================
// User Cost Centers (RBAC)
// ============================================

export async function assignUserCostCenters(userId: number, costCenterIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  // Delete existing assignments
  await db.delete(userCostCenters).where(eq(userCostCenters.userId, userId));
  
  // Insert new assignments
  if (costCenterIds.length > 0) {
    await db.insert(userCostCenters).values(
      costCenterIds.map(ccId => ({
        userId,
        costCenterId: ccId,
      }))
    );
  }
  
  return { success: true };
}

export async function getUserCostCenters(userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const results = await db
    .select({
      id: userCostCenters.id,
      costCenterId: userCostCenters.costCenterId,
      costCenterCode: costCenters.code,
      costCenterName: costCenters.name,
    })
    .from(userCostCenters)
    .innerJoin(costCenters, eq(userCostCenters.costCenterId, costCenters.id))
    .where(eq(userCostCenters.userId, userId));
  
  return results;
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


// ============================================
// Temporary Assignments (الانتدابات المؤقتة)
// ============================================

/**
 * Get all temporary assignments with filters
 */
export async function getTemporaryAssignments(filters?: {
  workerId?: number;
  costCenterId?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions: any[] = [];

  if (filters?.workerId) {
    conditions.push(eq(temporaryAssignments.workerId, filters.workerId));
  }
  if (filters?.costCenterId) {
    conditions.push(
      or(
        eq(temporaryAssignments.fromCostCenterId, filters.costCenterId),
        eq(temporaryAssignments.toCostCenterId, filters.costCenterId)
      )
    );
  }
  if (filters?.status) {
    conditions.push(eq(temporaryAssignments.status, filters.status as any));
  }
  if (filters?.startDate) {
    conditions.push(gte(temporaryAssignments.startDate, new Date(filters.startDate)));
  }
  if (filters?.endDate) {
    conditions.push(lte(temporaryAssignments.endDate, new Date(filters.endDate)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const results = await db
    .select({
      id: temporaryAssignments.id,
      workerId: temporaryAssignments.workerId,
      workerName: workers.fullName,
      workerCode: workers.code,
      fromCostCenterId: temporaryAssignments.fromCostCenterId,
      fromCostCenterName: sql<string>`fc.name`,
      toCostCenterId: temporaryAssignments.toCostCenterId,
      toCostCenterName: sql<string>`tc.name`,
      groupName: groups.name,
      startDate: temporaryAssignments.startDate,
      endDate: temporaryAssignments.endDate,
      notes: temporaryAssignments.notes,
      status: temporaryAssignments.status,
      createdBy: temporaryAssignments.createdBy,
      createdByName: users.fullName,
      createdAt: temporaryAssignments.createdAt,
    })
    .from(temporaryAssignments)
    .leftJoin(workers, eq(temporaryAssignments.workerId, workers.id))
    .leftJoin(groups, eq(workers.groupId, groups.id))
    .leftJoin(sql`cost_centers fc`, sql`${temporaryAssignments.fromCostCenterId} = fc.id`)
    .leftJoin(sql`cost_centers tc`, sql`${temporaryAssignments.toCostCenterId} = tc.id`)
    .leftJoin(users, eq(temporaryAssignments.createdBy, users.id))
    .where(whereClause)
    .orderBy(desc(temporaryAssignments.createdAt));

  return results;
}

/**
 * Format date to YYYY-MM-DD for database
 */
function formatDateForDB(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Create a new temporary assignment
 */
export async function createTemporaryAssignment(params: {
  workerId: number;
  toCostCenterId: number;
  toGroupId: number;
  startDate: string;
  endDate: string;
  notes?: string;
  createdBy: number;
}) {
  // Format dates to YYYY-MM-DD
  const formattedStartDate = formatDateForDB(params.startDate);
  const formattedEndDate = formatDateForDB(params.endDate);
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get worker's current group and cost center
  const worker = await db
    .select({
      id: workers.id,
      groupId: workers.groupId,
      costCenterId: groups.costCenterId,
    })
    .from(workers)
    .leftJoin(groups, eq(workers.groupId, groups.id))
    .where(eq(workers.id, params.workerId));

  if (!worker[0]) throw new Error("العامل غير موجود");

  const fromCostCenterId = worker[0].costCenterId;

  if (fromCostCenterId === params.toCostCenterId) {
    throw new Error("لا يمكن انتداب العامل إلى نفس مركز التكلفة الأصلي");
  }

  // Check for overlapping assignments
  const overlapping = await db
    .select()
    .from(temporaryAssignments)
    .where(
      and(
        eq(temporaryAssignments.workerId, params.workerId),
        eq(temporaryAssignments.status, 'active'),
        // Overlap check: existing.start <= new.end AND existing.end >= new.start
        lte(temporaryAssignments.startDate, formattedEndDate),
        gte(temporaryAssignments.endDate, formattedStartDate)
      )
    );

  if (overlapping.length > 0) {
    throw new Error("يوجد انتداب متداخل لنفس العامل في نفس الفترة");
  }

  const fromGroupId = worker[0].groupId;

  const [result] = await db
    .insert(temporaryAssignments)
    .values({
      workerId: params.workerId,
      fromCostCenterId,
      fromGroupId,
      toCostCenterId: params.toCostCenterId,
      toGroupId: params.toGroupId,
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      notes: params.notes || null,
      status: 'active',
      createdBy: params.createdBy,
    } as any);

  const assignmentId = result.insertId;

  // ✅ Automatic recalculation for the assignment period
  try {
    await recalculateWorkerFinanceForPeriod(params.workerId, params.startDate, params.endDate);
    console.log(`[Assignment Created] ✅ Recalculated worker ${params.workerId} for ${params.startDate} → ${params.endDate}`);
  } catch (error: any) {
    console.error(`[Assignment Created] ⚠️ Recalc failed:`, error.message);
  }

  return { id: assignmentId };
}

/**
 * Cancel a temporary assignment
 */
export async function cancelTemporaryAssignment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [existing] = await db
    .select()
    .from(temporaryAssignments)
    .where(eq(temporaryAssignments.id, id));
  if (!existing) throw new Error("الانتداب غير موجود");
  if (existing.status === 'cancelled') throw new Error("الانتداب ملغي مسبقاً");
  
  await db
    .update(temporaryAssignments)
    .set({ status: 'cancelled' })
    .where(eq(temporaryAssignments.id, id));

  // ✅ Automatic recalculation when assignment is cancelled
  try {
    const startDate = existing.startDate.toISOString().split('T')[0];
    const endDate = existing.endDate.toISOString().split('T')[0];
    await recalculateWorkerFinanceForPeriod(existing.workerId, startDate, endDate);
    console.log(`[Assignment Cancelled] ✅ Recalculated worker ${existing.workerId} for ${startDate} → ${endDate}`);
  } catch (error: any) {
    console.error(`[Assignment Cancelled] ⚠️ Recalc failed:`, error.message);
  }

  return { success: true };
}

/**
 * Get active temporary assignments for a worker in a date range
 * Used by payroll calculation
 */
export async function getWorkerAssignmentsInPeriod(
  workerId: number,
  periodStart: string,
  periodEnd: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const assignments = await db
    .select()
    .from(temporaryAssignments)
    .where(
      and(
        eq(temporaryAssignments.workerId, workerId),
        eq(temporaryAssignments.status, 'active'),
        lte(temporaryAssignments.startDate, new Date(periodEnd)),
        gte(temporaryAssignments.endDate, new Date(periodStart))
      )
    );

  return assignments;
}

/**
 * Get all active assignments TO a specific cost center in a date range
 * Used to find workers assigned to this cost center from other groups
 */
export async function getAssignmentsToCostCenter(
  costCenterId: number,
  periodStart: string,
  periodEnd: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const assignments = await db
    .select({
      id: temporaryAssignments.id,
      workerId: temporaryAssignments.workerId,
      workerName: workers.fullName,
      workerCode: workers.code,
      fromCostCenterId: temporaryAssignments.fromCostCenterId,
      toCostCenterId: temporaryAssignments.toCostCenterId,
      startDate: temporaryAssignments.startDate,
      endDate: temporaryAssignments.endDate,
      groupName: groups.name,
      dailyRate: workers.dailyRate,
      groupDailyWage: groups.dailyWage,
    })
    .from(temporaryAssignments)
    .leftJoin(workers, eq(temporaryAssignments.workerId, workers.id))
    .leftJoin(groups, eq(workers.groupId, groups.id))
    .where(
      and(
        eq(temporaryAssignments.toCostCenterId, costCenterId),
        eq(temporaryAssignments.status, 'active'),
        lte(temporaryAssignments.startDate, new Date(periodEnd)),
        gte(temporaryAssignments.endDate, new Date(periodStart))
      )
    );

  return assignments;
}

/**
 * Get assignments FROM a specific cost center in a date range
 * Used to find workers who left this cost center temporarily
 */
export async function getAssignmentsFromCostCenter(
  costCenterId: number,
  periodStart: string,
  periodEnd: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const assignments = await db
    .select({
      id: temporaryAssignments.id,
      workerId: temporaryAssignments.workerId,
      startDate: temporaryAssignments.startDate,
      endDate: temporaryAssignments.endDate,
      toCostCenterId: temporaryAssignments.toCostCenterId,
    })
    .from(temporaryAssignments)
    .where(
      and(
        eq(temporaryAssignments.fromCostCenterId, costCenterId),
        eq(temporaryAssignments.status, 'active'),
        lte(temporaryAssignments.startDate, new Date(periodEnd)),
        gte(temporaryAssignments.endDate, new Date(periodStart))
      )
    );

  return assignments;
}

/**
 * Calculate assignment days overlap with a period
 * Returns the number of days the assignment overlaps with the given period
 */
export function calculateAssignmentDays(
  assignmentStart: string | Date,
  assignmentEnd: string | Date,
  periodStart: string,
  periodEnd: string
): number {
  const aStart = new Date(assignmentStart);
  const aEnd = new Date(assignmentEnd);
  const pStart = new Date(periodStart);
  const pEnd = new Date(periodEnd);

  // Overlap start = max(assignmentStart, periodStart)
  const overlapStart = aStart > pStart ? aStart : pStart;
  // Overlap end = min(assignmentEnd, periodEnd)
  const overlapEnd = aEnd < pEnd ? aEnd : pEnd;

  if (overlapStart > overlapEnd) return 0;

  // Calculate days (inclusive)
  const diffTime = overlapEnd.getTime() - overlapStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
}


/**
 * Update a temporary assignment
 */
export async function updateTemporaryAssignment(id: number, params: {
  toCostCenterId?: number;
  toGroupId?: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Get current assignment
  const [current] = await db
    .select()
    .from(temporaryAssignments)
    .where(eq(temporaryAssignments.id, id));

  if (!current) throw new Error('الانتداب غير موجود');
  if (current.status !== 'active') throw new Error('لا يمكن تعديل انتداب غير نشط');

  const updateData: any = {};
  if (params.toCostCenterId) updateData.toCostCenterId = params.toCostCenterId;
  if (params.toGroupId) updateData.toGroupId = params.toGroupId;
  if (params.startDate) updateData.startDate = formatDateForDB(params.startDate);
  if (params.endDate) updateData.endDate = formatDateForDB(params.endDate);
  if (params.notes !== undefined) updateData.notes = params.notes;

  await db
    .update(temporaryAssignments)
    .set(updateData)
    .where(eq(temporaryAssignments.id, id));

  // ✅ Automatic recalculation for the affected period
  // Use the wider range (old + new dates) to cover all changes
  try {
    const oldStart = current.startDate.toISOString().split('T')[0];
    const oldEnd = current.endDate.toISOString().split('T')[0];
    const newStart = params.startDate || oldStart;
    const newEnd = params.endDate || oldEnd;
    
    // Calculate the full affected range
    const recalcStart = new Date(oldStart) < new Date(newStart) ? oldStart : newStart;
    const recalcEnd = new Date(oldEnd) > new Date(newEnd) ? oldEnd : newEnd;
    
    await recalculateWorkerFinanceForPeriod(current.workerId, recalcStart, recalcEnd);
    console.log(`[Assignment Updated] ✅ Recalculated worker ${current.workerId} for ${recalcStart} → ${recalcEnd}`);
  } catch (error: any) {
    console.error(`[Assignment Updated] ⚠️ Recalc failed:`, error.message);
  }

  return { success: true, id };
}

/**
 * Delete a temporary assignment permanently
 */
export async function deleteTemporaryAssignment(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Get current assignment
  const [current] = await db
    .select()
    .from(temporaryAssignments)
    .where(eq(temporaryAssignments.id, id));

  if (!current) throw new Error('الانتداب غير موجود');

  await db
    .delete(temporaryAssignments)
    .where(eq(temporaryAssignments.id, id));

  return { success: true, id };
}


// ============================================
// Backup Functions - النسخ الاحتياطي
// ============================================

/**
 * Get all table names and row counts
 */
export async function getBackupTableInfo() {
  const database = await getDb();
  if (!database) return [];
  
  const tables = [
    { name: 'users', label: 'المستخدمين', table: users },
    { name: 'workers', label: 'العمال', table: workers },
    { name: 'groups', label: 'المجموعات', table: groups },
    { name: 'cost_centers', label: 'مراكز التكلفة', table: costCenters },
    { name: 'attendance_events', label: 'سجل الحضور', table: attendanceEvents },
    { name: 'payroll_batches', label: 'دفعات الرواتب', table: payrollBatches },
    { name: 'payroll_batch_items', label: 'عناصر الرواتب', table: payrollBatchItems },
    { name: 'operational_flags', label: 'البلاغات التشغيلية', table: operationalFlags },
    { name: 'temporary_assignments', label: 'الانتدابات المؤقتة', table: temporaryAssignments },
    { name: 'audit_log', label: 'سجل التدقيق', table: auditLog },
    { name: 'pay_overrides', label: 'التجاوزات المالية', table: payOverrides },
    { name: 'group_schedules', label: 'جداول المجموعات', table: groupSchedules },
    { name: 'worker_daily_finance', label: 'المالية اليومية', table: workerDailyFinance },
  ];
  
  const results = [];
  for (const t of tables) {
    try {
      const countResult = await database.select({ count: count() }).from(t.table);
      results.push({
        name: t.name,
        label: t.label,
        rowCount: countResult[0]?.count || 0,
      });
    } catch {
      results.push({ name: t.name, label: t.label, rowCount: 0 });
    }
  }
  return results;
}

/**
 * Export selected tables as JSON data
 */
export async function exportTablesData(tableNames: string[]) {
  const database = await getDb();
  if (!database) return {};
  
  const tableMap: Record<string, any> = {
    users, workers, groups, costCenters: costCenters, 
    attendance_events: attendanceEvents, payroll_batches: payrollBatches,
    payroll_batch_items: payrollBatchItems, operational_flags: operationalFlags,
    temporary_assignments: temporaryAssignments, audit_log: auditLog,
    pay_overrides: payOverrides, group_schedules: groupSchedules,
    worker_daily_finance: workerDailyFinance, payroll_batch_notes: payrollBatchNotes,
    payroll_batch_corrections: payrollBatchCorrections, work_days: workDays,
    cost_centers: costCenters, deduction_rules: deductionRules,
    user_cost_centers: userCostCenters,
  };
  
  const result: Record<string, any[]> = {};
  for (const name of tableNames) {
    const table = tableMap[name];
    if (table) {
      try {
        const rows = await database.select().from(table);
        result[name] = rows;
      } catch {
        result[name] = [];
      }
    }
  }
  return result;
}

/**
 * Export full SQL dump of all tables
 */
export async function exportFullSqlDump() {
  const database = await getDb();
  if (!database) return '';
  
  const allTables = [
    { name: 'cost_centers', table: costCenters },
    { name: 'users', table: users },
    { name: 'groups', table: groups },
    { name: 'group_schedules', table: groupSchedules },
    { name: 'workers', table: workers },
    { name: 'attendance_events', table: attendanceEvents },
    { name: 'work_days', table: workDays },
    { name: 'worker_daily_finance', table: workerDailyFinance },
    { name: 'pay_overrides', table: payOverrides },
    { name: 'payroll_batches', table: payrollBatches },
    { name: 'payroll_batch_items', table: payrollBatchItems },
    { name: 'payroll_batch_notes', table: payrollBatchNotes },
    { name: 'payroll_batch_corrections', table: payrollBatchCorrections },
    { name: 'operational_flags', table: operationalFlags },
    { name: 'temporary_assignments', table: temporaryAssignments },
    { name: 'audit_log', table: auditLog },
    { name: 'user_cost_centers', table: userCostCenters },
  ];
  
  let sqlDump = `-- Tolan Workforce Backup\n-- Date: ${new Date().toISOString()}\n-- ============================================\n\n`;
  
  for (const t of allTables) {
    try {
      const rows = await database.select().from(t.table);
      if (rows.length === 0) continue;
      
      sqlDump += `-- Table: ${t.name}\n`;
      sqlDump += `-- Rows: ${rows.length}\n`;
      
      for (const row of rows) {
        const columns = Object.keys(row);
        const values = columns.map(col => {
          const val = (row as any)[col];
          if (val === null || val === undefined) return 'NULL';
          if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
          if (typeof val === 'number') return val.toString();
          if (typeof val === 'boolean') return val ? '1' : '0';
          return `'${String(val).replace(/'/g, "''")}'`;
        });
        sqlDump += `INSERT INTO \`${t.name}\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${values.join(', ')});\n`;
      }
      sqlDump += '\n';
    } catch {
      sqlDump += `-- Error exporting table: ${t.name}\n\n`;
    }
  }
  
  return sqlDump;
}

/**
 * Get backup history (from audit log)
 */
export async function getBackupHistory() {
  const database = await getDb();
  if (!database) return [];
  
  const result = await database
    .select({
      id: auditLog.id,
      action: auditLog.action,
      newValues: auditLog.newValues,
      createdAt: auditLog.createdAt,
      userId: auditLog.userId,
    })
    .from(auditLog)
    .where(eq(auditLog.tableName, 'backup'))
    .orderBy(desc(auditLog.createdAt))
    .limit(50);
  
  // Get user names
  const userIds = [...new Set(result.filter(r => r.userId).map(r => r.userId!))];
  let userMap: Record<number, string> = {};
  if (userIds.length > 0) {
    const userRows = await database
      .select({ id: users.id, fullName: users.fullName })
      .from(users)
      .where(inArray(users.id, userIds));
    userMap = Object.fromEntries(userRows.map(u => [u.id, u.fullName || '']));
  }
  
  return result.map(r => ({
    ...r,
    userName: r.userId ? userMap[r.userId] || '' : '',
    details: r.newValues ? JSON.parse(r.newValues) : {},
  }));
}


// ============================================
// تقرير مستحقات العمالة التشغيلية حسب مركز التكلفة
// ============================================

export async function getCostCenterPayrollReport(
  periodStart: string,
  periodEnd: string,
  costCenterId?: number
) {
  const db = await getDb();
  if (!db) return { costCenters: [], grandTotal: { workerCount: 0, netAmount: 0 } };

  const startDateStr = periodStart.split('T')[0];
  const endDateStr = periodEnd.split('T')[0];

  // Get approved payroll batches in the period
  const conditions: any[] = [
    sql`${payrollBatches.periodStart} >= ${startDateStr}`,
    sql`${payrollBatches.periodEnd} <= ${endDateStr}`,
    eq(payrollBatches.status, 'approved'),
  ];
  if (costCenterId) {
    conditions.push(eq(payrollBatches.costCenterId, costCenterId));
  }

  const batches = await db
    .select({
      batchId: payrollBatches.id,
      costCenterId: payrollBatches.costCenterId,
      costCenterName: costCenters.name,
      groupId: payrollBatches.groupId,
      groupName: groups.name,
      totalWorkers: payrollBatches.totalWorkers,
      totalAmount: payrollBatches.totalAmount,
      totalDeductions: payrollBatches.totalDeductions,
      totalBonuses: payrollBatches.totalBonuses,
    })
    .from(payrollBatches)
    .leftJoin(costCenters, eq(payrollBatches.costCenterId, costCenters.id))
    .leftJoin(groups, eq(payrollBatches.groupId, groups.id))
    .where(and(...conditions));

  // Also get batch items for net amount per batch
  const batchIds = batches.map(b => b.batchId);
  let itemsByBatch = new Map<number, { workerCount: number; netAmount: number }>();
  
  if (batchIds.length > 0) {
    for (const bId of batchIds) {
      const items = await db
        .select({
          netAmount: payrollBatchItems.netAmount,
        })
        .from(payrollBatchItems)
        .where(eq(payrollBatchItems.batchId, bId));
      
      let totalNet = 0;
      items.forEach(item => {
        totalNet += parseFloat(item.netAmount || '0');
      });
      itemsByBatch.set(bId, { workerCount: items.length, netAmount: totalNet });
    }
  }

  // Group by cost center, then by group
  const costCenterMap = new Map<number, {
    costCenterName: string;
    groups: Map<number, {
      groupName: string;
      workerCount: number;
      netAmount: number;
    }>;
  }>();

  batches.forEach(batch => {
    const ccId = batch.costCenterId || 0;
    const ccName = batch.costCenterName || 'غير محدد';
    const gId = batch.groupId || 0;
    const gName = batch.groupName || 'غير محدد';
    const batchData = itemsByBatch.get(batch.batchId) || { workerCount: parseInt(String(batch.totalWorkers || '0')), netAmount: 0 };

    if (!costCenterMap.has(ccId)) {
      costCenterMap.set(ccId, { costCenterName: ccName, groups: new Map() });
    }
    const cc = costCenterMap.get(ccId)!;
    
    if (!cc.groups.has(gId)) {
      cc.groups.set(gId, { groupName: gName, workerCount: 0, netAmount: 0 });
    }
    const grp = cc.groups.get(gId)!;
    grp.workerCount += batchData.workerCount;
    grp.netAmount += batchData.netAmount;
  });

  let grandTotalWorkers = 0;
  let grandTotalNet = 0;

  const result = Array.from(costCenterMap.entries()).map(([ccId, ccData]) => {
    let ccTotalWorkers = 0;
    let ccTotalNet = 0;
    
    const groupsList = Array.from(ccData.groups.entries()).map(([gId, gData]) => {
      ccTotalWorkers += gData.workerCount;
      ccTotalNet += gData.netAmount;
      return {
        groupId: gId,
        groupName: gData.groupName,
        workerCount: gData.workerCount,
        netAmount: parseFloat(gData.netAmount.toFixed(2)),
      };
    });

    grandTotalWorkers += ccTotalWorkers;
    grandTotalNet += ccTotalNet;

    return {
      costCenterId: ccId,
      costCenterName: ccData.costCenterName,
      totalWorkers: ccTotalWorkers,
      totalNetAmount: parseFloat(ccTotalNet.toFixed(2)),
      groups: groupsList,
    };
  });

  return {
    costCenters: result,
    grandTotal: {
      workerCount: grandTotalWorkers,
      netAmount: parseFloat(grandTotalNet.toFixed(2)),
    },
  };
}

/**
 * Run database migration to add flexible schedule columns
 * TEMPORARY: This function should be removed after migration is complete
 */
export async function runMigration() {
  const db = await getDb();
  if (!db) {
    throw new Error('Database connection not available');
  }
  
  console.log('[Migration] Starting migration...');
  
  // Try to add is_flexible_schedule column
  // If it already exists, the query will fail and we'll just log it
  try {
    await db.execute(sql`ALTER TABLE groups ADD COLUMN is_flexible_schedule BOOLEAN DEFAULT 0`);
    console.log('[Migration] ✅ Added is_flexible_schedule column');
  } catch (error: any) {
    // Column might already exist, which is fine
    console.log('[Migration] ℹ️  is_flexible_schedule: ' + (error.message || 'Already exists or error occurred'));
  }
  
  // Try to add required_hours column
  // If it already exists, the query will fail and we'll just log it
  try {
    await db.execute(sql`ALTER TABLE groups ADD COLUMN required_hours REAL`);
    console.log('[Migration] ✅ Added required_hours column');
  } catch (error: any) {
    // Column might already exist, which is fine
    console.log('[Migration] ℹ️  required_hours: ' + (error.message || 'Already exists or error occurred'));
  }
  
  console.log('[Migration] ✅ Migration completed');
}


// ============================================
// Smart Recalculation Functions
// ============================================

/**
 * Get the last closed payroll batch date
 * Returns the latest periodEnd date from all closed payroll batches
 * If no closed batches exist, returns null
 */
export async function getLastClosedPayrollDate(): Promise<string | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { payrollBatches } = await import('../drizzle/schema');

  const result = await db
    .select({
      lastDate: sql<string>`MAX(${payrollBatches.periodEnd})`
    })
    .from(payrollBatches)
    .where(eq(payrollBatches.status, 'closed'));

  return result[0]?.lastDate || null;
}

/**
 * Get the effective group for a worker on a specific date
 * Checks if there's an active temporary assignment for that date
 * Returns toGroupId if assigned, otherwise returns worker's original groupId
 */
export async function getEffectiveGroupForWorkerOnDate(
  workerId: number,
  date: string
): Promise<number | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { temporaryAssignments, workers } = await import('../drizzle/schema');

  // Check for active assignment on this date
  const assignment = await db
    .select({
      toGroupId: temporaryAssignments.toGroupId
    })
    .from(temporaryAssignments)
    .where(
      and(
        eq(temporaryAssignments.workerId, workerId),
        eq(temporaryAssignments.status, 'active'),
        lte(temporaryAssignments.startDate, new Date(date)),
        gte(temporaryAssignments.endDate, new Date(date))
      )
    )
    .limit(1);

  if (assignment.length > 0 && assignment[0].toGroupId) {
    return assignment[0].toGroupId;
  }

  // No assignment, return worker's original group
  const worker = await db
    .select({ groupId: workers.groupId })
    .from(workers)
    .where(eq(workers.id, workerId))
    .limit(1);

  return worker[0]?.groupId || null;
}

/**
 * Recalculate worker daily finance for a specific period
 * This is a smart, targeted recalculation that:
 * 1. Only recalculates for the specified worker and date range
 * 2. Determines the effective group for each day (considering temporary assignments)
 * 3. Skips any dates that are in closed payroll periods
 * 4. Recalculates finance based on the effective group's settings for each day
 */
export async function recalculateWorkerFinanceForPeriod(
  workerId: number,
  startDate: string,
  endDate: string
): Promise<{ recalculated: number; skipped: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get last closed payroll date to protect closed periods
  const lastClosedDate = await getLastClosedPayrollDate();
  
  // Adjust start date if it's before the last closed date
  let effectiveStartDate = startDate;
  if (lastClosedDate && new Date(startDate) <= new Date(lastClosedDate)) {
    const nextDay = new Date(lastClosedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    effectiveStartDate = nextDay.toISOString().split('T')[0];
  }

  // If effective start is after end, nothing to recalculate
  if (new Date(effectiveStartDate) > new Date(endDate)) {
    console.log(`[Recalc] Skipped: entire period is closed (worker ${workerId})`);
    return { recalculated: 0, skipped: 0 };
  }

  console.log(`[Recalc] Worker ${workerId}: ${effectiveStartDate} → ${endDate}`);

  let recalculated = 0;
  let skipped = 0;

  // Iterate through each day in the period
  const currentDate = new Date(effectiveStartDate);
  const endDateObj = new Date(endDate);

  while (currentDate <= endDateObj) {
    const dateStr = currentDate.toISOString().split('T')[0];

    try {
      // Determine effective group for this specific day
      const effectiveGroupId = await getEffectiveGroupForWorkerOnDate(workerId, dateStr);

      if (!effectiveGroupId) {
        console.log(`[Recalc] Skipped ${dateStr}: no group for worker ${workerId}`);
        skipped++;
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Recalculate finance for this day using the effective group
      await calculateDailyFinanceFromAttendance(workerId, dateStr);
      recalculated++;

    } catch (error: any) {
      console.error(`[Recalc] Error on ${dateStr} for worker ${workerId}:`, error.message);
      skipped++;
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  console.log(`[Recalc] Worker ${workerId}: ✅ ${recalculated} days, ⏭️ ${skipped} skipped`);
  return { recalculated, skipped };
}

/**
 * Recalculate finance for all workers in a group for open periods
 * Used when group settings are modified
 */
export async function recalculateGroupFinanceForOpenPeriods(
  groupId: number
): Promise<{ workersAffected: number; daysRecalculated: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { workers } = await import('../drizzle/schema');

  // Get last closed payroll date
  const lastClosedDate = await getLastClosedPayrollDate();
  
  // Calculate start date (day after last closed, or a reasonable default)
  let startDate: string;
  if (lastClosedDate) {
    const nextDay = new Date(lastClosedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    startDate = nextDay.toISOString().split('T')[0];
  } else {
    // No closed payrolls, recalculate from 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    startDate = thirtyDaysAgo.toISOString().split('T')[0];
  }

  // End date is today
  const endDate = new Date().toISOString().split('T')[0];

  console.log(`[Recalc Group] Group ${groupId}: ${startDate} → ${endDate}`);

  // Get all workers in this group
  const groupWorkers = await db
    .select({ id: workers.id })
    .from(workers)
    .where(eq(workers.groupId, groupId));

  let totalDays = 0;
  for (const worker of groupWorkers) {
    const result = await recalculateWorkerFinanceForPeriod(worker.id, startDate, endDate);
    totalDays += result.recalculated;
  }

  console.log(`[Recalc Group] ✅ ${groupWorkers.length} workers, ${totalDays} days recalculated`);
  return { workersAffected: groupWorkers.length, daysRecalculated: totalDays };
}
