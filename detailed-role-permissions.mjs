import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

// توزيع الصلاحيات التفصيلية على الأدوار
const ROLE_PERMISSIONS = {
  'SUPER_ADMIN': [
    // جميع الصلاحيات (47)
    'view_dashboard', 'view_executive_dashboard',
    'view_workers', 'create_worker', 'edit_worker', 'delete_worker',
    'view_groups', 'create_group', 'edit_group', 'delete_group',
    'view_cost_centers', 'create_cost_center', 'edit_cost_center', 'delete_cost_center',
    'scan_attendance', 'view_attendance_log', 'adjust_attendance', 'delete_attendance',
    'manage_daily_attendance', 'view_attendance_reports', 'export_attendance_reports',
    'manage_work_days', 'create_operational_flags', 'manage_pending_flags',
    'view_all_flags', 'delete_flag',
    'view_finance_entries', 'create_deduction', 'create_bonus',
    'edit_finance_entry', 'delete_finance_entry', 'approve_finance_entry',
    'override_daily_finance', 'view_payroll_batches', 'create_payroll_batch',
    'edit_payroll_batch', 'delete_payroll_batch', 'approve_payroll_batch',
    'view_finance_reports', 'export_finance_reports', 'view_payroll_history',
    'view_users', 'create_user', 'edit_user', 'delete_user',
    'manage_roles', 'manage_permissions',
  ],
  
  'ADMIN': [
    // كل شيء ما عدا إدارة الصلاحيات (44)
    'view_dashboard', 'view_executive_dashboard',
    'view_workers', 'create_worker', 'edit_worker', 'delete_worker',
    'view_groups', 'create_group', 'edit_group', 'delete_group',
    'view_cost_centers', 'create_cost_center', 'edit_cost_center', 'delete_cost_center',
    'scan_attendance', 'view_attendance_log', 'adjust_attendance', 'delete_attendance',
    'manage_daily_attendance', 'view_attendance_reports', 'export_attendance_reports',
    'manage_work_days', 'create_operational_flags', 'manage_pending_flags',
    'view_all_flags', 'delete_flag',
    'view_finance_entries', 'create_deduction', 'create_bonus',
    'edit_finance_entry', 'delete_finance_entry', 'approve_finance_entry',
    'override_daily_finance', 'view_payroll_batches', 'create_payroll_batch',
    'edit_payroll_batch', 'delete_payroll_batch', 'approve_payroll_batch',
    'view_finance_reports', 'export_finance_reports', 'view_payroll_history',
    'view_users', 'create_user', 'edit_user', 'delete_user',
    'manage_roles',
  ],
  
  'HR_ADMIN': [
    // الموارد البشرية + الحضور + البلاغات (28)
    'view_dashboard',
    'view_workers', 'create_worker', 'edit_worker', 'delete_worker',
    'view_groups', 'create_group', 'edit_group', 'delete_group',
    'view_cost_centers', 'create_cost_center', 'edit_cost_center', 'delete_cost_center',
    'scan_attendance', 'view_attendance_log', 'adjust_attendance',
    'manage_daily_attendance', 'view_attendance_reports', 'export_attendance_reports',
    'manage_work_days', 'create_operational_flags', 'manage_pending_flags',
    'view_all_flags',
    'view_finance_entries', 'view_payroll_batches',
    'view_finance_reports', 'view_payroll_history',
  ],
  
  'ACCOUNTANT': [
    // المالية والرواتب فقط (18)
    'view_dashboard',
    'view_workers', 'view_groups',
    'view_attendance_log', 'view_attendance_reports',
    'view_finance_entries', 'create_deduction', 'create_bonus',
    'edit_finance_entry', 'approve_finance_entry',
    'view_payroll_batches', 'create_payroll_batch',
    'edit_payroll_batch', 'approve_payroll_batch',
    'view_finance_reports', 'export_finance_reports', 'view_payroll_history',
  ],
  
  'SUPERVISOR': [
    // المشرف التشغيلي (7)
    'view_dashboard',
    'view_workers', 'view_groups',
    'view_attendance_log', 'create_operational_flags',
    'view_attendance_reports', 'manage_work_days',
  ],
  
  'GUARD': [
    // الحارس (1)
    'scan_attendance',
  ],
};

async function assignDetailedRolePermissions() {
  const connection = await mysql.createConnection(DATABASE_URL);

  console.log('Starting to assign detailed role permissions...\n');

  try {
    // 1. حذف جميع الربطات القديمة
    await connection.execute('DELETE FROM role_permissions');
    console.log('✓ Deleted all old role-permission mappings\n');

    // 2. الحصول على IDs للأدوار والصلاحيات
    const [roles] = await connection.execute('SELECT id, code FROM roles');
    const [permissions] = await connection.execute('SELECT id, code FROM permissions');

    const roleMap = Object.fromEntries(roles.map(r => [r.code, r.id]));
    const permissionMap = Object.fromEntries(permissions.map(p => [p.code, p.id]));

    // 3. ربط الصلاحيات بالأدوار
    let totalMappings = 0;
    for (const [roleCode, permCodes] of Object.entries(ROLE_PERMISSIONS)) {
      const roleId = roleMap[roleCode];
      if (!roleId) {
        console.warn(`⚠️  Role not found: ${roleCode}`);
        continue;
      }

      console.log(`\n=== ${roleCode} (${permCodes.length} permissions) ===`);
      
      for (const permCode of permCodes) {
        const permId = permissionMap[permCode];
        if (!permId) {
          console.warn(`  ⚠️  Permission not found: ${permCode}`);
          continue;
        }

        await connection.execute(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
          [roleId, permId]
        );
        totalMappings++;
      }
      
      console.log(`✓ Assigned ${permCodes.length} permissions to ${roleCode}`);
    }

    console.log(`\n✅ Detailed role permissions assigned successfully!`);
    console.log(`Total mappings: ${totalMappings}`);

    // 4. عرض ملخص
    const [summary] = await connection.execute(`
      SELECT r.code, r.name, COUNT(rp.permission_id) as permission_count
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      GROUP BY r.id, r.code, r.name
      ORDER BY permission_count DESC
    `);
    
    console.log(`\n=== Summary ===`);
    summary.forEach(s => {
      console.log(`  ${s.code.padEnd(20)} : ${String(s.permission_count).padStart(2)} permissions`);
    });

  } catch (error) {
    console.error('Error assigning detailed role permissions:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

assignDetailedRolePermissions().catch(console.error);
