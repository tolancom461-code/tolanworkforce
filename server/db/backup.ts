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
  dailyWorkAssignments,
  // ✅ الجداول التي كانت مفقودة من النسخ الاحتياطي
  devices,
  payrollBatchSequences,
  jobs,
  loginSessions,
  paymentVouchers,
  deductionEntries,
  permissions,
  rolePermissions,
  roles,
  settings,
  userPermissions,
  userRoles,
  workerArchive,
} from "../../drizzle/schema";
import { sendNotification, sendNotificationToRoles, notifyStageAndAdmins, ADMIN_OWNER_ROLES } from '../notifications';
import { getRoleLabel } from '../permissions';
import { inArray, isNull, isNotNull, between } from "drizzle-orm";
import type { Worker as DbWorker } from "../../drizzle/schema";
import { ENV } from '../_core/env';
import { getDb } from './connection';

// ============================================
// Backup Functions - النسخ الاحتياطي
// ============================================

/**
 * Get all table names and row counts
 */
export async function getBackupTableInfo() {
  const database = await getDb();
  if (!database) return [];
  
  // ✅ تم تحديث القائمة لتشمل كل الـ36 جدولاً بقاعدة البيانات (لا يوجد أي جدول مستثنى)
  const tables = [
    { name: 'users', label: 'المستخدمين', table: users },
    { name: 'workers', label: 'العمال', table: workers },
    { name: 'worker_archive', label: 'أرشيف العمال', table: workerArchive },
    { name: 'groups', label: 'المجموعات', table: groups },
    { name: 'cost_centers', label: 'مراكز التكلفة', table: costCenters },
    { name: 'attendance_events', label: 'سجل الحضور', table: attendanceEvents },
    { name: 'work_days', label: 'أيام العمل', table: workDays },
    { name: 'group_schedules', label: 'جداول المجموعات', table: groupSchedules },
    { name: 'worker_daily_finance', label: 'المالية اليومية', table: workerDailyFinance },
    { name: 'payroll_batches', label: 'دفعات الرواتب', table: payrollBatches },
    { name: 'payroll_batch_items', label: 'عناصر دفعات الرواتب', table: payrollBatchItems },
    { name: 'payroll_batch_notes', label: 'ملاحظات دفعات الرواتب', table: payrollBatchNotes },
    { name: 'payroll_batch_corrections', label: 'تصحيحات دفعات الرواتب', table: payrollBatchCorrections },
    { name: 'payroll_batch_sequences', label: 'تسلسل دفعات الرواتب', table: payrollBatchSequences },
    { name: 'pay_overrides', label: 'التجاوزات المالية', table: payOverrides },
    { name: 'payment_vouchers', label: 'سندات الصرف', table: paymentVouchers },
    { name: 'deduction_rules', label: 'قواعد الخصم', table: deductionRules },
    { name: 'deduction_entries', label: 'قيود الخصم', table: deductionEntries },
    { name: 'operational_flags', label: 'البلاغات التشغيلية', table: operationalFlags },
    { name: 'temporary_assignments', label: 'الانتدابات المؤقتة', table: temporaryAssignments },
    { name: 'assignment_settlements', label: 'تسويات الانتدابات', table: assignmentSettlements },
    { name: 'daily_work_assignments', label: 'تكليفات العمل اليومية', table: dailyWorkAssignments },
    { name: 'restaurants', label: 'المطاعم', table: restaurants },
    { name: 'jobs', label: 'المسميات الوظيفية', table: jobs },
    { name: 'devices', label: 'الأجهزة', table: devices },
    { name: 'user_cost_centers', label: 'مراكز تكلفة المستخدمين', table: userCostCenters },
    { name: 'roles', label: 'الأدوار', table: roles },
    { name: 'permissions', label: 'الصلاحيات', table: permissions },
    { name: 'role_permissions', label: 'صلاحيات الأدوار', table: rolePermissions },
    { name: 'user_roles', label: 'أدوار المستخدمين', table: userRoles },
    { name: 'user_permissions', label: 'صلاحيات المستخدمين', table: userPermissions },
    { name: 'settings', label: 'إعدادات النظام', table: settings },
    { name: 'login_sessions', label: 'جلسات الدخول', table: loginSessions },
    { name: 'audit_log', label: 'سجل التدقيق', table: auditLog },
    { name: 'notifications', label: 'الإشعارات', table: notifications },
    { name: 'push_subscriptions', label: 'اشتراكات الإشعارات', table: pushSubscriptions },
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
    users, workers, worker_archive: workerArchive, groups, costCenters: costCenters, 
    attendance_events: attendanceEvents, work_days: workDays,
    payroll_batches: payrollBatches, payroll_batch_items: payrollBatchItems,
    payroll_batch_notes: payrollBatchNotes, payroll_batch_corrections: payrollBatchCorrections,
    payroll_batch_sequences: payrollBatchSequences,
    operational_flags: operationalFlags, temporary_assignments: temporaryAssignments,
    assignment_settlements: assignmentSettlements, daily_work_assignments: dailyWorkAssignments,
    restaurants, jobs, devices,
    audit_log: auditLog, pay_overrides: payOverrides, payment_vouchers: paymentVouchers,
    group_schedules: groupSchedules, worker_daily_finance: workerDailyFinance,
    cost_centers: costCenters, deduction_rules: deductionRules, deduction_entries: deductionEntries,
    user_cost_centers: userCostCenters,
    roles, permissions, role_permissions: rolePermissions,
    user_roles: userRoles, user_permissions: userPermissions,
    settings, login_sessions: loginSessions,
    notifications, push_subscriptions: pushSubscriptions,
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
  
  // ✅ القائمة الكاملة لكل جداول قاعدة البيانات (36 جدولاً) بدون استثناء
  const allTables = [
    { name: 'cost_centers', table: costCenters },
    { name: 'users', table: users },
    { name: 'groups', table: groups },
    { name: 'group_schedules', table: groupSchedules },
    { name: 'workers', table: workers },
    { name: 'worker_archive', table: workerArchive },
    { name: 'attendance_events', table: attendanceEvents },
    { name: 'work_days', table: workDays },
    { name: 'worker_daily_finance', table: workerDailyFinance },
    { name: 'pay_overrides', table: payOverrides },
    { name: 'payment_vouchers', table: paymentVouchers },
    { name: 'deduction_rules', table: deductionRules },
    { name: 'deduction_entries', table: deductionEntries },
    { name: 'payroll_batches', table: payrollBatches },
    { name: 'payroll_batch_items', table: payrollBatchItems },
    { name: 'payroll_batch_notes', table: payrollBatchNotes },
    { name: 'payroll_batch_corrections', table: payrollBatchCorrections },
    { name: 'payroll_batch_sequences', table: payrollBatchSequences },
    { name: 'operational_flags', table: operationalFlags },
    { name: 'temporary_assignments', table: temporaryAssignments },
    { name: 'assignment_settlements', table: assignmentSettlements },
    { name: 'daily_work_assignments', table: dailyWorkAssignments },
    { name: 'restaurants', table: restaurants },
    { name: 'jobs', table: jobs },
    { name: 'devices', table: devices },
    { name: 'user_cost_centers', table: userCostCenters },
    { name: 'roles', table: roles },
    { name: 'permissions', table: permissions },
    { name: 'role_permissions', table: rolePermissions },
    { name: 'user_roles', table: userRoles },
    { name: 'user_permissions', table: userPermissions },
    { name: 'settings', table: settings },
    { name: 'login_sessions', table: loginSessions },
    { name: 'audit_log', table: auditLog },
    { name: 'notifications', table: notifications },
    { name: 'push_subscriptions', table: pushSubscriptions },
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


