import { db } from './server/db.ts';
import { 
  users, 
  groups, 
  workers, 
  attendance, 
  payrollBatches,
  groupSchedules,
  payrollOverrides,
  financialTransactions
} from './drizzle/schema.ts';

async function cleanupDatabase() {
  try {
    console.log('🧹 جاري تنظيف قاعدة البيانات...');
    
    // حذف البيانات الاختبارية (الاحتفاظ بالمستخدم الأساسي فقط)
    console.log('📋 حذف البيانات الاختبارية...');
    
    // حذف المعاملات المالية
    await db.delete(financialTransactions).execute();
    console.log('✅ تم حذف المعاملات المالية');
    
    // حذف التجاوزات المالية
    await db.delete(payrollOverrides).execute();
    console.log('✅ تم حذف التجاوزات المالية');
    
    // حذف دفعات الرواتب
    await db.delete(payrollBatches).execute();
    console.log('✅ تم حذف دفعات الرواتب');
    
    // حذف سجلات الحضور
    await db.delete(attendance).execute();
    console.log('✅ تم حذف سجلات الحضور');
    
    // حذف الورديات الديناميكية
    await db.delete(groupSchedules).execute();
    console.log('✅ تم حذف الورديات الديناميكية');
    
    // حذف العمال
    await db.delete(workers).execute();
    console.log('✅ تم حذف العمال');
    
    // حذف المجموعات
    await db.delete(groups).execute();
    console.log('✅ تم حذف المجموعات');
    
    console.log('✅ تم تنظيف قاعدة البيانات بنجاح!');
    console.log('📌 ملاحظة: تم الاحتفاظ بجدول المستخدمين (users) والمراكز (cost_centers)');
    
  } catch (error) {
    console.error('❌ خطأ أثناء التنظيف:', error);
    process.exit(1);
  }
}

cleanupDatabase();
