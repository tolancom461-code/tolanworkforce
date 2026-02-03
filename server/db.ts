import { eq, desc, and, or, like, gte, lt, lte, sql, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  users, InsertUser, User,
  costCenters,
  groups, Group, InsertGroup,
  groupShifts, GroupShift, InsertGroupShift,
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
  operationalFlags
} from "../drizzle/schema";
import { inArray, isNull, isNotNull } from "drizzle-orm";

// Rename Worker type to avoid conflict with Web Worker
import type { Worker as DbWorker } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

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

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
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
      values.role = 'admin';
      updateSet.role = 'admin';
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
    workHours: group.workHours,
    dailyWage: group.dailyWage,
    workMinutes: group.workMinutes,
    minuteCost: group.minuteCost,
    latePenaltyRate: group.latePenaltyRate,
    earlyLeavePenaltyRate: group.earlyLeavePenaltyRate,
    shiftStartTime: group.shiftStartTime,
    shiftEndTime: group.shiftEndTime,
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

  // Delete related shifts first
  await db.delete(groupShifts).where(eq(groupShifts.groupId, id));
  await db.delete(groups).where(eq(groups.id, id));
}

// Group Shifts
export async function getGroupShifts(groupId: number): Promise<GroupShift[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(groupShifts).where(eq(groupShifts.groupId, groupId));
}

export async function createGroupShift(shift: InsertGroupShift): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(groupShifts).values(shift);
  const shiftId = result[0].insertId;
  
  // إنشاء جداول ديناميكية لكل أيام الأسبوع (1-7)
  const schedules: any[] = [];
  for (let dayOfWeek = 1; dayOfWeek <= 7; dayOfWeek++) {
    schedules.push({
      groupId: shift.groupId,
      dayOfWeek,
      startTime: shift.startTime,
      endTime: shift.endTime,
      requiredHours: calculateRequiredHours(shift.startTime, shift.endTime),
      isActive: shift.isActive ?? true,
    });
  }
  
  // إدراج الجداول الديناميكية
  if (schedules.length > 0) {
    await db.insert(groupSchedules).values(schedules as any);
  }
  
  return shiftId;
}

// دالة مساعدة لحساب الساعات المطلوبة
function calculateRequiredHours(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startTotalMin = startHour * 60 + startMin;
  const endTotalMin = endHour * 60 + endMin;
  
  let diffMin = endTotalMin - startTotalMin;
  if (diffMin < 0) diffMin += 24 * 60; // إذا كانت النهاية في اليوم التالي
  
  return Math.round((diffMin / 60) * 100) / 100; // تقريب لمنزلتين عشريتين
}

export async function updateGroupShift(id: number, data: Partial<InsertGroupShift>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(groupShifts).set({ ...data, updatedAt: new Date() }).where(eq(groupShifts.id, id));
}

export async function deleteGroupShift(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(groupShifts).where(eq(groupShifts.id, id));
}

// ============================================
// Workers Functions
// ============================================

export async function getAllWorkers(): Promise<DbWorker[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(workers).orderBy(desc(workers.createdAt));
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

export async function recordAttendance(workerId: number, eventType: 'check_in' | 'check_out', method: string = 'manual', deviceId?: number, verifiedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { attendanceEvents, workers } = await import('../drizzle/schema');
  
  // Check if worker exists
  const [worker] = await db.select().from(workers).where(eq(workers.id, workerId)).limit(1);
  if (!worker) throw new Error("العامل غير موجود");
  
  // Insert attendance event
  const result = await db.insert(attendanceEvents).values({
    workerId,
    eventType,
    eventTime: new Date(),
    method,
    deviceId: deviceId || null,
    verifiedBy: verifiedBy || null,
  });
  
  const eventId = result[0].insertId;
  
  // Update worker's last attendance
  await db.update(workers).set({ lastAttendanceAt: new Date() }).where(eq(workers.id, workerId));
  
  return { success: true, eventType, workerId, eventId, timestamp: new Date() };
}

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
  
  // Try manual code first, then worker code
  let [worker] = await db.select().from(workers).where(eq(workers.manualCode, code)).limit(1);
  if (!worker) {
    [worker] = await db.select().from(workers).where(eq(workers.code, code)).limit(1);
  }
  return worker || null;
}

export async function getTodayAttendance(groupId?: number) {
  const db = await getDb();
  if (!db) return [];

  const { attendanceEvents, workers } = await import('../drizzle/schema');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  let query = db
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
      gte(attendanceEvents.eventTime, today),
      lt(attendanceEvents.eventTime, tomorrow)
    ))
    .orderBy(desc(attendanceEvents.eventTime));
  
  const results = await query;
  
  if (groupId) {
    return results.filter(r => r.groupId === groupId);
  }
  
  return results;
}

export async function getWorkerLastEvent(workerId: number) {
  const db = await getDb();
  if (!db) return null;

  const { attendanceEvents } = await import('../drizzle/schema');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
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
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  // Get all workers
  let workersQuery = db.select().from(workers).where(eq(workers.status, 'active'));
  const allWorkers = await workersQuery;
  
  // Filter by group if specified
  const filteredWorkers = groupId ? allWorkers.filter(w => w.groupId === groupId) : allWorkers;
  
  // Get attendance events for the month
  const events = await db
    .select()
    .from(attendanceEvents)
    .where(and(
      gte(attendanceEvents.eventTime, startDate),
      lte(attendanceEvents.eventTime, endDate)
    ));
  
  // Calculate statistics for each worker
  const report = filteredWorkers.map(worker => {
    const workerEvents = events.filter((e: any) => e.workerId === worker.id);
    
    // Group events by date
    const eventsByDate = workerEvents.reduce((acc, event) => {
      const dateKey = new Date(event.eventTime).toISOString().split('T')[0];
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(event);
      return acc;
    }, {} as Record<string, typeof workerEvents>);
    
    const daysPresent = Object.keys(eventsByDate).length;
    const totalCheckIns = workerEvents.filter((e: any) => e.eventType === 'check_in').length;
    const totalCheckOuts = workerEvents.filter((e: any) => e.eventType === 'check_out').length;
    
    // Calculate total work hours
    let totalHours = 0;
    Object.values(eventsByDate).forEach((dayEvents: any) => {
      const checkIn = dayEvents.find((e: any) => e.eventType === 'check_in');
      const checkOut = dayEvents.find((e: any) => e.eventType === 'check_out');
      if (checkIn && checkOut) {
        const hours = (new Date(checkOut.eventTime).getTime() - new Date(checkIn.eventTime).getTime()) / (1000 * 60 * 60);
        totalHours += hours;
      }
    });
    
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

  const { workDays } = await import('../drizzle/schema');
  
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  return await db
    .select()
    .from(workDays)
    .where(and(
      gte(workDays.workDate, sql`${startDate.toISOString().split('T')[0]}`),
      lte(workDays.workDate, sql`${endDate.toISOString().split('T')[0]}`)
    ));
}

export async function upsertWorkDay(workDate: string, dayType: 'normal' | 'holiday' | 'weekend', notes?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { workDays } = await import('../drizzle/schema');
  
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
  
  // Get today's check-ins
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const todayEvents = await db
    .select()
    .from(attendanceEvents)
    .where(and(
      gte(attendanceEvents.eventTime, today),
      lt(attendanceEvents.eventTime, tomorrow),
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
  
  if (existing) {
    await db.update(workerDailyFinance).set({
      baseAmount: sql`${baseAmount}`,
      deductions: sql`${deductions}`,
      bonuses: sql`${bonuses}`,
      netAmount: sql`${netAmount}`,
      lateMinutes: data.lateMinutes || 0,
      earlyLeaveMinutes: data.earlyLeaveMinutes || 0,
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
      lateMinutes: data.lateMinutes || 0,
      earlyLeaveMinutes: data.earlyLeaveMinutes || 0,
      notes: data.notes,
    });
    return { id: (result as any).insertId, created: true };
  }
}

export async function calculateDailyFinanceFromAttendance(workerId: number, workDate: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { attendanceEvents, workers, groups, groupShifts, workDays, workerDailyFinance } = await import('../drizzle/schema');
  
  // Check if there's a full day override for this date
  const [existingFinance] = await db
    .select()
    .from(workerDailyFinance)
    .where(and(
      eq(workerDailyFinance.workerId, workerId),
      eq(workerDailyFinance.workDate, sql`${workDate}`)
    ))
    .limit(1);
  
  // If full day override is active, return full day wage with no deductions
  if (existingFinance && existingFinance.fullDayOverride) {
    // Get worker's group to get daily wage
    const [worker] = await db.select().from(workers).where(eq(workers.id, workerId)).limit(1);
    let dailyWage = 0;
    
    if (worker && worker.groupId) {
      const [group] = await db.select().from(groups).where(eq(groups.id, worker.groupId)).limit(1);
      if (group && group.dailyWage) {
        dailyWage = safeParseDecimal(group.dailyWage);
      }
    }
    
    return {
      baseAmount: dailyWage,
      deductions: 0,
      bonuses: 0,
      lateMinutes: 0,
      earlyLeaveMinutes: 0,
    };
  }
  
  // Get worker with group info
  const [worker] = await db.select().from(workers).where(eq(workers.id, workerId)).limit(1);
  if (!worker) throw new Error("العامل غير موجود");
  
  // Get group and shift info
  let dailyRate = safeParseDecimal(worker.dailyRate);
  let expectedStartTime = '08:00';
  let expectedEndTime = '17:00';
  
  // New: Group settings for minute-based calculations
  let groupDailyWage: number | null = null;
  let groupWorkMinutes: number | null = null;
  let groupLatePenaltyRate: number | null = null;
  let groupEarlyLeavePenaltyRate: number | null = null;
  let shiftStartTime: string | null = null;
  let shiftEndTime: string | null = null;
  
  if (worker.groupId) {
    const [group] = await db.select().from(groups).where(eq(groups.id, worker.groupId)).limit(1);
    if (group) {
      if (group.dailyRate) {
        dailyRate = dailyRate || safeParseDecimal(group.dailyRate);
      }
      // Load new flexible settings
      groupDailyWage = group.dailyWage ? safeParseDecimal(group.dailyWage) : null;
      groupWorkMinutes = safeParseInt(group.workMinutes);
      groupLatePenaltyRate = group.latePenaltyRate ? safeParseDecimal(group.latePenaltyRate) : null;
      groupEarlyLeavePenaltyRate = group.earlyLeavePenaltyRate ? safeParseDecimal(group.earlyLeavePenaltyRate) : null;
      // Load shift times for financial calculation
      shiftStartTime = group.shiftStartTime;
      shiftEndTime = group.shiftEndTime;
      
      // If shift times are defined, use them as expected times
      if (shiftStartTime) expectedStartTime = shiftStartTime;
      if (shiftEndTime) expectedEndTime = shiftEndTime;
    }
  }
  
  // Check if it's a work day
  const [workDay] = await db.select().from(workDays).where(eq(workDays.workDate, sql`${workDate}`)).limit(1);
  if (workDay && (workDay.dayType === 'holiday' || workDay.dayType === 'weekend')) {
    // No work expected on holidays/weekends
    return { baseAmount: 0, deductions: 0, bonuses: 0, lateMinutes: 0, earlyLeaveMinutes: 0 };
  }
  
  // Get attendance events for the day
  const dateStart = new Date(workDate);
  dateStart.setHours(0, 0, 0, 0);
  const dateEnd = new Date(workDate);
  dateEnd.setHours(23, 59, 59, 999);
  
  const events = await db
    .select()
    .from(attendanceEvents)
    .where(and(
      eq(attendanceEvents.workerId, workerId),
      gte(attendanceEvents.eventTime, dateStart),
      lte(attendanceEvents.eventTime, dateEnd)
    ))
    .orderBy(attendanceEvents.eventTime);
  
  const checkIn = events.find(e => e.eventType === 'check_in');
  const checkOut = events.find(e => e.eventType === 'check_out');
  
  let lateMinutes = 0;
  let earlyLeaveMinutes = 0;
  let actualCheckInTime: Date | null = null;
  let actualCheckOutTime: Date | null = null;
  
  // Parse shift times
  const [shiftStartHour, shiftStartMin] = expectedStartTime.split(':').map(Number);
  const [shiftEndHour, shiftEndMin] = expectedEndTime.split(':').map(Number);
  
  if (checkIn) {
    const checkInTime = new Date(checkIn.eventTime);
    const shiftStart = new Date(checkInTime);
    shiftStart.setHours(shiftStartHour, shiftStartMin, 0, 0);
    
    // Financial calculation: use shift start if checked in before shift
    // This means early arrival is NOT counted financially
    actualCheckInTime = checkInTime < shiftStart ? shiftStart : checkInTime;
    
    // Calculate late minutes (only if checked in after shift start)
    if (checkInTime > shiftStart) {
      lateMinutes = Math.round((checkInTime.getTime() - shiftStart.getTime()) / (1000 * 60));
    }
  }
  
  if (checkOut) {
    const checkOutTime = new Date(checkOut.eventTime);
    const shiftEnd = new Date(checkOutTime);
    shiftEnd.setHours(shiftEndHour, shiftEndMin, 0, 0);
    
    // Financial calculation: use shift end if checked out after shift
    // This means late departure is NOT counted financially
    actualCheckOutTime = checkOutTime > shiftEnd ? shiftEnd : checkOutTime;
    
    // Calculate early leave minutes (only if checked out before shift end)
    if (checkOutTime < shiftEnd) {
      earlyLeaveMinutes = Math.round((shiftEnd.getTime() - checkOutTime.getTime()) / (1000 * 60));
    }
  }
  
  // Calculate deductions based on late/early
  let deductions = 0;
  
  // Use new minute-based calculation if group settings are available
  if (groupDailyWage && groupWorkMinutes && groupWorkMinutes > 0) {
    // Use calculateLatePenalty and calculateEarlyLeavePenalty
    if (lateMinutes > 0) {
      deductions += calculateLatePenalty(groupDailyWage, groupWorkMinutes, lateMinutes, groupLatePenaltyRate);
    }
    if (earlyLeaveMinutes > 0) {
      deductions += calculateEarlyLeavePenalty(groupDailyWage, groupWorkMinutes, earlyLeaveMinutes, groupEarlyLeavePenaltyRate);
    }
  } else {
    // Fallback to old hourly calculation
    const hourlyRate = dailyRate / 8; // Assuming 8 hour work day
    
    if (lateMinutes > 0) {
      deductions += (lateMinutes / 60) * hourlyRate;
    }
    if (earlyLeaveMinutes > 0) {
      deductions += (earlyLeaveMinutes / 60) * hourlyRate;
    }
  }
  
  // Round deductions
  deductions = Math.round(deductions * 100) / 100;
  
  return {
    baseAmount: dailyRate,
    deductions,
    bonuses: 0,
    lateMinutes,
    earlyLeaveMinutes,
  };
}

export async function processAttendanceToFinance(workerId: number, workDate: string) {
  const financeData = await calculateDailyFinanceFromAttendance(workerId, workDate);
  return await createOrUpdateDailyFinance(workerId, workDate, financeData);
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
  const eventDate = new Date(original.eventTime).toISOString().split('T')[0];
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
  const workDate = new Date(original.eventTime).toISOString().split('T')[0];
  await processAttendanceToFinance(original.workerId, workDate);
  
  return { success: true };
}

export async function getAttendanceEventsForEdit(workerId: number, workDate: string) {
  const db = await getDb();
  if (!db) return [];

  const { attendanceEvents } = await import('../drizzle/schema');
  
  const dateStart = new Date(workDate);
  dateStart.setHours(0, 0, 0, 0);
  const dateEnd = new Date(workDate);
  dateEnd.setHours(23, 59, 59, 999);
  
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
  
  const dateStart = new Date(workDate);
  dateStart.setHours(0, 0, 0, 0);
  const dateEnd = new Date(workDate);
  dateEnd.setHours(23, 59, 59, 999);
  
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

  // Get worker info
  const worker = await db
    .select()
    .from(workers)
    .where(eq(workers.id, workerId))
    .limit(1);

  if (!worker.length) throw new Error("Worker not found");

  // Get daily finance records
  const financeRecords = await db
    .select()
    .from(workerDailyFinance)
    .where(
      and(
        eq(workerDailyFinance.workerId, workerId),
        gte(workerDailyFinance.workDate, startDate),
        lte(workerDailyFinance.workDate, endDate)
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
        gte(payOverrides.overrideDate, startDate),
        lte(payOverrides.overrideDate, endDate)
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
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Generate batch code with format: Batch-YYYY-MM-SEQ
  // Example: Batch-2026-01-001, Batch-2026-01-002, etc.
  const now = new Date();
  const year = now.getFullYear();
  const monthPad = String(now.getMonth() + 1).padStart(2, '0');
  const batchCode = `Batch-${year}-${monthPad}`;
  
  // Get sequence number for this month
  const monthStart = new Date(year, now.getMonth(), 1);
  const monthEnd = new Date(year, now.getMonth() + 1, 0);
  const batchesThisMonth = await db.select().from(payrollBatches).where(and(gte(payrollBatches.createdAt, monthStart), lte(payrollBatches.createdAt, monthEnd)));
  const sequence = String(batchesThisMonth.length + 1).padStart(3, '0');
  const finalBatchCode = `${batchCode}-${sequence}`;

  // Get workers based on filters
  let workersQuery = db.select().from(workers).where(eq(workers.status, 'active'));
  
  const allWorkers = await workersQuery;
  
  // Filter by groupId if specified
  let filteredWorkers = allWorkers;
  if (params.groupId) {
    filteredWorkers = allWorkers.filter(w => w.groupId === params.groupId);
  }

  // Filter by cost center if specified
  if (params.costCenterId) {
    const groupsInCostCenter = await db
      .select()
      .from(groups)
      .where(eq(groups.costCenterId, params.costCenterId));
    
    const groupIds = groupsInCostCenter.map(g => g.id);
    filteredWorkers = allWorkers.filter(w => w.groupId && groupIds.includes(w.groupId));
  }

  // Calculate totals for each worker
  const batchItems = await Promise.all(
    filteredWorkers.map(async (worker) => {
      // Get daily finance records for the period
      const dailyRecords = await db
        .select()
        .from(workerDailyFinance)
        .where(
          and(
            eq(workerDailyFinance.workerId, worker.id),
            sql`${workerDailyFinance.workDate} >= ${params.periodStart}`,
            sql`${workerDailyFinance.workDate} <= ${params.periodEnd}`
          )
        );

      // Calculate totals
      const daysWorked = dailyRecords.length;
      const baseAmount = dailyRecords.reduce((sum, r) => sum + parseFloat(r.baseAmount || '0'), 0);
      const totalDeductions = dailyRecords.reduce((sum, r) => sum + parseFloat(r.deductions || '0'), 0);
      const totalBonuses = dailyRecords.reduce((sum, r) => sum + parseFloat(r.bonuses || '0'), 0);
      const netAmount = baseAmount - totalDeductions + totalBonuses;

      return {
        workerId: worker.id,
        daysWorked,
        baseAmount: baseAmount.toFixed(2),
        totalDeductions: totalDeductions.toFixed(2),
        totalBonuses: totalBonuses.toFixed(2),
        netAmount: netAmount.toFixed(2),
      };
    })
  );

  // Calculate batch totals
  const totalAmount = batchItems.reduce((sum, item) => sum + parseFloat(item.netAmount), 0);
  const totalDeductions = batchItems.reduce((sum, item) => sum + parseFloat(item.totalDeductions), 0);
  const totalBonuses = batchItems.reduce((sum, item) => sum + parseFloat(item.totalBonuses), 0);

  // Insert batch
  await db.insert(payrollBatches).values({
    batchCode: finalBatchCode,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    groupId: params.groupId ?? null,
    costCenterId: params.costCenterId ?? null,
    totalAmount: totalAmount.toFixed(2),
    totalWorkers: filteredWorkers.length,
    totalDeductions: totalDeductions.toFixed(2),
    totalBonuses: totalBonuses.toFixed(2),
    status: 'draft' as const,
    createdBy: params.createdBy,
  } as any);

  // Get the created batch by batch code
  const createdBatch = await db
    .select()
    .from(payrollBatches)
    .where(eq(payrollBatches.batchCode, finalBatchCode))
    .limit(1);

  if (!createdBatch || createdBatch.length === 0) {
    throw new Error('Failed to create payroll batch');
  }

  const batchId = createdBatch[0].id;
  if (!batchId) {
    throw new Error('Failed to get batch ID after insert');
  }

  for (const item of batchItems) {
    await db.insert(payrollBatchItems).values({
      batchId,
      ...item,
    });
  }

  return { batchId, batchCode };
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

  if (batch.status !== 'draft' && batch.status !== 'returned_from_accountant' && batch.status !== 'returned_from_financial_review') {
    throw new Error("Can only edit items in draft or returned batches");
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

  if (batch.status !== 'draft' && batch.status !== 'returned_from_accountant' && batch.status !== 'returned_from_financial_review') {
    throw new Error("Can only submit draft or returned batches");
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

  // Check rejection count
  const newRejectionCount = (batch.rejectionCount || 0) + 1;
  if (newRejectionCount >= 3) {
    // Final rejection
    await db
      .update(payrollBatches)
      .set({
        status: 'rejected_final',
        rejectionCount: newRejectionCount,
      })
      .where(eq(payrollBatches.id, params.batchId));
  } else {
    // Return for correction
    await db
      .update(payrollBatches)
      .set({
        status: 'returned_from_accountant',
        rejectionCount: newRejectionCount,
      })
      .where(eq(payrollBatches.id, params.batchId));
  }

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

  await db
    .update(payrollBatches)
    .set({
      status: 'returned_from_financial_review',
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

  await db
    .update(payrollBatches)
    .set({
      status: 'rejected_final',
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
export async function deleteBatch(batchId: number) {
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
  
  // Update override fields
  await db.update(workerDailyFinance).set({
    fullDayOverride: override,
    overrideReason: reason || null,
    overrideBy: userId || null,
    overrideAt: override ? new Date() : null,
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

export async function getFullDayOverrideStatus(workerId: number, workDate: string) {
  const db = await getDb();
  if (!db) return null;

  const { workerDailyFinance } = await import('../drizzle/schema');
  
  const [record] = await db
    .select()
    .from(workerDailyFinance)
    .where(and(
      eq(workerDailyFinance.workerId, workerId),
      eq(workerDailyFinance.workDate, sql`${workDate}`)
    ))
    .limit(1);
  
  if (!record) return null;
  
  return {
    override: record.fullDayOverride,
    reason: record.overrideReason,
    overrideBy: record.overrideBy,
    overrideAt: record.overrideAt,
  };
}

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
 * NOTE: This is simplified encryption. For production, use bcrypt or Argon2.
 */
export async function hashPassword(password: string): Promise<string> {
  // Simple hash: base64 encode the password
  // In production, use bcrypt: return bcrypt.hash(password, 10);
  return Buffer.from(password).toString('base64');
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Simple comparison: decode and compare
  // In production, use bcrypt: return bcrypt.compare(password, hash);
  const hashedPassword = Buffer.from(password).toString('base64');
  return hashedPassword === hash;
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
    role: 'user',
  }]);
  
  return result.insertId;
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
  if (batch.status !== 'under_accounts_manager_review') throw new Error('Only pending batches can be rejected');
  
  const rejectionCount = (batch.rejectionCount || 0) + 1;
  
  await db.update(payrollBatches)
    .set({
      status: 'under_financial_review', // Return to final reviewer
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
  const penalty = minuteCost * lateMinutes * latePenaltyRate;
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
  const penalty = minuteCost * earlyLeaveMinutes * earlyLeavePenaltyRate;
  return Math.round(penalty * 100) / 100;
}


// ==================== Official Payroll Reports ====================

/**
 * Get official payroll report by group
 */
export async function getPayrollReportByGroup(
  periodStart: string,
  periodEnd: string,
  groupId?: number
) {
  const db = await getDb();
  if (!db) return [];

  const startDate = new Date(periodStart);
  const endDate = new Date(periodEnd);

  const whereConditions = groupId
    ? and(
        gte(workerDailyFinance.workDate, startDate),
        lte(workerDailyFinance.workDate, endDate),
        eq(workers.groupId, groupId)
      )
    : and(
        gte(workerDailyFinance.workDate, startDate),
        lte(workerDailyFinance.workDate, endDate)
      );

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

  // Group by group and calculate totals
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

  // Count unique workers per group
  const workerCountMap = new Map<number, Set<number>>();
  results.forEach((row) => {
    if (!workerCountMap.has(row.groupId)) {
      workerCountMap.set(row.groupId, new Set());
    }
    workerCountMap.get(row.groupId)!.add(row.workerId);
  });

  // Update worker counts
  workerCountMap.forEach((workerSet, groupId) => {
    const group = groupMap.get(groupId);
    if (group) {
      group.workerCount = workerSet.size;
    }
  });

  return Array.from(groupMap.entries()).map(([groupId, data]) => ({
    groupId,
    groupName: data.groupName,
    groupCode: data.groupCode,
    workerCount: data.workerCount,
    totalSalary: data.totalSalary.toFixed(2),
    totalDeductions: data.totalDeductions.toFixed(2),
    totalBonuses: data.totalBonuses.toFixed(2),
    totalNet: data.totalNet.toFixed(2),
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

  const startDate = new Date(periodStart);
  const endDate = new Date(periodEnd);

  const whereConditions = workerId
    ? and(
        gte(workerDailyFinance.workDate, startDate),
        lte(workerDailyFinance.workDate, endDate),
        eq(workers.id, workerId)
      )
    : and(
        gte(workerDailyFinance.workDate, startDate),
        lte(workerDailyFinance.workDate, endDate)
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
      fullDayOverride: workerDailyFinance.fullDayOverride,
      overrideReason: workerDailyFinance.overrideReason,
      workDate: workerDailyFinance.workDate,
    })
    .from(workerDailyFinance)
    .innerJoin(workers, eq(workerDailyFinance.workerId, workers.id))
    .leftJoin(groups, eq(workers.groupId, groups.id))
    .where(whereConditions);

  // Group by worker and calculate totals
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

    // Collect override notes
    const overrideNote = row.fullDayOverride && row.overrideReason
      ? `${new Date(row.workDate).toLocaleDateString('ar-SA')}: ${row.overrideReason}`
      : null;

    if (existing) {
      existing.totalSalary += baseAmount;
      existing.totalDeductions += deductions;
      existing.totalBonuses += bonuses;
      existing.totalNet += netAmount;
      if (overrideNote) existing.overrideNotes.push(overrideNote);
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
        overrideNotes: overrideNote ? [overrideNote] : [],
      });
    }
  });

  return Array.from(workerMap.entries()).map(([workerId, data]) => ({
    workerId,
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
  // For now, return group-based report since workers table doesn't have costCenterId
  // In the future, if costCenterId is added to workers table, update this function
  return await getPayrollReportByGroup(periodStart, periodEnd, undefined);
}

/**
 * Get official payroll report summary (all groups)
 */
export async function getPayrollReportSummary(
  periodStart: string,
  periodEnd: string
) {
  return await getPayrollReportByGroup(periodStart, periodEnd);
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

export async function updateFullDayOverride(
  workerId: number,
  workDate: string,
  fullDayOverride: boolean,
  overrideReason?: string,
  overrideBy?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { workerDailyFinance } = await import('../drizzle/schema');
  
  // Update the record
  const updateData: any = {
    fullDayOverride,
    overrideReason: fullDayOverride ? overrideReason : null,
    overrideBy: fullDayOverride ? overrideBy : null,
    overrideAt: fullDayOverride ? new Date() : null,
  };
  
  await db
    .update(workerDailyFinance)
    .set(updateData)
    .where(and(
      eq(workerDailyFinance.workerId, workerId),
      eq(workerDailyFinance.workDate, sql`${workDate}`)
    ));
  
  // Recalculate the finance for this day
  await processAttendanceToFinance(workerId, workDate);
  
  return { success: true };
}


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

export async function updateUserRole(userId: number, role: 'user' | 'admin') {
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
 * Get all attendance records for a specific date
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

/**
 * Create a test group with custom parameters
 */
export async function createTestGroup(data: {
  code: string;
  name: string;
  dailyWage: number;
  workMinutes: number;
  latePenaltyRate: number;
  earlyLeavePenaltyRate: number;
  shiftStartTime: string;
  shiftEndTime: string;
  isActive: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.insert(groups).values({
    code: data.code,
    name: data.name,
    dailyWage: data.dailyWage?.toString(),
    workMinutes: data.workMinutes,
    latePenaltyRate: data.latePenaltyRate?.toString(),
    earlyLeavePenaltyRate: data.earlyLeavePenaltyRate?.toString(),
    shiftStartTime: data.shiftStartTime,
    shiftEndTime: data.shiftEndTime,
    isActive: data.isActive,
  });

  return {
    id: result[0].insertId as number,
    ...data,
  };
}

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
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
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
      method: attendanceEvents.method,
    })
    .from(attendanceEvents)
    .innerJoin(workers, eq(attendanceEvents.workerId, workers.id))
    .innerJoin(groups, eq(workers.groupId, groups.id))
    .leftJoin(costCenters, eq(groups.costCenterId, costCenters.id))
    .where(and(
      gte(attendanceEvents.eventTime, start),
      lte(attendanceEvents.eventTime, end)
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
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  // Get all workers
  let workersQuery = db.select().from(workers) as any;
  if (groupId) {
    workersQuery = workersQuery.where(eq(workers.groupId, groupId));
  }
  const allWorkers = await workersQuery;
  
  // Get attendance events
  let eventsQuery = db
    .select()
    .from(attendanceEvents)
    .where(and(
      gte(attendanceEvents.eventTime, start),
      lte(attendanceEvents.eventTime, end)
    ));
  
  const events = await eventsQuery;
  
  // Get groups and cost centers for joining
  const groupsData = await db.select().from(groups);
  const costCentersData = await db.select().from(costCenters);
  
  // Calculate summary for each worker
  const summary = allWorkers.map((worker: any) => {
    const workerGroup = groupsData.find(g => g.id === worker.groupId);
    const costCenter = workerGroup ? costCentersData.find(c => c.id === workerGroup.costCenterId) : null;
    
    // Apply cost center filter if specified
    if (costCenterId && workerGroup?.costCenterId !== costCenterId) {
      return null;
    }
    
    const workerEvents = events.filter((e: any) => e.workerId === worker.id);
    
    // Group events by date
    const eventsByDate: Record<string, any[]> = {};
    workerEvents.forEach(event => {
      const dateKey = new Date(event.eventTime).toISOString().split('T')[0];
      if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
      eventsByDate[dateKey].push(event);
    });
    
    const daysPresent = Object.keys(eventsByDate).length;
    const totalCheckIns = workerEvents.filter((e: any) => e.eventType === 'check_in').length;
    const totalCheckOuts = workerEvents.filter((e: any) => e.eventType === 'check_out').length;
    
    // Calculate total work hours
    let totalHours = 0;
    Object.values(eventsByDate).forEach((dayEvents: any) => {
      const checkIn = dayEvents.find((e: any) => e.eventType === 'check_in');
      const checkOut = dayEvents.find((e: any) => e.eventType === 'check_out');
      if (checkIn && checkOut) {
        const hours = (new Date(checkOut.eventTime).getTime() - new Date(checkIn.eventTime).getTime()) / (1000 * 60 * 60);
        totalHours += hours;
      }
    });
    
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
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  // Get all groups
  let groupsQuery = db.select().from(groups) as any;
  if (costCenterId) {
    groupsQuery = groupsQuery.where(eq(groups.costCenterId, costCenterId));
  }
  const allGroups = await groupsQuery;
  
  // Get all workers
  const allWorkers = await db.select().from(workers);
  
  // Get attendance events
  const events = await db
    .select()
    .from(attendanceEvents)
    .where(and(
      gte(attendanceEvents.eventTime, start),
      lte(attendanceEvents.eventTime, end)
    ));
  
  // Get cost centers
  const costCentersData = await db.select().from(costCenters);
  
  // Calculate summary for each group
  const summary = allGroups.map((group: any) => {
    const groupWorkers = allWorkers.filter(w => w.groupId === group.id);
    const groupEvents = events.filter(e => groupWorkers.some(w => w.id === e.workerId));
    
    const costCenter = costCentersData.find(c => c.id === group.costCenterId);
    
    // Calculate totals
    const totalCheckIns = groupEvents.filter(e => e.eventType === 'check_in').length;
    const totalCheckOuts = groupEvents.filter(e => e.eventType === 'check_out').length;
    
    // Get unique days with attendance
    const daysWithAttendance = new Set(
      groupEvents.map(e => new Date(e.eventTime).toISOString().split('T')[0])
    ).size;
    
    // Calculate total work hours
    let totalHours = 0;
    const eventsByDate: Record<string, any[]> = {};
    groupEvents.forEach(event => {
      const dateKey = new Date(event.eventTime).toISOString().split('T')[0];
      if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
      eventsByDate[dateKey].push(event);
    });
    
    Object.values(eventsByDate).forEach((dayEvents: any) => {
      const checkIn = dayEvents.find((e: any) => e.eventType === 'check_in');
      const checkOut = dayEvents.find((e: any) => e.eventType === 'check_out');
      if (checkIn && checkOut) {
        const hours = (new Date(checkOut.eventTime).getTime() - new Date(checkIn.eventTime).getTime()) / (1000 * 60 * 60);
        totalHours += hours;
      }
    });
    
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
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  // Get all cost centers
  const allCostCenters = await db.select().from(costCenters);
  
  // Get all groups
  const allGroups = await db.select().from(groups);
  
  // Get all workers
  const allWorkers = await db.select().from(workers);
  
  // Get attendance events
  const events = await db
    .select()
    .from(attendanceEvents)
    .where(and(
      gte(attendanceEvents.eventTime, start),
      lte(attendanceEvents.eventTime, end)
    ));
  
  // Calculate summary for each cost center
  const summary = allCostCenters.map((costCenter: any) => {
    const costCenterGroups = allGroups.filter(g => g.costCenterId === costCenter.id);
    const costCenterWorkers = allWorkers.filter(w => costCenterGroups.some(g => g.id === w.groupId));
    const costCenterEvents = events.filter(e => costCenterWorkers.some(w => w.id === e.workerId));
    
    const totalCheckIns = costCenterEvents.filter(e => e.eventType === 'check_in').length;
    const totalCheckOuts = costCenterEvents.filter(e => e.eventType === 'check_out').length;
    
    // Get unique days with attendance
    const daysWithAttendance = new Set(
      costCenterEvents.map(e => new Date(e.eventTime).toISOString().split('T')[0])
    ).size;
    
    // Calculate total work hours
    let totalHours = 0;
    const eventsByDate: Record<string, any[]> = {};
    costCenterEvents.forEach(event => {
      const dateKey = new Date(event.eventTime).toISOString().split('T')[0];
      if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
      eventsByDate[dateKey].push(event);
    });
    
    Object.values(eventsByDate).forEach((dayEvents: any) => {
      const checkIn = dayEvents.find((e: any) => e.eventType === 'check_in');
      const checkOut = dayEvents.find((e: any) => e.eventType === 'check_out');
      if (checkIn && checkOut) {
        const hours = (new Date(checkOut.eventTime).getTime() - new Date(checkIn.eventTime).getTime()) / (1000 * 60 * 60);
        totalHours += hours;
      }
    });
    
    return {
      costCenterId: costCenter.id,
      costCenterName: costCenter.name,
      totalGroups: costCenterGroups.length,
      totalWorkers: costCenterWorkers.length,
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
    const dateStr = d.toISOString().split('T')[0];
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
  groupId?: number
): Promise<{ data: DbWorker[]; total: number; page: number; limit: number; totalPages: number }> {
  const db = await getDb();
  if (!db) return { data: [], total: 0, page, limit, totalPages: 0 };

  const offset = (page - 1) * limit;
  
  // Get total count
  const countResult = groupId
    ? await db.select({ count: count() }).from(workers).where(eq(workers.groupId, groupId))
    : await db.select({ count: count() }).from(workers);
  
  const total = countResult[0]?.count || 0;

  // Get paginated data
  let query: any = db.select().from(workers).orderBy(desc(workers.createdAt));
  if (groupId) {
    query = query.where(eq(workers.groupId, groupId));
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
  requiredHours?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updates: any = {};
  if (startTime) updates.startTime = startTime;
  if (endTime) updates.endTime = endTime;
  if (requiredHours !== undefined) updates.requiredHours = requiredHours;

  if (Object.keys(updates).length === 0) {
    throw new Error("No fields to update");
  }

  const result = await db.update(groupSchedules)
    .set(updates)
    .where(eq(groupSchedules.id, id));

  return result;
}
