import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

// تعريف الصلاحيات لكل دور
const ROLE_PERMISSIONS = {
  'SUPER_ADMIN': [
    // جميع الصلاحيات
    'view_dashboard', 'view_executive_dashboard',
    'view_workers', 'manage_workers',
    'view_groups', 'manage_groups',
    'view_cost_centers', 'manage_cost_centers',
    'scan_attendance', 'view_attendance_log', 'adjust_attendance', 'manage_daily_attendance',
    'view_attendance_reports', 'manage_work_days',
    'create_operational_flags', 'manage_pending_flags',
    'manage_finance_entries', 'manage_finance_overrides',
    'view_payroll_batches', 'manage_payroll_batches', 'view_finance_reports',
    'manage_users', 'manage_roles', 'manage_permissions',
  ],
  'ADMIN': [
    // معظم الصلاحيات ما عدا إدارة النظام
    'view_dashboard', 'view_executive_dashboard',
    'view_workers', 'manage_workers',
    'view_groups', 'manage_groups',
    'view_cost_centers', 'manage_cost_centers',
    'scan_attendance', 'view_attendance_log', 'adjust_attendance', 'manage_daily_attendance',
    'view_attendance_reports', 'manage_work_days',
    'create_operational_flags', 'manage_pending_flags',
    'manage_finance_entries', 'manage_finance_overrides',
    'view_payroll_batches', 'manage_payroll_batches', 'view_finance_reports',
  ],
  'HR_ADMIN': [
    // الموارد البشرية والحضور
    'view_dashboard',
    'view_workers', 'manage_workers',
    'view_groups', 'manage_groups',
    'view_cost_centers', 'manage_cost_centers',
    'scan_attendance', 'view_attendance_log', 'adjust_attendance', 'manage_daily_attendance',
    'view_attendance_reports', 'manage_work_days',
    'create_operational_flags', 'manage_pending_flags',
    'view_finance_reports',
  ],
  'ACCOUNTANT': [
    // المالية والرواتب
    'view_dashboard',
    'view_workers',
    'view_attendance_log', 'view_attendance_reports',
    'manage_finance_entries', 'manage_finance_overrides',
    'view_payroll_batches', 'manage_payroll_batches', 'view_finance_reports',
    'manage_pending_flags',
  ],
  'SUPERVISOR': [
    // المشرف التشغيلي
    'view_dashboard',
    'view_workers',
    'scan_attendance', 'view_attendance_log',
    'create_operational_flags',
  ],
  'GUARD': [
    // الحارس - تسجيل الحضور فقط
    'scan_attendance',
  ],
};

async function reassignPermissions() {
  const connection = await mysql.createConnection(DATABASE_URL);

  console.log('Starting to reassign role permissions...\n');

  try {
    // 1. حذف جميع الربطات القديمة
    await connection.execute('DELETE FROM role_permissions');
    console.log('✓ Deleted all old role-permission assignments\n');

    // 2. إعادة ربط الصلاحيات بالأدوار
    for (const [roleCode, permissions] of Object.entries(ROLE_PERMISSIONS)) {
      console.log(`\nProcessing role: ${roleCode}`);
      
      // Get role ID
      const [roles] = await connection.execute('SELECT id FROM roles WHERE code = ?', [roleCode]);
      if (roles.length === 0) {
        console.log(`  ⚠️  Role ${roleCode} not found, skipping...`);
        continue;
      }
      const roleId = roles[0].id;
      
      let assignedCount = 0;
      for (const permCode of permissions) {
        // Get permission ID
        const [perms] = await connection.execute('SELECT id FROM permissions WHERE code = ?', [permCode]);
        if (perms.length === 0) {
          console.log(`  ⚠️  Permission ${permCode} not found`);
          continue;
        }
        const permId = perms[0].id;
        
        // Assign permission to role
        await connection.execute(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
          [roleId, permId]
        );
        assignedCount++;
      }
      
      console.log(`  ✓ Assigned ${assignedCount} permissions to ${roleCode}`);
    }

    console.log(`\n✅ Role permissions reassignment completed!`);

    // 3. Show summary
    const [summary] = await connection.execute(`
      SELECT r.code, r.name, COUNT(rp.permission_id) as perm_count
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      GROUP BY r.id, r.code, r.name
      ORDER BY perm_count DESC
    `);
    
    console.log(`\n=== Summary ===`);
    summary.forEach(s => {
      console.log(`  ${s.code.padEnd(20)} (${s.name.padEnd(25)}): ${s.perm_count} permissions`);
    });

  } catch (error) {
    console.error('Error reassigning permissions:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

reassignPermissions().catch(console.error);
