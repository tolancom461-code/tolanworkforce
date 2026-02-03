import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

const connection = await mysql.createConnection({
  host: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'localhost',
  user: process.env.DATABASE_URL?.split('://')[1]?.split(':')[0] || 'root',
  password: process.env.DATABASE_URL?.split(':')[2]?.split('@')[0] || '',
  database: process.env.DATABASE_URL?.split('/')[3]?.split('?')[0] || 'tolanworkforce',
});

const db = drizzle(connection, { schema });

async function cleanupDatabase() {
  try {
    console.log('🧹 جاري تنظيف قاعدة البيانات...\n');

    // حذف البيانات بالترتيب الصحيح (مع احترام العلاقات الأجنبية)
    
    console.log('📋 حذف المعاملات المالية...');
    await connection.execute('DELETE FROM financial_transactions');
    console.log('✅ تم حذف المعاملات المالية\n');

    console.log('📋 حذف التجاوزات المالية...');
    await connection.execute('DELETE FROM payroll_overrides');
    console.log('✅ تم حذف التجاوزات المالية\n');

    console.log('📋 حذف دفعات الرواتب...');
    await connection.execute('DELETE FROM payroll_batches');
    console.log('✅ تم حذف دفعات الرواتب\n');

    console.log('📋 حذف سجلات الحضور...');
    await connection.execute('DELETE FROM attendance');
    console.log('✅ تم حذف سجلات الحضور\n');

    console.log('📋 حذف أحداث الحضور...');
    await connection.execute('DELETE FROM attendance_events');
    console.log('✅ تم حذف أحداث الحضور\n');

    console.log('📋 حذف الورديات الديناميكية...');
    await connection.execute('DELETE FROM group_schedules');
    console.log('✅ تم حذف الورديات الديناميكية\n');

    console.log('📋 حذف العمال...');
    await connection.execute('DELETE FROM workers');
    console.log('✅ تم حذف العمال\n');

    console.log('📋 حذف المجموعات...');
    await connection.execute('DELETE FROM groups');
    console.log('✅ تم حذف المجموعات\n');

    console.log('✅✅✅ تم تنظيف قاعدة البيانات بنجاح! ✅✅✅\n');
    console.log('📌 ملاحظة: تم الاحتفاظ بـ:');
    console.log('   - جدول المستخدمين (users)');
    console.log('   - جدول مراكز التكلفة (cost_centers)');
    console.log('\n🎉 المشروع جاهز للتسليم للعميل!\n');

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ خطأ أثناء التنظيف:', error);
    await connection.end();
    process.exit(1);
  }
}

cleanupDatabase();
