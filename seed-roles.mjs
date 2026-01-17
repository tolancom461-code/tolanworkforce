import { drizzle } from 'drizzle-orm/mysql2';
import { eq } from 'drizzle-orm';
import mysql from 'mysql2/promise';
import * as schema from './drizzle/schema.js';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

// Define default roles with their permission codes
const defaultRoles = [
  {
    code: 'SYSTEM_ADMIN',
    name: 'مدير النظام',
    level: 1,
    description: 'صلاحيات كاملة لجميع وظائف النظام',
    permissions: [
      // All permissions (40 permissions)
      'VIEW_USERS', 'CREATE_USER', 'EDIT_USER', 'DELETE_USER',
      'VIEW_ROLES', 'CREATE_ROLE', 'EDIT_ROLE', 'DELETE_ROLE',
      'VIEW_PERMISSIONS', 'ASSIGN_PERMISSIONS',
      'VIEW_COST_CENTERS', 'CREATE_COST_CENTER', 'EDIT_COST_CENTER', 'DELETE_COST_CENTER',
      'VIEW_GROUPS', 'CREATE_GROUP', 'EDIT_GROUP', 'DELETE_GROUP',
      'VIEW_WORKERS', 'CREATE_WORKER', 'EDIT_WORKER', 'DELETE_WORKER',
      'VIEW_ATTENDANCE', 'RECORD_ATTENDANCE', 'EDIT_ATTENDANCE', 'DELETE_ATTENDANCE',
      'VIEW_FINANCE', 'CREATE_FINANCE_ENTRY', 'EDIT_FINANCE_ENTRY', 'DELETE_FINANCE_ENTRY',
      'VIEW_OVERRIDES', 'CREATE_OVERRIDE', 'APPROVE_OVERRIDES', 'DELETE_OVERRIDE', 'OVERRIDE_DAILY_FINANCE',
      'VIEW_PAYROLL', 'CREATE_PAYROLL', 'APPROVE_PAYROLL', 'DELETE_PAYROLL',
      'VIEW_WORK_DAYS', 'EDIT_WORK_DAYS',
      'CREATE_OPERATIONAL_FLAGS', 'MANAGE_PENDING_FLAGS',
      'VIEW_REPORTS', 'EXPORT_REPORTS'
    ]
  },
  {
    code: 'HR_MANAGER',
    name: 'مدير الموارد البشرية',
    level: 2,
    description: 'إدارة العمال والحضور والاستثناءات',
    permissions: [
      'VIEW_USERS',
      'VIEW_GROUPS', 'CREATE_GROUP', 'EDIT_GROUP',
      'VIEW_WORKERS', 'CREATE_WORKER', 'EDIT_WORKER', 'DELETE_WORKER',
      'VIEW_ATTENDANCE', 'RECORD_ATTENDANCE', 'EDIT_ATTENDANCE',
      'VIEW_OVERRIDES', 'CREATE_OVERRIDE', 'APPROVE_OVERRIDES', 'OVERRIDE_DAILY_FINANCE',
      'VIEW_WORK_DAYS', 'EDIT_WORK_DAYS',
      'CREATE_OPERATIONAL_FLAGS', 'MANAGE_PENDING_FLAGS',
      'VIEW_REPORTS', 'EXPORT_REPORTS'
    ]
  },
  {
    code: 'ACCOUNTANT',
    name: 'المحاسب',
    level: 3,
    description: 'إدارة المالية والرواتب والتقارير المالية',
    permissions: [
      'VIEW_WORKERS',
      'VIEW_ATTENDANCE',
      'VIEW_FINANCE', 'CREATE_FINANCE_ENTRY', 'EDIT_FINANCE_ENTRY',
      'VIEW_OVERRIDES', 'APPROVE_OVERRIDES',
      'VIEW_PAYROLL', 'CREATE_PAYROLL', 'APPROVE_PAYROLL',
      'VIEW_REPORTS', 'EXPORT_REPORTS'
    ]
  },
  {
    code: 'ATTENDANCE_SUPERVISOR',
    name: 'مشرف الحضور',
    level: 4,
    description: 'تسجيل وتعديل الحضور فقط',
    permissions: [
      'VIEW_WORKERS',
      'VIEW_ATTENDANCE', 'RECORD_ATTENDANCE', 'EDIT_ATTENDANCE',
      'VIEW_WORK_DAYS',
      'VIEW_REPORTS'
    ]
  },
  {
    code: 'REGULAR_USER',
    name: 'مستخدم عادي',
    level: 5,
    description: 'عرض البيانات فقط بدون صلاحيات تعديل',
    permissions: [
      'VIEW_USERS',
      'VIEW_GROUPS',
      'VIEW_WORKERS',
      'VIEW_ATTENDANCE',
      'VIEW_FINANCE',
      'VIEW_REPORTS'
    ]
  }
];

async function seedRoles() {
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection, { schema, mode: 'default' });

  try {
    console.log('Starting to seed default roles...');

    // Get all permissions from database
    const allPermissions = await db.select().from(schema.permissions);
    const permissionMap = new Map(allPermissions.map(p => [p.code, p.id]));

    console.log(`Found ${allPermissions.length} permissions in database`);

    for (const roleData of defaultRoles) {
      // Check if role already exists
      const existingRole = await db
        .select()
        .from(schema.roles)
        .where(eq(schema.roles.name, roleData.name))
        .limit(1);

      let roleId;

      if (existingRole.length > 0) {
        console.log(`Role "${roleData.name}" already exists, updating...`);
        roleId = existingRole[0].id;

        // Update role
        await db
          .update(schema.roles)
          .set({
            level: roleData.level,
            description: roleData.description,
            updatedAt: new Date()
          })
          .where(eq(schema.roles.id, roleId));

        // Delete existing role permissions
        await db
          .delete(schema.rolePermissions)
          .where(eq(schema.rolePermissions.roleId, roleId));
      } else {
        console.log(`Creating role "${roleData.name}"...`);

        // Insert role
        const result = await db.insert(schema.roles).values({
          code: roleData.code,
          name: roleData.name,
          level: roleData.level,
          description: roleData.description,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        roleId = Number(result[0].insertId);
      }

      // Link permissions to role
      const rolePermissions = roleData.permissions
        .map(code => {
          const permissionId = permissionMap.get(code);
          if (!permissionId) {
            console.warn(`Warning: Permission "${code}" not found in database`);
            return null;
          }
          return {
            roleId,
            permissionId
          };
        })
        .filter(rp => rp !== null);

      if (rolePermissions.length > 0) {
        await db.insert(schema.rolePermissions).values(rolePermissions);
        console.log(`  ✓ Linked ${rolePermissions.length} permissions to "${roleData.name}"`);
      }
    }

    console.log('\n✅ Successfully seeded all default roles!');
    console.log(`Total roles: ${defaultRoles.length}`);

  } catch (error) {
    console.error('Error seeding roles:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

seedRoles().catch(console.error);
