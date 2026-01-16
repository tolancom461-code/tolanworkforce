// سكريبت لإضافة بيانات تجريبية للصلاحيات
import { drizzle } from 'drizzle-orm/mysql2';
import { permissions, rolePermissions } from '../drizzle/schema.js';

const db = drizzle(process.env.DATABASE_URL);

const permissionsData = [
  // لوحات التحكم
  { code: 'view_dashboard', name: 'عرض لوحة التحكم الرئيسية', category: 'dashboard' },
  { code: 'view_executive_dashboard', name: 'عرض لوحة التحكم التنفيذية', category: 'dashboard' },
  
  // إدارة الموارد البشرية
  { code: 'view_workers', name: 'عرض العمال', category: 'hr' },
  { code: 'manage_workers', name: 'إدارة العمال', category: 'hr' },
  { code: 'view_groups', name: 'عرض المجموعات', category: 'hr' },
  { code: 'manage_groups', name: 'إدارة المجموعات', category: 'hr' },
  { code: 'view_cost_centers', name: 'عرض مراكز التكلفة', category: 'hr' },
  { code: 'manage_cost_centers', name: 'إدارة مراكز التكلفة', category: 'hr' },
  
  // نظام الحضور والانصراف
  { code: 'scan_attendance', name: 'تسجيل الحضور', category: 'attendance' },
  { code: 'view_attendance_log', name: 'عرض سجل الحضور', category: 'attendance' },
  { code: 'adjust_attendance', name: 'تعديل الحضور', category: 'attendance' },
  { code: 'view_attendance_reports', name: 'عرض تقارير الحضور', category: 'attendance' },
  { code: 'manage_work_days', name: 'إدارة أيام العمل', category: 'attendance' },
  
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

async function seedPermissions() {
  console.log('🌱 بدء إضافة بيانات الصلاحيات...');
  
  try {
    // إضافة الصلاحيات
    for (const perm of permissionsData) {
      await db.insert(permissions).values(perm).onDuplicateKeyUpdate({
        set: { name: perm.name, category: perm.category }
      });
      console.log(`✅ تم إضافة صلاحية: ${perm.name}`);
    }
    
    console.log('✅ تم إضافة جميع الصلاحيات بنجاح');
    process.exit(0);
  } catch (error) {
    console.error('❌ خطأ في إضافة الصلاحيات:', error);
    process.exit(1);
  }
}

seedPermissions();
