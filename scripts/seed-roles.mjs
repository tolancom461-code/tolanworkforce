import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema.js';
import { eq } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

// Define all permissions with their codes
const ALL_PERMISSIONS = [
  'dashboard_view',
  'attendance_record',
  'attendance_view',
  'attendance_manage',
  'attendance_export',
  'worker_view',
  'worker_create',
  'worker_edit',
  'worker_delete',
  'worker_export',
  'group_view',
  'group_manage',
  'payroll_view',
  'payroll_create',
  'payroll_edit',
  'payroll_delete',
  'payroll_batch_accountant_review',
  'payroll_batch_financial_review',
  'payroll_batch_manager_review',
  'payroll_batch_final_approve',
  'payroll_export',
  'financial_reports_view',
  'financial_reports_export',
  'reports_view',
  'reports_export',
  'user_view',
  'user_create',
  'user_edit',
  'user_delete',
  'user_permissions_manage',
  'operational_flags_view',
  'operational_flags_manage',
  'cost_center_view',
  'cost_center_manage',
  'role_view',
  'role_manage',
  'system_settings_view',
  'system_settings_manage',
];

// Define roles with their permissions
const ROLES_CONFIG = [
  {
    code: 'super_admin',
    name: 'مسؤول أعلى (Super Admin)',
    description: 'صلاحيات كاملة على جميع أجزاء النظام',
    level: 100,
    permissions: ALL_PERMISSIONS, // All permissions
  },
  {
    code: 'hr_manager',
    name: 'مدير موارد بشرية (HR Manager)',
    description: 'إدارة العمال والمجموعات والحضور والتقارير',
    level: 80,
    permissions: [
      'dashboard_view',
      'worker_view',
      'worker_create',
      'worker_edit',
      'worker_delete',
      'worker_export',
      'group_view',
      'group_manage',
      'attendance_record',
      'attendance_view',
      'attendance_manage',
      'attendance_export',
      'reports_view',
      'reports_export',
      'cost_center_view',
      'user_view',
    ],
  },
  {
    code: 'accountant',
    name: 'محاسب (Accountant)',
    description: 'مراجعة الرواتب والتقارير المالية',
    level: 70,
    permissions: [
      'dashboard_view',
      'worker_view',
      'payroll_view',
      'payroll_batch_accountant_review',
      'payroll_export',
      'financial_reports_view',
      'financial_reports_export',
      'reports_view',
      'reports_export',
      'attendance_view',
    ],
  },
  {
    code: 'financial_manager',
    name: 'مدير مالي (Financial Manager)',
    description: 'المراجعة المالية والاعتماد النهائي للرواتب',
    level: 85,
    permissions: [
      'dashboard_view',
      'worker_view',
      'payroll_view',
      'payroll_batch_accountant_review',
      'payroll_batch_financial_review',
      'payroll_batch_final_approve',
      'payroll_export',
      'financial_reports_view',
      'financial_reports_export',
      'reports_view',
      'reports_export',
      'attendance_view',
      'cost_center_view',
    ],
  },
  {
    code: 'attendance_officer',
    name: 'موظف حضور (Attendance Officer)',
    description: 'تسجيل الحضور والانصراف فقط',
    level: 30,
    permissions: [
      'dashboard_view',
      'worker_view',
      'attendance_record',
      'attendance_view',
    ],
  },
  {
    code: 'viewer',
    name: 'مشاهد (Viewer)',
    description: 'عرض البيانات فقط بدون صلاحيات تعديل',
    level: 10,
    permissions: [
      'dashboard_view',
      'worker_view',
      'attendance_view',
      'payroll_view',
      'reports_view',
      'financial_reports_view',
    ],
  },
];

async function seedRolesAndPermissions() {
  console.log('🌱 Starting roles and permissions seeding...\n');

  try {
    // Step 1: Ensure all permissions exist in the database
    console.log('📝 Step 1: Ensuring all permissions exist...');
    const permissionMap = new Map();
    
    for (const permCode of ALL_PERMISSIONS) {
      // Check if permission exists
      const existing = await db.query.permissions.findFirst({
        where: eq(schema.permissions.code, permCode),
      });
      
      if (existing) {
        permissionMap.set(permCode, existing.id);
        console.log(`  ✓ Permission "${permCode}" already exists (ID: ${existing.id})`);
      } else {
        // Create permission
        const [result] = await db.insert(schema.permissions).values({
          code: permCode,
          name: permCode.replace(/_/g, ' ').toUpperCase(),
          description: `Permission for ${permCode}`,
          category: permCode.split('_')[0],
        });
        permissionMap.set(permCode, result.insertId);
        console.log(`  ✅ Created permission "${permCode}" (ID: ${result.insertId})`);
      }
    }
    
    console.log(`\n✅ Total permissions: ${permissionMap.size}\n`);

    // Step 2: Create or update roles
    console.log('👥 Step 2: Creating/updating roles...');
    
    for (const roleConfig of ROLES_CONFIG) {
      // Check if role exists
      const existingRole = await db.query.roles.findFirst({
        where: eq(schema.roles.code, roleConfig.code),
      });
      
      let roleId;
      
      if (existingRole) {
        // Update existing role
        await db.update(schema.roles)
          .set({
            name: roleConfig.name,
            description: roleConfig.description,
            level: roleConfig.level,
            isActive: true,
          })
          .where(eq(schema.roles.id, existingRole.id));
        
        roleId = existingRole.id;
        console.log(`  ✓ Updated role "${roleConfig.name}" (ID: ${roleId})`);
      } else {
        // Create new role
        const [result] = await db.insert(schema.roles).values({
          code: roleConfig.code,
          name: roleConfig.name,
          description: roleConfig.description,
          level: roleConfig.level,
          isActive: true,
        });
        
        roleId = result.insertId;
        console.log(`  ✅ Created role "${roleConfig.name}" (ID: ${roleId})`);
      }
      
      // Step 3: Assign permissions to role
      console.log(`  📋 Assigning ${roleConfig.permissions.length} permissions to "${roleConfig.name}"...`);
      
      // Delete existing role permissions
      await db.delete(schema.rolePermissions)
        .where(eq(schema.rolePermissions.roleId, roleId));
      
      // Insert new role permissions
      const rolePermissionsData = roleConfig.permissions.map(permCode => ({
        roleId: roleId,
        permissionId: permissionMap.get(permCode),
      }));
      
      if (rolePermissionsData.length > 0) {
        await db.insert(schema.rolePermissions).values(rolePermissionsData);
        console.log(`  ✅ Assigned ${rolePermissionsData.length} permissions\n`);
      }
    }
    
    console.log('\n🎉 Seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - Total permissions: ${permissionMap.size}`);
    console.log(`  - Total roles created/updated: ${ROLES_CONFIG.length}`);
    console.log('\n✅ All roles and permissions are ready to use!');
    
  } catch (error) {
    console.error('\n❌ Error during seeding:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run the seeding
seedRolesAndPermissions();
