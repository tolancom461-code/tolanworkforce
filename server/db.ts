import { eq, desc, and, or, like, gte, lt, lte, sql, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  users, InsertUser, User,
  roles, Role,
  permissions, Permission,
  userRoles,
  userPermissions,
  rolePermissions,
  costCenters,
  groups, Group, InsertGroup,
  groupShifts, GroupShift, InsertGroupShift,
  workers, InsertWorker,
  attendanceEvents,
  workDays,
  workerDailyFinance,
  payOverrides,
  payrollBatches,
  payrollBatchItems,
  payrollBatchNotes,
  payrollBatchCorrections
} from "../drizzle/schema";

// Rename Worker type to avoid conflict with Web Worker
import type { Worker as DbWorker } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

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
    if (user.roleId !== undefined) {
      values.roleId = user.roleId;
      updateSet.roleId = user.roleId;
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
  return result.length > 0 ? result[0] : undefined;
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

export async function getAllRoles(): Promise<Role[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(roles).orderBy(roles.level);
}

export async function getRoleById(id: number): Promise<Role | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createRole(data: {
  code: string;
  name: string;
  description?: string;
  level?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [result] = await db.insert(roles).values({
    code: data.code,
    name: data.name,
    description: data.description || null,
    level: data.level || 0,
  });

  return { id: Number(result.insertId), success: true };
}

export async function updateRole(id: number, data: {
  code?: string;
  name?: string;
  description?: string;
  level?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.update(roles)
    .set(data)
    .where(eq(roles.id, id));

  return { success: true };
}

export async function deleteRole(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Delete role permissions first
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));
  
  // Delete user roles
  await db.delete(userRoles).where(eq(userRoles.roleId, id));
  
  // Delete role
  await db.delete(roles).where(eq(roles.id, id));

  return { success: true };
}

// ============================================
// Permission Functions
// ============================================

export async function getAllPermissions(): Promise<Permission[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(permissions).orderBy(permissions.category, permissions.code);
}

export async function getUserPermissions(userId: number): Promise<Permission[]> {
  const db = await getDb();
  if (!db) return [];

  // Get direct user permissions
  const directPerms = await db
    .select({ permission: permissions })
    .from(userPermissions)
    .innerJoin(permissions, eq(userPermissions.permissionId, permissions.id))
    .where(and(eq(userPermissions.userId, userId), eq(userPermissions.granted, true)));

  return directPerms.map(p => p.permission);
}

export async function getUserRolePermissions(userId: number): Promise<Permission[]> {
  const db = await getDb();
  if (!db) return [];

  // Get permissions through roles
  const rolePerms = await db
    .select({ permission: permissions })
    .from(userRoles)
    .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(userRoles.userId, userId));

  return rolePerms.map(p => p.permission);
}

export async function checkUserPermission(userId: number, permissionCode: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // Get all user permissions (direct + role-based)
  const directPerms = await getUserPermissions(userId);
  const rolePerms = await getUserRolePermissions(userId);
  const allPerms = [...directPerms, ...rolePerms];
  
  return allPerms.some(p => p.code === permissionCode);
}

export async function setUserPermissions(userId: number, permissionIds: number[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete existing permissions
  await db.delete(userPermissions).where(eq(userPermissions.userId, userId));

  // Insert new permissions
  if (permissionIds.length > 0) {
    const values = permissionIds.map(permissionId => ({
      userId,
      permissionId,
      granted: true,
    }));
    await db.insert(userPermissions).values(values);
  }
}

export async function assignRoleToUser(userId: number, roleId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete existing role assignments
  await db.delete(userRoles).where(eq(userRoles.userId, userId));

  // Insert new role
  await db.insert(userRoles).values({ userId, roleId });
}

// ============================================
// Statistics Functions
// ============================================

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return { users: 0, roles: 0, permissions: 0, groups: 0, workers: 0, costCenters: 0 };

  const [userCount] = await db.select({ value: count() }).from(users);
  const [roleCount] = await db.select({ value: count() }).from(roles);
  const [permCount] = await db.select({ value: count() }).from(permissions);
  const [groupCount] = await db.select({ value: count() }).from(groups);
  const [workerCount] = await db.select({ value: count() }).from(workers);
  const [ccCount] = await db.select({ value: count() }).from(costCenters);

  return {
    users: userCount?.value || 0,
    roles: roleCount?.value || 0,
    permissions: permCount?.value || 0,
    groups: groupCount?.value || 0,
    workers: workerCount?.value || 0,
    costCenters: ccCount?.value || 0,
  };
}


// ============================================
// Groups Functions
// ============================================



export async function getAllGroups(): Promise<Group[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(groups).orderBy(desc(groups.createdAt));
}

export async function getGroupById(id: number): Promise<Group | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(groups).where(eq(groups.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createGroup(group: InsertGroup): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

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
  return result[0].insertId;
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

export async function createWorker(worker: InsertWorker): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

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
    const workerEvents = events.filter(e => e.workerId === worker.id);
    
    // Group events by date
    const eventsByDate = workerEvents.reduce((acc, event) => {
      const dateKey = new Date(event.eventTime).toISOString().split('T')[0];
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(event);
      return acc;
    }, {} as Record<string, typeof workerEvents>);
    
    const daysPresent = Object.keys(eventsByDate).length;
    const totalCheckIns = workerEvents.filter(e => e.eventType === 'check_in').length;
    const totalCheckOuts = workerEvents.filter(e => e.eventType === 'check_out').length;
    
    // Calculate total work hours
    let totalHours = 0;
    Object.values(eventsByDate).forEach(dayEvents => {
      const checkIn = dayEvents.find(e => e.eventType === 'check_in');
      const checkOut = dayEvents.find(e => e.eventType === 'check_out');
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

  const { attendanceEvents, workers, groups, groupShifts, workDays } = await import('../drizzle/schema');
  
  // Get worker with group info
  const [worker] = await db.select().from(workers).where(eq(workers.id, workerId)).limit(1);
  if (!worker) throw new Error("العامل غير موجود");
  
  // Get group and shift info
  let dailyRate = parseFloat(worker.dailyRate?.toString() || '0');
  let expectedStartTime = '08:00';
  let expectedEndTime = '17:00';
  
  // New: Group settings for minute-based calculations
  let groupDailyWage: number | null = null;
  let groupWorkMinutes: number | null = null;
  let groupLatePenaltyRate: number | null = null;
  let groupEarlyLeavePenaltyRate: number | null = null;
  
  if (worker.groupId) {
    const [group] = await db.select().from(groups).where(eq(groups.id, worker.groupId)).limit(1);
    if (group) {
      if (group.dailyRate) {
        dailyRate = dailyRate || parseFloat(group.dailyRate.toString());
      }
      // Load new flexible settings
      groupDailyWage = group.dailyWage ? parseFloat(group.dailyWage.toString()) : null;
      groupWorkMinutes = group.workMinutes;
      groupLatePenaltyRate = group.latePenaltyRate ? parseFloat(group.latePenaltyRate.toString()) : null;
      groupEarlyLeavePenaltyRate = group.earlyLeavePenaltyRate ? parseFloat(group.earlyLeavePenaltyRate.toString()) : null;
    }
    
    // Get shift
    const [shift] = await db.select().from(groupShifts).where(and(
      eq(groupShifts.groupId, worker.groupId),
      eq(groupShifts.isActive, true)
    )).limit(1);
    if (shift) {
      expectedStartTime = shift.startTime;
      expectedEndTime = shift.endTime;
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
  
  if (checkIn) {
    // Calculate late minutes
    const [expectedHour, expectedMin] = expectedStartTime.split(':').map(Number);
    const checkInTime = new Date(checkIn.eventTime);
    const expectedStart = new Date(checkInTime);
    expectedStart.setHours(expectedHour, expectedMin, 0, 0);
    
    if (checkInTime > expectedStart) {
      lateMinutes = Math.round((checkInTime.getTime() - expectedStart.getTime()) / (1000 * 60));
    }
  }
  
  if (checkOut) {
    // Calculate early leave minutes
    const [expectedHour, expectedMin] = expectedEndTime.split(':').map(Number);
    const checkOutTime = new Date(checkOut.eventTime);
    const expectedEnd = new Date(checkOutTime);
    expectedEnd.setHours(expectedHour, expectedMin, 0, 0);
    
    if (checkOutTime < expectedEnd) {
      earlyLeaveMinutes = Math.round((expectedEnd.getTime() - checkOutTime.getTime()) / (1000 * 60));
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
  groupId?: number;
  costCenterId?: number;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Generate batch code
  const batchCode = `PB-${Date.now()}`;

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
  const result = await db.insert(payrollBatches).values({
    batchCode,
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

  // Insert batch items
  const batchId = typeof result === 'object' && 'insertId' in result 
    ? Number(result.insertId) 
    : Number((result as any)[0]?.insertId || (result as any).insertId);
  
  if (isNaN(batchId) || batchId === 0) {
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

/**
 * Get permissions for a role
 */
export async function getRolePermissions(roleId: number): Promise<Permission[]> {
  const db = await getDb();
  if (!db) return [];

  const rolePerms = await db
    .select({ permission: permissions })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, roleId));

  return rolePerms.map(rp => rp.permission);
}

/**
 * Set permissions for a role (replace all)
 */
export async function setRolePermissions(roleId: number, permissionIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete existing permissions
  await db
    .delete(rolePermissions)
    .where(eq(rolePermissions.roleId, roleId));

  // Insert new permissions
  if (permissionIds.length > 0) {
    await db.insert(rolePermissions).values(
      permissionIds.map(permissionId => ({
        roleId,
        permissionId,
      }))
    );
  }

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

import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
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
  roleId?: number;
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const passwordHash = await hashPassword(data.password);
  
  const [result] = await db.insert(users).values({
    username: data.username,
    passwordHash,
    fullName: data.fullName,
    email: data.email,
    phone: data.phone,
    roleId: data.roleId,
    isActive: data.isActive ?? true,
    loginMethod: 'local',
    role: 'user',
  });
  
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
 * Formula: (dailyWage ÷ workMinutes) × lateMinutes × (1 + latePenaltyRate)
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
  const penalty = minuteCost * lateMinutes * (1 + latePenaltyRate);
  return Math.round(penalty * 100) / 100;
}

/**
 * Calculate early leave penalty based on group settings
 * Formula: (dailyWage ÷ workMinutes) × earlyLeaveMinutes × (1 + earlyLeavePenaltyRate)
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
  const penalty = minuteCost * earlyLeaveMinutes * (1 + earlyLeavePenaltyRate);
  return Math.round(penalty * 100) / 100;
}
