import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, date } from "drizzle-orm/mysql-core";

// ============================================
// Reference Tables (المراجع)
// ============================================

export const costCenters = mysqlTable("cost_centers", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const jobs = mysqlTable("jobs", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const settings = mysqlTable("settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// ============================================
// Users & Permissions (المستخدمين والصلاحيات)
// ============================================

export const roles = mysqlTable("roles", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  level: int("level").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const permissions = mysqlTable("permissions", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const rolePermissions = mysqlTable("role_permissions", {
  id: int("id").autoincrement().primaryKey(),
  roleId: int("role_id").notNull(),
  permissionId: int("permission_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  roleId: int("role_id"),
  isActive: boolean("is_active").default(true),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const userRoles = mysqlTable("user_roles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  roleId: int("role_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userPermissions = mysqlTable("user_permissions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  permissionId: int("permission_id").notNull(),
  granted: boolean("granted").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================
// Groups & Workers (المجموعات والعمال)
// ============================================

export const groups = mysqlTable("groups", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  costCenterId: int("cost_center_id"),
  supervisorId: int("supervisor_id"),
  dailyRate: decimal("daily_rate", { precision: 10, scale: 2 }),
  workHours: decimal("work_hours", { precision: 4, scale: 2 }).default("8.00"),
  // New flexible settings (NULL by default)
  dailyWage: decimal("daily_wage", { precision: 10, scale: 2 }),
  workMinutes: int("work_minutes"),
  minuteCost: decimal("minute_cost", { precision: 10, scale: 4 }),
  latePenaltyRate: decimal("late_penalty_rate", { precision: 5, scale: 2 }),
  earlyLeavePenaltyRate: decimal("early_leave_penalty_rate", { precision: 5, scale: 2 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const groupShifts = mysqlTable("group_shifts", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("group_id").notNull(),
  shiftName: varchar("shift_name", { length: 100 }).notNull(),
  startTime: varchar("start_time", { length: 10 }).notNull(),
  endTime: varchar("end_time", { length: 10 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const workers = mysqlTable("workers", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  nationalId: varchar("national_id", { length: 20 }),
  phone: varchar("phone", { length: 20 }),
  groupId: int("group_id"),
  jobId: int("job_id"),
  dailyRate: decimal("daily_rate", { precision: 10, scale: 2 }),
  photoUrl: text("photo_url"),
  qrToken: varchar("qr_token", { length: 100 }),
  manualCode: varchar("manual_code", { length: 20 }),
  status: mysqlEnum("status", ["active", "inactive", "archived"]).default("active"),
  lastAttendanceAt: timestamp("last_attendance_at"),
  hireDate: date("hire_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const workerArchive = mysqlTable("worker_archive", {
  id: int("id").autoincrement().primaryKey(),
  workerId: int("worker_id").notNull(),
  archivedAt: timestamp("archived_at").defaultNow().notNull(),
  reason: text("reason"),
  archivedBy: int("archived_by"),
});

// ============================================
// Attendance (الحضور)
// ============================================

export const workDays = mysqlTable("work_days", {
  id: int("id").autoincrement().primaryKey(),
  workDate: date("work_date").notNull(),
  dayType: mysqlEnum("day_type", ["normal", "holiday", "weekend"]).default("normal"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const attendanceEvents = mysqlTable("attendance_events", {
  id: int("id").autoincrement().primaryKey(),
  workerId: int("worker_id").notNull(),
  eventType: mysqlEnum("event_type", ["check_in", "check_out"]).notNull(),
  eventTime: timestamp("event_time").notNull(),
  deviceId: int("device_id"),
  verifiedBy: int("verified_by"),
  method: varchar("method", { length: 50 }),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const devices = mysqlTable("devices", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  isActive: boolean("is_active").default(true),
  lastSeen: timestamp("last_seen"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// ============================================
// Deductions & Overrides (الخصومات والاستثناءات)
// ============================================

export const deductionRules = mysqlTable("deduction_rules", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  ruleType: mysqlEnum("rule_type", ["late", "early_leave", "absence", "other"]).notNull(),
  minMinutes: int("min_minutes").default(0),
  maxMinutes: int("max_minutes"),
  deductionType: mysqlEnum("deduction_type", ["fixed", "percentage", "hourly"]).notNull(),
  deductionValue: decimal("deduction_value", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const payOverrides = mysqlTable("pay_overrides", {
  id: int("id").autoincrement().primaryKey(),
  workerId: int("worker_id").notNull(),
  overrideDate: date("override_date").notNull(),
  overrideType: mysqlEnum("override_type", ["bonus", "deduction", "advance", "emergency_call"]).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending"),
  approvedBy: int("approved_by"),
  approvedAt: timestamp("approved_at"),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// ============================================
// Finance & Payroll (المالية والرواتب)
// ============================================

export const workerDailyFinance = mysqlTable("worker_daily_finance", {
  id: int("id").autoincrement().primaryKey(),
  workerId: int("worker_id").notNull(),
  workDate: date("work_date").notNull(),
  baseAmount: decimal("base_amount", { precision: 10, scale: 2 }).default("0.00"),
  deductions: decimal("deductions", { precision: 10, scale: 2 }).default("0.00"),
  bonuses: decimal("bonuses", { precision: 10, scale: 2 }).default("0.00"),
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }).default("0.00"),
  lateMinutes: int("late_minutes").default(0),
  earlyLeaveMinutes: int("early_leave_minutes").default(0),
  fullDayOverride: boolean("full_day_override").default(false),
  overrideReason: text("override_reason"),
  overrideBy: int("override_by"),
  overrideAt: timestamp("override_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const payrollBatches = mysqlTable("payroll_batches", {
  id: int("id").autoincrement().primaryKey(),
  batchCode: varchar("batch_code", { length: 50 }).notNull().unique(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  groupId: int("group_id"),
  costCenterId: int("cost_center_id"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).default("0.00"),
  totalWorkers: int("total_workers").default(0),
  totalDeductions: decimal("total_deductions", { precision: 12, scale: 2 }).default("0.00"),
  totalBonuses: decimal("total_bonuses", { precision: 12, scale: 2 }).default("0.00"),
  status: mysqlEnum("status", [
    "draft",
    "under_accountant_review",
    "returned_from_accountant",
    "under_financial_review",
    "returned_from_financial_review",
    "under_accounts_manager_review",
    "approved",
    "rejected_final",
    "paid"
  ]).default("draft"),
  rejectionCount: int("rejection_count").default(0),
  notes: text("notes"),
  approvedBy: int("approved_by"),
  approvedAt: timestamp("approved_at"),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  // Force unlock fields
  isUnlocked: boolean("is_unlocked").default(false),
  unlockReason: text("unlock_reason"),
  unlockedBy: int("unlocked_by"),
  unlockedAt: timestamp("unlocked_at"),
});

export const payrollBatchItems = mysqlTable("payroll_batch_items", {
  id: int("id").autoincrement().primaryKey(),
  batchId: int("batch_id").notNull(),
  workerId: int("worker_id").notNull(),
  daysWorked: int("days_worked").default(0),
  baseAmount: decimal("base_amount", { precision: 10, scale: 2 }).default("0.00"),
  totalDeductions: decimal("total_deductions", { precision: 10, scale: 2 }).default("0.00"),
  totalBonuses: decimal("total_bonuses", { precision: 10, scale: 2 }).default("0.00"),
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }).default("0.00"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// Payroll Batch Notes (ملاحظات المراجعة)
export const payrollBatchNotes = mysqlTable("payroll_batch_notes", {
  id: int("id").autoincrement().primaryKey(),
  batchId: int("batch_id").notNull(),
  reviewerId: int("reviewer_id").notNull(),
  reviewerRole: varchar("reviewer_role", { length: 50 }).notNull(),
  noteType: mysqlEnum("note_type", ["critical", "warning", "info"]).default("info"),
  errorLocation: varchar("error_location", { length: 255 }),
  workerId: int("worker_id"),
  fieldName: varchar("field_name", { length: 100 }),
  note: text("note").notNull(),
  attachmentUrl: varchar("attachment_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Payroll Batch Corrections (سجل التصحيحات)
export const payrollBatchCorrections = mysqlTable("payroll_batch_corrections", {
  id: int("id").autoincrement().primaryKey(),
  batchId: int("batch_id").notNull(),
  correctorId: int("corrector_id").notNull(),
  correctionNote: text("correction_note"),
  previousStatus: varchar("previous_status", { length: 50 }),
  newStatus: varchar("new_status", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================
// Audit Log (سجل التدقيق)
// ============================================

export const auditLog = mysqlTable("audit_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id"),
  action: varchar("action", { length: 100 }).notNull(),
  tableName: varchar("table_name", { length: 100 }),
  recordId: int("record_id"),
  oldValues: text("old_values"),
  newValues: text("new_values"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================
// Type Exports
// ============================================

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Role = typeof roles.$inferSelect;
export type Permission = typeof permissions.$inferSelect;
export type CostCenter = typeof costCenters.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type Worker = typeof workers.$inferSelect;
export type AttendanceEvent = typeof attendanceEvents.$inferSelect;
export type PayrollBatch = typeof payrollBatches.$inferSelect;

export type InsertGroup = typeof groups.$inferInsert;
export type GroupShift = typeof groupShifts.$inferSelect;
export type InsertGroupShift = typeof groupShifts.$inferInsert;
export type InsertWorker = typeof workers.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;
