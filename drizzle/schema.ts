import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, date, json, index } from "drizzle-orm/mysql-core";

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



// ============================================
// Users & Permissions (المستخدمين والصلاحيات)
// ============================================
// Role-Based Access Control (RBAC) - 8 roles
export const userRoleEnum = ["guard", "supervisor_tolan", "supervisor_malqa", "admin_affairs", "accountant", "auditor", "finance_manager", "executive", "super_admin"] as const;
export type UserRole = typeof userRoleEnum[number];

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  isActive: boolean("is_active").default(true),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["guard", "supervisor_tolan", "supervisor_malqa", "admin_affairs", "accountant", "auditor", "finance_manager", "executive", "super_admin"]).default("guard").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

// User-CostCenter mapping for supervisor role restrictions
export const userCostCenters = mysqlTable("user_cost_centers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  costCenterId: int("cost_center_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================
// Groups & Workers (المجموعات والعمال)
// ============================================

export const groups = mysqlTable("groups", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  costCenterId: int("cost_center_id").references(() => costCenters.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  supervisorId: int("supervisor_id").references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  dailyRate: decimal("daily_rate", { precision: 10, scale: 2 }),
  // Flexible financial settings
  dailyWage: decimal("daily_wage", { precision: 10, scale: 2 }),
  workMinutes: int("work_minutes"),
  minuteCost: decimal("minute_cost", { precision: 10, scale: 4 }),
  latePenaltyRate: decimal("late_penalty_rate", { precision: 5, scale: 2 }),
  earlyLeavePenaltyRate: decimal("early_leave_penalty_rate", { precision: 5, scale: 2 }),
  // Flexible schedule settings
  isFlexibleSchedule: boolean("is_flexible_schedule").default(false),
  requiredHours: decimal("required_hours", { precision: 4, scale: 2 }).default("8.00"),
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
  groupId: int("group_id").references(() => groups.id, { onDelete: 'set null', onUpdate: 'cascade' }),
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
}, (table) => ({
  groupIdIdx: index("idx_workers_group_id").on(table.groupId),
  statusIdx: index("idx_workers_status").on(table.status),
  codeIdx: index("idx_workers_code").on(table.code),
}));

export const workerArchive = mysqlTable("worker_archive", {
  id: int("id").autoincrement().primaryKey(),
  workerId: int("worker_id").notNull().references(() => workers.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  archivedAt: timestamp("archived_at").defaultNow().notNull(),
  reason: text("reason"),
  archivedBy: int("archived_by").references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }),
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
  workerId: int("worker_id").notNull().references(() => workers.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  eventType: mysqlEnum("event_type", ["check_in", "check_out"]).notNull(),
  eventTime: timestamp("event_time").notNull(),
  deviceId: int("device_id"),
  verifiedBy: int("verified_by").references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  method: varchar("method", { length: 50 }),
  note: text("note"),
  isAutomatic: boolean("is_automatic").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  workerIdIdx: index("idx_attendance_worker_id").on(table.workerId),
  eventTimeIdx: index("idx_attendance_event_time").on(table.eventTime),
  workerEventIdx: index("idx_attendance_worker_event").on(table.workerId, table.eventTime),
}));



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
  workerId: int("worker_id").notNull().references(() => workers.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  overrideDate: date("override_date").notNull(),
  overrideType: mysqlEnum("override_type", ["bonus", "deduction", "advance", "emergency_call"]).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending"),
  approvedBy: int("approved_by").references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  approvedAt: timestamp("approved_at"),
  createdBy: int("created_by").references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  workerIdIdx: index("idx_pay_overrides_worker_id").on(table.workerId),
  overrideDateIdx: index("idx_pay_overrides_override_date").on(table.overrideDate),
  statusIdx: index("idx_pay_overrides_status").on(table.status),
}));

// ============================================
// Finance & Payroll (المالية والرواتب)
// ============================================

export const workerDailyFinance = mysqlTable("worker_daily_finance", {
  id: int("id").autoincrement().primaryKey(),
  workerId: int("worker_id").notNull().references(() => workers.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  workDate: date("work_date").notNull(),
  checkInTime: timestamp("check_in_time"),
  checkOutTime: timestamp("check_out_time"),
  workedMinutes: int("worked_minutes").default(0),
  financialMinutes: int("financial_minutes").default(0),
  baseSalary: decimal("base_salary", { precision: 10, scale: 2 }).default("0.00"),
  latePenalty: decimal("late_penalty", { precision: 10, scale: 2 }).default("0.00"),
  earlyLeavePenalty: decimal("early_leave_penalty", { precision: 10, scale: 2 }).default("0.00"),
  netSalary: decimal("net_salary", { precision: 10, scale: 2 }).default("0.00"),
  baseAmount: decimal("base_amount", { precision: 10, scale: 2 }).default("0.00"),
  deductions: decimal("deductions", { precision: 10, scale: 2 }).default("0.00"),
  bonuses: decimal("bonuses", { precision: 10, scale: 2 }).default("0.00"),
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }).default("0.00"),
  lateMinutes: int("late_minutes").default(0),
  earlyLeaveMinutes: int("early_leave_minutes").default(0),
  notes: text("notes"),
  // Double payment protection: links day to approved batch
  lockedBatchId: int("locked_batch_id").references(() => payrollBatches.id, { onDelete: 'set null', onUpdate: 'cascade' }), // NULL = unlocked, set when batch is approved
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  workerIdIdx: index("idx_daily_finance_worker_id").on(table.workerId),
  workDateIdx: index("idx_daily_finance_work_date").on(table.workDate),
  lockedBatchIdx: index("idx_daily_finance_locked_batch").on(table.lockedBatchId),
  workerDateIdx: index("idx_daily_finance_worker_date").on(table.workerId, table.workDate),
}));

export const payrollBatches = mysqlTable("payroll_batches", {
  id: int("id").autoincrement().primaryKey(),
  batchCode: varchar("batch_code", { length: 50 }).notNull().unique(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  groupId: int("group_id").references(() => groups.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  costCenterId: int("cost_center_id").references(() => costCenters.id, { onDelete: 'set null', onUpdate: 'cascade' }),
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
  // Accountant review (المحاسب المالي - المرحلة 1)
  accountantApprovedBy: int("accountant_approved_by").references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  accountantApprovedAt: timestamp("accountant_approved_at"),
  // Auditor review (المراجع المالي - المرحلة 2)
  auditorApprovedBy: int("auditor_approved_by").references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  auditorApprovedAt: timestamp("auditor_approved_at"),
  // Finance Manager final approval (المدير المالي - المرحلة 3)
  financeApprovedBy: int("finance_approved_by").references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  financeApprovedAt: timestamp("finance_approved_at"),
  // General approval (legacy)
  approvedBy: int("approved_by").references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  approvedAt: timestamp("approved_at"),
  // Rejection tracking
  rejectedBy: int("rejected_by").references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  rejectionStage: varchar("rejection_stage", { length: 50 }),
  createdBy: int("created_by").references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  // Force unlock fields
  isUnlocked: boolean("is_unlocked").default(false),
  unlockReason: text("unlock_reason"),
  unlockedBy: int("unlocked_by").references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  unlockedAt: timestamp("unlocked_at"),
}, (table) => ({
  statusIdx: index("idx_payroll_batches_status").on(table.status),
  periodStartIdx: index("idx_payroll_batches_period_start").on(table.periodStart),
  periodEndIdx: index("idx_payroll_batches_period_end").on(table.periodEnd),
  groupIdIdx: index("idx_payroll_batches_group_id").on(table.groupId),
}));

export const payrollBatchItems = mysqlTable("payroll_batch_items", {
  id: int("id").autoincrement().primaryKey(),
  batchId: int("batch_id").notNull().references(() => payrollBatches.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  workerId: int("worker_id").notNull().references(() => workers.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  daysWorked: int("days_worked").default(0),
  baseAmount: decimal("base_amount", { precision: 10, scale: 2 }).default("0.00"),
  totalDeductions: decimal("total_deductions", { precision: 10, scale: 2 }).default("0.00"),
  totalBonuses: decimal("total_bonuses", { precision: 10, scale: 2 }).default("0.00"),
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }).default("0.00"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  batchIdIdx: index("idx_payroll_items_batch_id").on(table.batchId),
  workerIdIdx: index("idx_payroll_items_worker_id").on(table.workerId),
  batchWorkerIdx: index("idx_payroll_items_batch_worker").on(table.batchId, table.workerId),
}));

// Payroll Batch Notes (ملاحظات المراجعة)
export const payrollBatchNotes = mysqlTable("payroll_batch_notes", {
  id: int("id").autoincrement().primaryKey(),
  batchId: int("batch_id").notNull().references(() => payrollBatches.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  reviewerId: int("reviewer_id").notNull().references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  reviewerRole: varchar("reviewer_role", { length: 50 }).notNull(),
  noteType: mysqlEnum("note_type", ["critical", "warning", "info"]).default("info"),
  errorLocation: varchar("error_location", { length: 255 }),
  workerId: int("worker_id").references(() => workers.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  fieldName: varchar("field_name", { length: 100 }),
  note: text("note").notNull(),
  attachmentUrl: varchar("attachment_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Payroll Batch Corrections (سجل التصحيحات)
export const payrollBatchCorrections = mysqlTable("payroll_batch_corrections", {
  id: int("id").autoincrement().primaryKey(),
  batchId: int("batch_id").notNull().references(() => payrollBatches.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  correctorId: int("corrector_id").notNull().references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  correctionNote: text("correction_note"),
  previousStatus: varchar("previous_status", { length: 50 }),
  newStatus: varchar("new_status", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================
// Temporary Assignments (الانتدابات المؤقتة)
// ============================================

export const temporaryAssignments = mysqlTable("temporary_assignments", {
  id: int("id").autoincrement().primaryKey(),
  workerId: int("worker_id").notNull().references(() => workers.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  fromCostCenterId: int("from_cost_center_id").references(() => costCenters.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  toCostCenterId: int("to_cost_center_id").notNull().references(() => costCenters.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  notes: text("notes"),
  status: mysqlEnum("status", ["active", "cancelled"]).default("active"),
  createdBy: int("created_by").references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  workerIdIdx: index("idx_temp_assign_worker_id").on(table.workerId),
  toCostCenterIdx: index("idx_temp_assign_to_cost_center").on(table.toCostCenterId),
  dateRangeIdx: index("idx_temp_assign_dates").on(table.startDate, table.endDate),
}));

export type TemporaryAssignment = typeof temporaryAssignments.$inferSelect;
export type InsertTemporaryAssignment = typeof temporaryAssignments.$inferInsert;

// ============================================
// Audit Log (سجل التدقيق)
// ============================================

export const auditLog = mysqlTable("audit_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }),
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

export type CostCenter = typeof costCenters.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type Worker = typeof workers.$inferSelect;
export type AttendanceEvent = typeof attendanceEvents.$inferSelect;
export type PayrollBatch = typeof payrollBatches.$inferSelect;

export type InsertGroup = typeof groups.$inferInsert;
export type InsertWorker = typeof workers.$inferInsert;



// ============================================
// Operational Flags (البلاغات التشغيلية)
// ============================================

export const operationalFlags = mysqlTable("operational_flags", {
  id: int("id").autoincrement().primaryKey(),
  workerId: int("worker_id").notNull().references(() => workers.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  groupId: int("group_id").references(() => groups.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  costCenterId: int("cost_center_id").references(() => costCenters.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  flagDate: date("flag_date").notNull(), // تاريخ البلاغ
  flagType: mysqlEnum("flag_type", [
    "confirm_attendance",  // تأكيد حضور
    "confirm_absence",     // تأكيد غياب
    "transfer",            // نقل/انتداب عامل
    "other"                // أخرى
  ]).default("other").notNull(),
  description: text("description").notNull(), // وصف الاستثناء/التعديل
  status: mysqlEnum("status", [
    "pending",   // بانتظار الموافقة
    "approved",  // تم الاعتماد
    "rejected"   // تم الرفض
  ]).default("pending").notNull(),
  approvedBy: int("approved_by").references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }), // من اعتمد البلاغ
  approvedAt: timestamp("approved_at"), // متى تم الاعتماد
  approvalNotes: text("approval_notes"), // ملاحظات الاعتماد/الرفض
  createdBy: int("created_by").notNull().references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }), // من أنشأ البلاغ (المشرف)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  workerIdIdx: index("idx_op_flags_worker_id").on(table.workerId),
  flagDateIdx: index("idx_op_flags_flag_date").on(table.flagDate),
  statusIdx: index("idx_op_flags_status").on(table.status),
  flagTypeIdx: index("idx_op_flags_flag_type").on(table.flagType),
}));

export type OperationalFlag = typeof operationalFlags.$inferSelect;
export type InsertOperationalFlag = typeof operationalFlags.$inferInsert;

// Group Schedules - Flexible Weekly Schedules (جداول الورديات المتغيرة)
export const groupSchedules = mysqlTable("group_schedules", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("group_id").notNull().references(() => groups.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  dayOfWeek: int("day_of_week").notNull(), // 0=Sunday, 1=Monday, ..., 6=Saturday
  startTime: varchar("start_time", { length: 10 }).notNull(), // HH:MM format
  endTime: varchar("end_time", { length: 10 }).notNull(), // HH:MM format
  requiredHours: decimal("required_hours", { precision: 4, scale: 2 }).notNull(),
  effectiveDate: date("effective_date"), // تاريخ بدء تطبيق الوردية (NULL = تطبيق فوري)
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
