import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './drizzle/schema.ts';
import { eq, sql } from 'drizzle-orm';

// Database connection
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

console.log('🌱 Starting demo data seeding...');

// ============================================
// 0. Clear Existing Demo Data
// ============================================
console.log('🧹 Step 0: Clearing existing demo data...');

// Delete in correct order to respect foreign keys
await db.execute(sql`DELETE FROM \`attendance_events\``);
await db.execute(sql`DELETE FROM \`worker_daily_finance\``);
await db.execute(sql`DELETE FROM \`pay_overrides\``);
await db.execute(sql`DELETE FROM \`payroll_batch_items\``);
await db.execute(sql`DELETE FROM \`payroll_batches\``);
await db.execute(sql`DELETE FROM \`workers\``);
await db.execute(sql`DELETE FROM \`group_shifts\``);
await db.execute(sql`DELETE FROM \`groups\``);
await db.execute(sql`DELETE FROM \`cost_centers\` WHERE code LIKE 'CC%'`);
await db.execute(sql`DELETE FROM \`user_permissions\``);
await db.execute(sql`DELETE FROM \`user_roles\``);
await db.execute(sql`DELETE FROM \`users\` WHERE username IN ('superadmin', 'admin', 'hradmin', 'accountant', 'supervisor1', 'guard1')`);
await db.execute(sql`DELETE FROM \`role_permissions\``);
await db.execute(sql`DELETE FROM \`roles\` WHERE code IN ('SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'ACCOUNTANT', 'SUPERVISOR', 'GUARD')`);

console.log('✅ Cleared existing demo data\n');

// ============================================
// 1. Update Roles to 6 Roles
// ============================================
console.log('📋 Step 1: Updating roles to 6 roles...');;

const rolesData = [
  {
    code: 'SUPER_ADMIN',
    name: 'Super Admin',
    name_ar: 'مدير النظام الأعلى',
    description: 'Full system control - highest authority',
    description_ar: 'سيطرة كاملة على النظام - أعلى صلاحية',
    level: 1,
    is_active: true
  },
  {
    code: 'ADMIN',
    name: 'Admin',
    name_ar: 'مدير النظام',
    description: 'Daily system manager',
    description_ar: 'مدير النظام اليومي',
    level: 2,
    is_active: true
  },
  {
    code: 'HR_ADMIN',
    name: 'HR Admin',
    name_ar: 'مدير الشؤون الإدارية',
    description: 'HR and administrative operations',
    description_ar: 'الشؤون الإدارية والموارد البشرية',
    level: 3,
    is_active: true
  },
  {
    code: 'ACCOUNTANT',
    name: 'Accountant',
    name_ar: 'المحاسب',
    description: 'Financial review and approval',
    description_ar: 'المراجعة المالية والاعتماد',
    level: 4,
    is_active: true
  },
  {
    code: 'SUPERVISOR',
    name: 'Supervisor',
    name_ar: 'المشرف الميداني',
    description: 'Field supervisor - group specific',
    description_ar: 'مشرف ميداني - مجموعة محددة',
    level: 5,
    is_active: true
  },
  {
    code: 'GUARD',
    name: 'Guard',
    name_ar: 'الحارس',
    description: 'Attendance registration only',
    description_ar: 'تسجيل الحضور فقط',
    level: 6,
    is_active: true
  }
];

// Delete old role_permissions first (foreign key constraint)
try {
  await db.delete(schema.rolePermissions).where(sql`1=1`);
} catch (e) {
  // Table might be empty
}

// Delete old roles
try {
  await db.delete(schema.roles).where(sql`1=1`);
} catch (e) {
  // Table might be empty
}

for (const role of rolesData) {
  await db.insert(schema.roles).values(role);
}

console.log(`✅ Added ${rolesData.length} roles\n`);

// ============================================
// 2. Map Permissions to Roles
// ============================================
console.log('🔐 Step 2: Mapping permissions to roles...');

// Get all roles
const allRoles = await db.select().from(schema.roles);
const roleMap = {};
allRoles.forEach(r => roleMap[r.code] = r.id);

// Get all permissions
const allPermissions = await db.select().from(schema.permissions);
const permMap = {};
allPermissions.forEach(p => permMap[p.code] = p.id);

// Define permission mappings
const rolePermissions = {
  SUPER_ADMIN: Object.keys(permMap), // All permissions
  ADMIN: [
    // Users & Roles
    'VIEW_USERS', 'CREATE_USER', 'EDIT_USER', 'DELETE_USER',
    'VIEW_ROLES', 'ASSIGN_ROLE',
    // Groups & Workers
    'VIEW_GROUPS', 'CREATE_GROUP', 'EDIT_GROUP', 'DELETE_GROUP',
    'VIEW_WORKERS', 'CREATE_WORKER', 'EDIT_WORKER', 'DELETE_WORKER',
    // Attendance
    'VIEW_ATTENDANCE', 'REGISTER_ATTENDANCE',
    // Reports
    'VIEW_REPORTS', 'EXPORT_REPORTS',
    // Settings
    'VIEW_SETTINGS'
  ],
  HR_ADMIN: [
    // Workers
    'VIEW_WORKERS', 'CREATE_WORKER', 'EDIT_WORKER', 'DELETE_WORKER',
    // Attendance
    'VIEW_ATTENDANCE', 'REGISTER_ATTENDANCE', 'EDIT_ATTENDANCE',
    // Finance
    'VIEW_FINANCE', 'EDIT_FINANCE', 'CREATE_OVERRIDE',
    // Payroll
    'VIEW_PAYROLL', 'CREATE_PAYROLL',
    // Work Days
    'VIEW_WORK_DAYS', 'EDIT_WORK_DAYS',
    // Reports
    'VIEW_REPORTS', 'EXPORT_REPORTS'
  ],
  ACCOUNTANT: [
    // Finance
    'VIEW_FINANCE', 'VIEW_PAYROLL',
    // Approval
    'APPROVE_OVERRIDES', 'APPROVE_PAYROLL',
    // Reports
    'VIEW_REPORTS', 'EXPORT_REPORTS'
  ],
  SUPERVISOR: [
    // Workers (view only)
    'VIEW_WORKERS',
    // Attendance
    'VIEW_ATTENDANCE', 'REGISTER_ATTENDANCE',
    // Overrides
    'CREATE_OVERRIDE'
  ],
  GUARD: [
    // Attendance only
    'REGISTER_ATTENDANCE'
  ]
};

// Insert role_permissions
for (const [roleCode, permCodes] of Object.entries(rolePermissions)) {
  const roleId = roleMap[roleCode];
  if (!roleId) continue;
  
  for (const permCode of permCodes) {
    const permId = permMap[permCode];
    if (!permId) continue;
    
    await db.insert(schema.rolePermissions).values({
      roleId: roleId,
      permissionId: permId
    });
  }
}

console.log('✅ Mapped permissions to all roles\n');

// ============================================
// 3. Add Cost Centers
// ============================================
console.log('🏢 Step 3: Adding cost centers...');

const costCenters = [
  { code: 'CC001', name: 'مركز تكلفة المشاريع', description: 'مشاريع البناء والتشييد' },
  { code: 'CC002', name: 'مركز تكلفة الصيانة', description: 'الصيانة والتشغيل' },
  { code: 'CC003', name: 'مركز تكلفة الأمن', description: 'الأمن والحراسة' },
  { code: 'CC004', name: 'مركز تكلفة النظافة', description: 'خدمات النظافة' }
];

const insertedCostCenters = [];
for (const cc of costCenters) {
  const [result] = await db.insert(schema.costCenters).values(cc);
  insertedCostCenters.push({ ...cc, id: result.insertId });
}

console.log(`✅ Added ${costCenters.length} cost centers\n`);

// ============================================
// 4. Add Groups with Shifts
// ============================================
console.log('👥 Step 4: Adding groups with shifts...');

const groupsData = [
  { code: 'GRP-001', name: 'مجموعة المشاريع أ', name_en: 'Projects Group A', cost_center_id: insertedCostCenters[0].id, worker_count: 5 },
  { code: 'GRP-002', name: 'مجموعة الصيانة ب', name_en: 'Maintenance Group B', cost_center_id: insertedCostCenters[1].id, worker_count: 6 },
  { code: 'GRP-003', name: 'مجموعة الأمن ج', name_en: 'Security Group C', cost_center_id: insertedCostCenters[2].id, worker_count: 7 },
  { code: 'GRP-004', name: 'مجموعة النظافة د', name_en: 'Cleaning Group D', cost_center_id: insertedCostCenters[3].id, worker_count: 8 }
];

const insertedGroups = [];
for (const group of groupsData) {
  const [result] = await db.insert(schema.groups).values({
    code: group.code,
    name: group.name,
    costCenterId: group.cost_center_id,
    isActive: true
  });
  insertedGroups.push({ ...group, id: result.insertId });
  
  // Add shifts for each group
  await db.insert(schema.groupShifts).values([
    { groupId: result.insertId, shiftName: 'الوردية الصباحية', startTime: '07:00', endTime: '15:00' },
    { groupId: result.insertId, shiftName: 'الوردية المسائية', startTime: '15:00', endTime: '23:00' }
  ]);
}

console.log(`✅ Added ${groupsData.length} groups with shifts\n`);

// ============================================
// 5. Add Users for Each Role
// ============================================
console.log('👤 Step 5: Adding users for each role...');

const usersData = [
  { username: 'superadmin', fullName: 'محمد العلي', email: 'superadmin@tolan.sa', roleId: roleMap.SUPER_ADMIN },
  { username: 'admin', fullName: 'أحمد السعيد', email: 'admin@tolan.sa', roleId: roleMap.ADMIN },
  { username: 'hradmin', fullName: 'فاطمة الحسن', email: 'hr@tolan.sa', roleId: roleMap.HR_ADMIN },
  { username: 'accountant', fullName: 'خالد المحمد', email: 'finance@tolan.sa', roleId: roleMap.ACCOUNTANT },
  { username: 'supervisor1', fullName: 'عبدالله الأحمد', email: 'supervisor1@tolan.sa', roleId: roleMap.SUPERVISOR },
  { username: 'guard1', fullName: 'سالم العتيبي', email: 'guard1@tolan.sa', roleId: roleMap.GUARD }
];

for (const user of usersData) {
  await db.insert(schema.users).values({
    ...user,
    passwordHash: 'hashed_password_placeholder', // In real app, hash properly
    isActive: true
  });
}

console.log(`✅ Added ${usersData.length} users\n`);

// ============================================
// 6. Add 26 Workers Across 4 Groups
// ============================================
console.log('👷 Step 6: Adding 26 workers across 4 groups...');

const workerNames = [
  'عبدالله محمد', 'أحمد علي', 'محمد حسن', 'خالد سعيد', 'سالم عبدالله',
  'فهد أحمد', 'عمر خالد', 'يوسف محمد', 'سعد علي', 'ماجد حسن',
  'طارق سعيد', 'وليد عبدالله', 'نايف أحمد', 'بندر خالد', 'فيصل محمد',
  'تركي علي', 'مشعل حسن', 'راشد سعيد', 'سلطان عبدالله', 'عادل أحمد',
  'ناصر خالد', 'صالح محمد', 'حمد علي', 'سعود حسن', 'عبدالعزيز سعيد', 'منصور عبدالله'
];

let workerIndex = 0;
const insertedWorkers = [];

for (const group of insertedGroups) {
  for (let i = 0; i < group.worker_count; i++) {
    const workerCode = `W${String(workerIndex + 1).padStart(4, '0')}`;
    const [result] = await db.insert(schema.workers).values({
      code: workerCode,
      fullName: workerNames[workerIndex],
      groupId: group.id,
      nationalId: `1${String(Math.floor(Math.random() * 1000000000)).padStart(9, '0')}`,
      phone: `05${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
      hireDate: new Date('2024-01-01'),
      dailyRate: (150 + Math.floor(Math.random() * 100)).toString(),
      status: 'active',
      photoUrl: null,
      qrToken: workerCode,
      manualCode: workerCode
    });
    
    insertedWorkers.push({ id: result.insertId, code: workerCode, group_id: group.id });
    workerIndex++;
  }
}

console.log(`✅ Added ${insertedWorkers.length} workers\n`);

// ============================================
// 7. Add Attendance Records for 1 Week
// ============================================
console.log('📅 Step 7: Adding attendance records for 1 week...');

const today = new Date();
const oneWeekAgo = new Date(today);
oneWeekAgo.setDate(today.getDate() - 7);

let attendanceCount = 0;

for (let day = 0; day < 7; day++) {
  const date = new Date(oneWeekAgo);
  date.setDate(oneWeekAgo.getDate() + day);
  
  // Skip Fridays (weekend)
  if (date.getDay() === 5) continue;
  
  for (const worker of insertedWorkers) {
    // 90% attendance rate
    if (Math.random() > 0.9) continue;
    
    // Random check-in time (7:00 - 8:00)
    const checkInHour = 7;
    const checkInMinute = Math.floor(Math.random() * 60);
    const checkInTime = new Date(date);
    checkInTime.setHours(checkInHour, checkInMinute, 0);
    
    // Random check-out time (15:00 - 16:00)
    const checkOutHour = 15;
    const checkOutMinute = Math.floor(Math.random() * 60);
    const checkOutTime = new Date(date);
    checkOutTime.setHours(checkOutHour, checkOutMinute, 0);
    
    // Insert check-in event
    await db.insert(schema.attendanceEvents).values({
      workerId: worker.id,
      eventType: 'check_in',
      eventTime: checkInTime,
      method: 'manual',
      createdAt: checkInTime
    });
    
    // Insert check-out event
    await db.insert(schema.attendanceEvents).values({
      workerId: worker.id,
      eventType: 'check_out',
      eventTime: checkOutTime,
      method: 'manual',
      createdAt: checkOutTime
    });
    
    attendanceCount += 2; // check-in + check-out
  }
}

console.log(`✅ Added ${attendanceCount} attendance records\n`);

// ============================================
// Summary
// ============================================
console.log('═══════════════════════════════════════');
console.log('🎉 Demo Data Seeding Completed!');
console.log('═══════════════════════════════════════');
console.log(`✅ Roles: ${rolesData.length}`);
console.log(`✅ Cost Centers: ${costCenters.length}`);
console.log(`✅ Groups: ${groupsData.length}`);
console.log(`✅ Users: ${usersData.length}`);
console.log(`✅ Workers: ${insertedWorkers.length}`);
console.log(`✅ Attendance Records: ${attendanceCount}`);
console.log('═══════════════════════════════════════\n');

await connection.end();
