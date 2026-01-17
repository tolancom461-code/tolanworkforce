import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

// الصلاحيات الصحيحة المستخدمة في النظام (من menuPermissions.ts)
const CORRECT_PERMISSIONS = [
  // لوحات التحكم
  { code: 'view_dashboard', name: 'عرض لوحة التحكم الرئيسية', category: 'dashboard' },
  { code: 'view_executive_dashboard', name: 'عرض لوحة التحكم التنفيذية', category: 'dashboard' },
  
  // الموارد البشرية
  { code: 'view_workers', name: 'عرض العمال', category: 'hr' },
  { code: 'manage_workers', name: 'إدارة العمال', category: 'hr' },
  { code: 'view_groups', name: 'عرض المجموعات', category: 'hr' },
  { code: 'manage_groups', name: 'إدارة المجموعات', category: 'hr' },
  { code: 'view_cost_centers', name: 'عرض مراكز التكلفة', category: 'hr' },
  { code: 'manage_cost_centers', name: 'إدارة مراكز التكلفة', category: 'hr' },
  
  // نظام الحضور
  { code: 'scan_attendance', name: 'تسجيل الحضور', category: 'attendance' },
  { code: 'view_attendance_log', name: 'عرض سجل الحضور', category: 'attendance' },
  { code: 'adjust_attendance', name: 'تعديل الحضور', category: 'attendance' },
  { code: 'manage_daily_attendance', name: 'إدارة الحضور اليومي', category: 'attendance' },
  { code: 'view_attendance_reports', name: 'عرض تقارير الحضور', category: 'attendance' },
  { code: 'manage_work_days', name: 'إدارة أيام العمل', category: 'attendance' },
  { code: 'create_operational_flags', name: 'إنشاء بلاغات تشغيلية', category: 'attendance' },
  { code: 'manage_pending_flags', name: 'معالجة البلاغات المعلقة', category: 'attendance' },
  
  // النظام المالي
  { code: 'manage_finance_entries', name: 'إدارة الخصومات والإضافات', category: 'finance' },
  { code: 'manage_finance_overrides', name: 'إدارة الاستثناءات المالية', category: 'finance' },
  { code: 'view_payroll_batches', name: 'عرض دفعات الرواتب', category: 'finance' },
  { code: 'manage_payroll_batches', name: 'إدارة دفعات الرواتب', category: 'finance' },
  { code: 'view_finance_reports', name: 'عرض التقارير المالية', category: 'finance' },
  
  // إدارة النظام
  { code: 'manage_users', name: 'إدارة المستخدمين', category: 'system' },
  { code: 'manage_roles', name: 'إدارة الأدوار', category: 'system' },
  { code: 'manage_permissions', name: 'إدارة الصلاحيات', category: 'system' },
];

async function cleanPermissions() {
  const connection = await mysql.createConnection(DATABASE_URL);

  console.log('Starting to clean permissions...\n');

  try {
    // 1. Get all current permissions
    const [currentPerms] = await connection.execute('SELECT id, code FROM permissions');
    console.log(`Current permissions in database: ${currentPerms.length}`);

    // 2. Delete all old permissions
    await connection.execute('DELETE FROM permissions');
    console.log('✓ Deleted all old permissions');

    // 3. Insert correct permissions
    let addedCount = 0;
    for (const perm of CORRECT_PERMISSIONS) {
      await connection.execute(
        'INSERT INTO permissions (code, name, category, description) VALUES (?, ?, ?, ?)',
        [perm.code, perm.name, perm.category, perm.name]
      );
      addedCount++;
      console.log(`✓ Added: ${perm.code.padEnd(35)} - ${perm.name}`);
    }

    console.log(`\n✅ Permissions cleanup completed!`);
    console.log(`Total permissions: ${addedCount}`);

    // 4. Show summary by category
    const [summary] = await connection.execute(`
      SELECT category, COUNT(*) as count 
      FROM permissions 
      GROUP BY category 
      ORDER BY category
    `);
    
    console.log(`\n=== Summary by category ===`);
    summary.forEach(s => {
      console.log(`  ${s.category.padEnd(20)} : ${s.count} permissions`);
    });

  } catch (error) {
    console.error('Error cleaning permissions:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

cleanPermissions().catch(console.error);
