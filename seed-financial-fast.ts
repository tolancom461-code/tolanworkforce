import { getAllWorkers, getAllGroups, getDb } from './server/db';
import { sql } from 'drizzle-orm';

const DAILY_RATE = 100;
const WORK_HOURS_PER_DAY = 8;

async function seedFinancialData() {
  console.log('🚀 بدء إضافة البيانات المالية بسرعة...\n');

  try {
    const db = await getDb();
    if (!db) {
      throw new Error('Failed to connect to database');
    }

    console.log('📊 جلب بيانات العمال والمجموعات...');
    const allWorkers = await getAllWorkers();
    const allGroups = await getAllGroups();
    
    console.log(`✅ ${allWorkers.length} عامل و ${allGroups.length} مجموعة\n`);

    console.log('📅 إضافة بيانات الحضور والانصراف...');
    
    // إنشاء batch من البيانات
    const records: any[] = [];
    let recordCount = 0;

    for (let day = 1; day <= 30; day++) {
      const dateStr = `2026-01-${String(day).padStart(2, '0')}`;
      const dayOfWeek = new Date(dateStr).getDay();
      
      // تخطي الجمعة والسبت
      if (dayOfWeek === 5 || dayOfWeek === 6) {
        continue;
      }

      for (const worker of allWorkers) {
        const checkInHour = 7 + Math.floor(Math.random() * 2);
        const checkInMinute = Math.floor(Math.random() * 60);
        const checkOutHour = 15 + Math.floor(Math.random() * 2);
        const checkOutMinute = Math.floor(Math.random() * 60);

        const checkInTime = `${String(checkInHour).padStart(2, '0')}:${String(checkInMinute).padStart(2, '0')}`;
        const checkOutTime = `${String(checkOutHour).padStart(2, '0')}:${String(checkOutMinute).padStart(2, '0')}`;

        const totalMinutes = (checkOutHour - checkInHour) * 60 + (checkOutMinute - checkInMinute);
        const hoursWorked = Math.max(0, totalMinutes / 60);
        
        const lateMinutes = checkInHour > 7 || (checkInHour === 7 && checkInMinute > 30) 
          ? (checkInHour - 7) * 60 + (checkInMinute - 30)
          : 0;

        const dailyAmount = (hoursWorked / WORK_HOURS_PER_DAY) * DAILY_RATE;
        const lateDeduction = lateMinutes > 0 ? (lateMinutes / 60) * 10 : 0;
        const netAmount = dailyAmount - lateDeduction;

        records.push({
          worker_id: worker.id,
          work_date: dateStr,
          check_in_time: checkInTime,
          check_out_time: checkOutTime,
          hours_worked: hoursWorked.toFixed(2),
          late_minutes: lateMinutes,
          day_rate: DAILY_RATE,
          deductions: lateDeduction.toFixed(2),
          calculated_net_amount: netAmount.toFixed(2)
        });

        recordCount++;

        // إدراج كل 500 سجل
        if (records.length >= 500) {
          const valueParts = records.map(r => 
            `(${r.worker_id}, '${r.work_date}', '${r.check_in_time}', '${r.check_out_time}', ${r.hours_worked}, ${r.late_minutes}, ${r.day_rate}, ${r.deductions}, ${r.calculated_net_amount}, NOW(), NOW())`
          ).join(',');

          try {
            await db.execute(sql.raw(`
              INSERT INTO worker_daily_finance (
                worker_id, work_date, check_in_time, check_out_time,
                hours_worked, late_minutes, day_rate, deductions,
                calculated_net_amount, created_at, updated_at
              ) VALUES ${valueParts}
              ON DUPLICATE KEY UPDATE
                check_in_time = VALUES(check_in_time),
                check_out_time = VALUES(check_out_time),
                hours_worked = VALUES(hours_worked),
                late_minutes = VALUES(late_minutes),
                deductions = VALUES(deductions),
                calculated_net_amount = VALUES(calculated_net_amount),
                updated_at = NOW()
            `));
            console.log(`   ✅ تم إضافة ${recordCount} سجل مالي`);
          } catch (err) {
            console.error('❌ خطأ:', err);
          }

          records.length = 0;
        }
      }
    }

    // إدراج السجلات المتبقية
    if (records.length > 0) {
      const valueParts = records.map(r => 
        `(${r.worker_id}, '${r.work_date}', '${r.check_in_time}', '${r.check_out_time}', ${r.hours_worked}, ${r.late_minutes}, ${r.day_rate}, ${r.deductions}, ${r.calculated_net_amount}, NOW(), NOW())`
      ).join(',');

      try {
        await db.execute(sql.raw(`
          INSERT INTO worker_daily_finance (
            worker_id, work_date, check_in_time, check_out_time,
            hours_worked, late_minutes, day_rate, deductions,
            calculated_net_amount, created_at, updated_at
          ) VALUES ${valueParts}
          ON DUPLICATE KEY UPDATE
            check_in_time = VALUES(check_in_time),
            check_out_time = VALUES(check_out_time),
            hours_worked = VALUES(hours_worked),
            late_minutes = VALUES(late_minutes),
            deductions = VALUES(deductions),
            calculated_net_amount = VALUES(calculated_net_amount),
            updated_at = NOW()
        `));
        console.log(`   ✅ تم إضافة ${recordCount} سجل مالي (النهاية)`);
      } catch (err) {
        console.error('❌ خطأ:', err);
      }
    }

    console.log(`\n📊 ملخص البيانات المالية:`);
    console.log(`   ✅ سجلات مالية يومية: ${recordCount}`);
    console.log(`   ✅ عدد العمال: ${allWorkers.length}`);
    console.log(`\n🎉 تم إضافة البيانات المالية بنجاح!\n`);

  } catch (error) {
    console.error('❌ خطأ:', error);
    process.exit(1);
  }
}

seedFinancialData().then(() => {
  console.log('✅ انتهى السكريبت');
  process.exit(0);
}).catch(err => {
  console.error('❌ فشل:', err);
  process.exit(1);
});
