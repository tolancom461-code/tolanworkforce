import { eq, and, desc, count } from "drizzle-orm";
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
  workers, InsertWorker
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

  await db.update(groups).set({ ...data, updatedAt: new Date() }).where(eq(groups.id, id));
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
