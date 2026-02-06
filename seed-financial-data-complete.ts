import { getAllWorkers, getAllGroups, getDb } from './server/db';
import { sql } from 'drizzle-orm';

const MONTH_START = '2026-01-01';
const MONTH_END = '2026-01-31';
const DAILY_RATE = 100;
const WORK_HOURS_PER_DAY = 8;

async function seedFinancialData() {
  console.log('🚀 بدء إضافة البيانات المالية الشاملة...\n');

  try {
    const db = await getDb();
    if (!db) {
      throw new Error('Failed to connect to database');
    }

    // الخطوة 1: الحصول على جميع العمال والمجموعات
    console.log('📊 الخطوة 1: جلب بيانات العمال والمجموعات...');
    const allWorkers = await getAllWorkers();
    const allGroups = await getAllGroups();
    
    console.log(`✅ تم جلب ${allWorkers.length} عامل و ${allGroups.length} مجموعة\n`);

    // الخطوة 2: إضافة بيانات الحضور والانصراف اليومية
    console.log('📅 الخطوة 2: إضافة بيانات الحضور والانصراف اليومية...');
    let financeCount = 0;

    for (let day = 1; day <= 30; day++) {
      const dateStr = `2026-01-${String(day).padStart(2, '0')}`;
      const dayOfWeek = new Date(dateStr).getDay();
      
      // تخطي الجمعة والسبت (عطل نهاية الأسبوع)
      if (dayOfWeek === 5 || dayOfWeek === 6) {
        console.log(`   ⏭️  ${dateStr} - عطلة نهاية أسبوع`);
        continue;
      }

      // إضافة بيانات لكل عامل
      for (const worker of allWorkers) {
        // توليد أوقات عشوائية للحضور والانصراف
        const checkInHour = 7 + Math.floor(Math.random() * 2);
        const checkInMinute = Math.floor(Math.random() * 60);
        const checkOutHour = 15 + Math.floor(Math.random() * 2);
        const checkOutMinute = Math.floor(Math.random() * 60);

        const checkInTime = `${String(checkInHour).padStart(2, '0')}:${String(checkInMinute).padStart(2, '0')}`;
        const checkOutTime = `${String(checkOutHour).padStart(2, '0')}:${String(checkOutMinute).padStart(2, '0')}`;

        // حساب الساعات المشتغلة
        const totalMinutes = (checkOutHour - checkInHour) * 60 + (checkOutMinute - checkInMinute);
        const hoursWorked = Math.max(0, totalMinutes / 60);
        
        // حساب التأخير
        const lateMinutes = checkInHour > 7 || (checkInHour === 7 && checkInMinute > 30) 
          ? (checkInHour - 7) * 60 + (checkInMinute - 30)
          : 0;

        // حساب المبلغ اليومي
        const dailyAmount = (hoursWorked / WORK_HOURS_PER_DAY) * DAILY_RATE;
        const lateDeduction = lateMinutes > 0 ? (lateMinutes / 60) * 10 : 0;
        const netAmount = dailyAmount - lateDeduction;

        try {
          await db.execute(sql`
            INSERT INTO worker_daily_finance (
              worker_id, work_date, check_in_time, check_out_time,
              hours_worked, late_minutes, day_rate, deductions,
              calculated_net_amount, created_at, updated_at
            ) VALUES (
              ${worker.id}, ${dateStr}, ${checkInTime}, ${checkOutTime},
              ${hoursWorked}, ${lateMinutes}, ${DAILY_RATE}, ${lateDeduction},
              ${netAmount}, NOW(), NOW()
            )
            ON DUPLICATE KEY UPDATE
              check_in_time = VALUES(check_in_time),
              check_out_time = VALUES(check_out_time),
              hours_worked = VALUES(hours_worked),
              late_minutes = VALUES(late_minutes),
              day_rate = VALUES(day_rate),
              deductions = VALUES(deductions),
              calculated_net_amount = VALUES(calculated_net_amount),
              updated_at = NOW()
          `);
          financeCount++;
        } catch (err) {
          // تجاهل الأخطاء
        }
      }

      if (day % 5 === 0) {
        console.log(`   ✅ تم معالجة ${day} أيام - ${financeCount} سجل مالي`);
      }
    }

    console.log(`\n✅ تم إضافة ${financeCount} سجل مالي يومي\n`);

    // الملخص النهائي
    console.log('📊 ملخص البيانات المالية المضافة:');
    console.log(`   ✅ سجلات مالية يومية: ${financeCount}`);
    console.log(`   ✅ عدد العمال: ${allWorkers.length}`);
    console.log(`   ✅ عدد المجموعات: ${allGroups.length}`);
    console.log(`\n🎉 تم إضافة البيانات المالية الشاملة بنجاح!\n`);

  } catch (error) {
    console.error('❌ خطأ في إضافة البيانات المالية:', error);
    process.exit(1);
  }
}

seedFinancialData().then(() => {
  console.log('✅ انتهى السكريبت بنجاح');
  process.exit(0);
}).catch(err => {
  console.error('❌ فشل السكريبت:', err);
  process.exit(1);
});
