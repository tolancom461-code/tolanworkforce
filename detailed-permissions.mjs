import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

// الصلاحيات التفصيلية الجديدة (47 صلاحية)
const DETAILED_PERMISSIONS = [
  // لوحات التحكم (2)
  { code: 'view_dashboard', name: 'عرض لوحة التحكم الرئيسية', category: 'dashboard' },
  { code: 'view_executive_dashboard', name: 'عرض لوحة التحكم التنفيذية', category: 'dashboard' },
  
  // الموارد البشرية (12)
  { code: 'view_workers', name: 'عرض قائمة العمال', category: 'hr' },
  { code: 'create_worker', name: 'إضافة عامل جديد', category: 'hr' },
  { code: 'edit_worker', name: 'تعديل بيانات عامل', category: 'hr' },
  { code: 'delete_worker', name: 'حذف عامل', category: 'hr' },
  { code: 'view_groups', name: 'عرض المجموعات', category: 'hr' },
  { code: 'create_group', name: 'إضافة مجموعة', category: 'hr' },
  { code: 'edit_group', name: 'تعديل مجموعة', category: 'hr' },
  { code: 'delete_group', name: 'حذف مجموعة', category: 'hr' },
  { code: 'view_cost_centers', name: 'عرض مراكز التكلفة', category: 'hr' },
  { code: 'create_cost_center', name: 'إضافة مركز تكلفة', category: 'hr' },
  { code: 'edit_cost_center', name: 'تعديل مركز تكلفة', category: 'hr' },
  { code: 'delete_cost_center', name: 'حذف مركز تكلفة', category: 'hr' },
  
  // نظام الحضور (10)
  { code: 'scan_attendance', name: 'تسجيل الحضور', category: 'attendance' },
  { code: 'view_attendance_log', name: 'عرض سجل الحضور', category: 'attendance' },
  { code: 'adjust_attendance', name: 'تعديل الحضور', category: 'attendance' },
  { code: 'delete_attendance', name: 'حذف سجل حضور', category: 'attendance' },
  { code: 'manage_daily_attendance', name: 'إدارة الحضور اليومي', category: 'attendance' },
  { code: 'view_attendance_reports', name: 'عرض تقارير الحضور', category: 'attendance' },
  { code: 'export_attendance_reports', name: 'تصدير تقارير الحضور', category: 'attendance' },
  { code: 'manage_work_days', name: 'إدارة أيام العمل', category: 'attendance' },
  { code: 'create_operational_flags', name: 'إنشاء بلاغات تشغيلية', category: 'attendance' },
  { code: 'manage_pending_flags', name: 'معالجة البلاغات المعلقة', category: 'attendance' },
  
  // النظام المالي (15)
  { code: 'view_finance_entries', name: 'عرض الخصومات والإضافات', category: 'finance' },
  { code: 'create_deduction', name: 'إضافة خصم', category: 'finance' },
  { code: 'create_bonus', name: 'إضافة إضافة مالية', category: 'finance' },
  { code: 'edit_finance_entry', name: 'تعديل خصم/إضافة', category: 'finance' },
  { code: 'delete_finance_entry', name: 'حذف خصم/إضافة', category: 'finance' },
  { code: 'approve_finance_entry', name: 'اعتماد خصم/إضافة', category: 'finance' },
  { code: 'override_daily_finance', name: 'تصحيح الرواتب اليومية', category: 'finance' },
  { code: 'view_payroll_batches', name: 'عرض مسودات الرواتب', category: 'finance' },
  { code: 'create_payroll_batch', name: 'إنشاء مسودة راتب', category: 'finance' },
  { code: 'edit_payroll_batch', name: 'تعديل مسودة راتب', category: 'finance' },
  { code: 'delete_payroll_batch', name: 'حذف مسودة راتب', category: 'finance' },
  { code: 'approve_payroll_batch', name: 'اعتماد مسودة راتب', category: 'finance' },
  { code: 'view_finance_reports', name: 'عرض التقارير المالية', category: 'finance' },
  { code: 'export_finance_reports', name: 'تصدير التقارير المالية', category: 'finance' },
  { code: 'view_payroll_history', name: 'عرض سجل الرواتب المعتمدة', category: 'finance' },
  
  // البلاغات التشغيلية (4) - مدمجة مع الحضور لكن منفصلة للوضوح
  { code: 'view_all_flags', name: 'عرض جميع البلاغات', category: 'operational_flags' },
  { code: 'delete_flag', name: 'حذف بلاغ', category: 'operational_flags' },
  
  // إدارة النظام (6)
  { code: 'view_users', name: 'عرض المستخدمين', category: 'system' },
  { code: 'create_user', name: 'إضافة مستخدم', category: 'system' },
  { code: 'edit_user', name: 'تعديل مستخدم', category: 'system' },
  { code: 'delete_user', name: 'حذف مستخدم', category: 'system' },
  { code: 'manage_roles', name: 'إدارة الأدوار', category: 'system' },
  { code: 'manage_permissions', name: 'إدارة الصلاحيات', category: 'system' },
];

async function createDetailedPermissions() {
  const connection = await mysql.createConnection(DATABASE_URL);

  console.log('Starting to create detailed permissions...\n');

  try {
    // 1. حذف جميع الصلاحيات القديمة
    await connection.execute('DELETE FROM permissions');
    console.log('✓ Deleted all old permissions\n');

    // 2. إضافة الصلاحيات التفصيلية الجديدة
    let addedCount = 0;
    for (const perm of DETAILED_PERMISSIONS) {
      await connection.execute(
        'INSERT INTO permissions (code, name, category, description) VALUES (?, ?, ?, ?)',
        [perm.code, perm.name, perm.category, perm.name]
      );
      addedCount++;
      console.log(`✓ Added: ${perm.code.padEnd(35)} - ${perm.name}`);
    }

    console.log(`\n✅ Detailed permissions created successfully!`);
    console.log(`Total permissions: ${addedCount}`);

    // 3. عرض ملخص حسب الفئة
    const [summary] = await connection.execute(`
      SELECT category, COUNT(*) as count 
      FROM permissions 
      GROUP BY category 
      ORDER BY category
    `);
    
    console.log(`\n=== Summary by category ===`);
    summary.forEach(s => {
      console.log(`  ${s.category.padEnd(25)} : ${s.count} permissions`);
    });

  } catch (error) {
    console.error('Error creating detailed permissions:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

createDetailedPermissions().catch(console.error);
