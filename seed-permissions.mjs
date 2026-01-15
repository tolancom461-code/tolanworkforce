import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const SYSTEM_PERMISSIONS = [
  // User Management
  { code: 'VIEW_USERS', name: 'عرض المستخدمين', category: 'إدارة المستخدمين', description: 'القدرة على عرض قائمة المستخدمين' },
  { code: 'CREATE_USER', name: 'إضافة مستخدم', category: 'إدارة المستخدمين', description: 'القدرة على إضافة مستخدمين جدد' },
  { code: 'EDIT_USER', name: 'تعديل مستخدم', category: 'إدارة المستخدمين', description: 'القدرة على تعديل بيانات المستخدمين' },
  { code: 'DELETE_USER', name: 'حذف مستخدم', category: 'إدارة المستخدمين', description: 'القدرة على حذف المستخدمين' },
  
  // Role Management
  { code: 'VIEW_ROLES', name: 'عرض الأدوار', category: 'إدارة الأدوار', description: 'القدرة على عرض قائمة الأدوار' },
  { code: 'CREATE_ROLE', name: 'إضافة دور', category: 'إدارة الأدوار', description: 'القدرة على إضافة أدوار جديدة' },
  { code: 'EDIT_ROLE', name: 'تعديل دور', category: 'إدارة الأدوار', description: 'القدرة على تعديل الأدوار' },
  { code: 'DELETE_ROLE', name: 'حذف دور', category: 'إدارة الأدوار', description: 'القدرة على حذف الأدوار' },
  
  // Permission Management
  { code: 'VIEW_PERMISSIONS', name: 'عرض الصلاحيات', category: 'إدارة الصلاحيات', description: 'القدرة على عرض قائمة الصلاحيات' },
  { code: 'ASSIGN_PERMISSIONS', name: 'تعيين الصلاحيات', category: 'إدارة الصلاحيات', description: 'القدرة على تعيين الصلاحيات للمستخدمين والأدوار' },
  
  // Cost Center Management
  { code: 'VIEW_COST_CENTERS', name: 'عرض مراكز التكلفة', category: 'مراكز التكلفة', description: 'القدرة على عرض مراكز التكلفة' },
  { code: 'CREATE_COST_CENTER', name: 'إضافة مركز تكلفة', category: 'مراكز التكلفة', description: 'القدرة على إضافة مراكز تكلفة جديدة' },
  { code: 'EDIT_COST_CENTER', name: 'تعديل مركز تكلفة', category: 'مراكز التكلفة', description: 'القدرة على تعديل مراكز التكلفة' },
  { code: 'DELETE_COST_CENTER', name: 'حذف مركز تكلفة', category: 'مراكز التكلفة', description: 'القدرة على حذف مراكز التكلفة' },
  
  // Group Management
  { code: 'VIEW_GROUPS', name: 'عرض المجموعات', category: 'إدارة المجموعات', description: 'القدرة على عرض المجموعات' },
  { code: 'CREATE_GROUP', name: 'إضافة مجموعة', category: 'إدارة المجموعات', description: 'القدرة على إضافة مجموعات جديدة' },
  { code: 'EDIT_GROUP', name: 'تعديل مجموعة', category: 'إدارة المجموعات', description: 'القدرة على تعديل المجموعات' },
  { code: 'DELETE_GROUP', name: 'حذف مجموعة', category: 'إدارة المجموعات', description: 'القدرة على حذف المجموعات' },
  
  // Worker Management
  { code: 'VIEW_WORKERS', name: 'عرض العمال', category: 'إدارة العمال', description: 'القدرة على عرض العمال' },
  { code: 'CREATE_WORKER', name: 'إضافة عامل', category: 'إدارة العمال', description: 'القدرة على إضافة عمال جدد' },
  { code: 'EDIT_WORKER', name: 'تعديل عامل', category: 'إدارة العمال', description: 'القدرة على تعديل بيانات العمال' },
  { code: 'DELETE_WORKER', name: 'حذف عامل', category: 'إدارة العمال', description: 'القدرة على حذف العمال' },
  
  // Attendance Management
  { code: 'VIEW_ATTENDANCE', name: 'عرض الحضور', category: 'إدارة الحضور', description: 'القدرة على عرض سجلات الحضور' },
  { code: 'RECORD_ATTENDANCE', name: 'تسجيل الحضور', category: 'إدارة الحضور', description: 'القدرة على تسجيل الحضور والانصراف' },
  { code: 'EDIT_ATTENDANCE', name: 'تعديل الحضور', category: 'إدارة الحضور', description: 'القدرة على تعديل سجلات الحضور' },
  { code: 'DELETE_ATTENDANCE', name: 'حذف سجل حضور', category: 'إدارة الحضور', description: 'القدرة على حذف سجلات الحضور' },
  { code: 'VIEW_ATTENDANCE_REPORTS', name: 'عرض تقارير الحضور', category: 'إدارة الحضور', description: 'القدرة على عرض تقارير الحضور' },
  
  // Finance Management
  { code: 'VIEW_FINANCE', name: 'عرض المالية', category: 'الإدارة المالية', description: 'القدرة على عرض البيانات المالية' },
  { code: 'EDIT_FINANCE', name: 'تعديل المالية', category: 'الإدارة المالية', description: 'القدرة على تعديل البيانات المالية' },
  { code: 'CREATE_OVERRIDE', name: 'إنشاء استثناء', category: 'الإدارة المالية', description: 'القدرة على إنشاء استثناءات مالية' },
  { code: 'APPROVE_OVERRIDES', name: 'اعتماد الاستثناءات', category: 'الإدارة المالية', description: 'القدرة على اعتماد أو رفض الاستثناءات المالية' },
  { code: 'VIEW_PAYROLL', name: 'عرض الرواتب', category: 'الإدارة المالية', description: 'القدرة على عرض دفعات الرواتب' },
  { code: 'CREATE_PAYROLL', name: 'إنشاء دفعة رواتب', category: 'الإدارة المالية', description: 'القدرة على إنشاء دفعات رواتب جديدة' },
  { code: 'APPROVE_PAYROLL', name: 'اعتماد الرواتب', category: 'الإدارة المالية', description: 'القدرة على اعتماد دفعات الرواتب' },
  
  // Work Days Management
  { code: 'VIEW_WORK_DAYS', name: 'عرض أيام العمل', category: 'إدارة أيام العمل', description: 'القدرة على عرض أيام العمل والعطلات' },
  { code: 'EDIT_WORK_DAYS', name: 'تعديل أيام العمل', category: 'إدارة أيام العمل', description: 'القدرة على تعديل أيام العمل والعطلات' },
  
  // Reports
  { code: 'VIEW_REPORTS', name: 'عرض التقارير', category: 'التقارير', description: 'القدرة على عرض التقارير' },
  { code: 'EXPORT_REPORTS', name: 'تصدير التقارير', category: 'التقارير', description: 'القدرة على تصدير التقارير' },
  
  // System Settings
  { code: 'VIEW_SETTINGS', name: 'عرض الإعدادات', category: 'إعدادات النظام', description: 'القدرة على عرض إعدادات النظام' },
  { code: 'EDIT_SETTINGS', name: 'تعديل الإعدادات', category: 'إعدادات النظام', description: 'القدرة على تعديل إعدادات النظام' },
];

async function seedPermissions() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  console.log('Starting to seed permissions...');

  try {
    for (const perm of SYSTEM_PERMISSIONS) {
      // Check if permission already exists
      const [existing] = await connection.execute(
        'SELECT id FROM permissions WHERE code = ?',
        [perm.code]
      );

      if (existing.length === 0) {
        await connection.execute(
          'INSERT INTO permissions (code, name, category, description) VALUES (?, ?, ?, ?)',
          [perm.code, perm.name, perm.category, perm.description]
        );
        console.log(`✓ Added permission: ${perm.code} - ${perm.name}`);
      } else {
        console.log(`- Permission already exists: ${perm.code}`);
      }
    }

    console.log('\n✅ Permissions seeding completed!');
    console.log(`Total permissions: ${SYSTEM_PERMISSIONS.length}`);

    // Show summary
    const [count] = await connection.execute('SELECT COUNT(*) as total FROM permissions');
    console.log(`Permissions in database: ${count[0].total}`);

  } catch (error) {
    console.error('Error seeding permissions:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

seedPermissions().catch(console.error);
