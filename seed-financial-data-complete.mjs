import { db, sql } from './server/db.ts';
import { workers, groups, costCenters, workerDailyFinance, payOverrides, payrollBatches, payrollBatchItems } from './drizzle/schema.ts';
import { eq, and, gte, lte } from 'drizzle-orm';

const MONTH_START = '2026-01-01';
const MONTH_END = '2026-01-31';
const DAILY_RATE = 100; // معدل يومي ثابت
const WORK_HOURS_PER_DAY = 8;

async function seedFinancialData() {
  console.log('🚀 بدء إضافة البيانات المالية الشاملة...\n');

  try {
    // الخطوة 1: الحصول على جميع العمال والمجموعات
    console.log('📊 الخطوة 1: جلب بيانات العمال والمجموعات...');
    const allWorkers = await db.select().from(workers);
    const allGroups = await db.select().from(groups);
    
    console.log(`✅ تم جلب ${allWorkers.length} عامل و ${allGroups.length} مجموعة\n`);

    // الخطوة 2: إضافة بيانات الحضور والانصراف اليومية
    console.log('📅 الخطوة 2: إضافة بيانات الحضور والانصراف اليومية...');
    let attendanceCount = 0;
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
        const checkInHour = 7 + Math.floor(Math.random() * 2); // 7-8
        const checkInMinute = Math.floor(Math.random() * 60);
        const checkOutHour = 15 + Math.floor(Math.random() * 2); // 15-16
        const checkOutMinute = Math.floor(Math.random() * 60);

        const checkInTime = `${String(checkInHour).padStart(2, '0')}:${String(checkInMinute).padStart(2, '0')}`;
        const checkOutTime = `${String(checkOutHour).padStart(2, '0')}:${String(checkOutMinute).padStart(2, '0')}`;

        // حساب الساعات المشتغلة
        const totalMinutes = (checkOutHour - checkInHour) * 60 + (checkOutMinute - checkInMinute);
        const hoursWorked = Math.max(0, totalMinutes / 60);
        
        // حساب التأخير (إذا كان الوصول بعد 7:30)
        const lateMinutes = checkInHour > 7 || (checkInHour === 7 && checkInMinute > 30) 
          ? (checkInHour - 7) * 60 + (checkInMinute - 30)
          : 0;

        // حساب المبلغ اليومي
        const dailyAmount = (hoursWorked / WORK_HOURS_PER_DAY) * DAILY_RATE;
        const lateDeduction = lateMinutes > 0 ? (lateMinutes / 60) * 10 : 0; // 10 ريال لكل ساعة تأخير
        const netAmount = dailyAmount - lateDeduction;

        // إضافة سجل الحضور والانصراف
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
          console.error(`❌ خطأ في إضافة سجل مالي للعامل ${worker.id} في ${dateStr}:`, err.message);
        }
      }

      attendanceCount += allWorkers.length;
      if (day % 5 === 0) {
        console.log(`   ✅ تم معالجة ${day} أيام - ${attendanceCount} سجل حضور`);
      }
    }

    console.log(`✅ تم إضافة ${financeCount} سجل مالي يومي\n`);

    // الخطوة 3: إضافة الخصومات والإضافات المالية
    console.log('💰 الخطوة 3: إضافة الخصومات والإضافات المالية...');
    let deductionCount = 0;

    const deductionTypes = [
      { name: 'خصم غياب', amount: -50, probability: 0.1 },
      { name: 'خصم تأخير', amount: -20, probability: 0.15 },
      { name: 'مكافأة أداء', amount: 100, probability: 0.05 },
      { name: 'حافز إنتاجية', amount: 75, probability: 0.08 },
      { name: 'خصم نقابة', amount: -30, probability: 0.3 },
    ];

    for (const worker of allWorkers) {
      for (let day = 1; day <= 30; day++) {
        const dateStr = `2026-01-${String(day).padStart(2, '0')}`;
        
        for (const deductionType of deductionTypes) {
          if (Math.random() < deductionType.probability) {
            try {
              await db.execute(sql`
                INSERT INTO worker_daily_finance (
                  worker_id, work_date, deductions, additions,
                  calculated_net_amount, created_at, updated_at
                ) VALUES (
                  ${worker.id}, ${dateStr},
                  ${deductionType.amount < 0 ? Math.abs(deductionType.amount) : 0},
                  ${deductionType.amount > 0 ? deductionType.amount : 0},
                  ${deductionType.amount}, NOW(), NOW()
                )
                ON DUPLICATE KEY UPDATE
                  deductions = deductions + ${deductionType.amount < 0 ? Math.abs(deductionType.amount) : 0},
                  additions = additions + ${deductionType.amount > 0 ? deductionType.amount : 0},
                  calculated_net_amount = calculated_net_amount + ${deductionType.amount},
                  updated_at = NOW()
              `);
              deductionCount++;
            } catch (err) {
              // تجاهل الأخطاء المتكررة
            }
          }
        }
      }
    }

    console.log(`✅ تم إضافة ${deductionCount} خصم/إضافة مالية\n`);

    // الخطوة 4: إضافة تجاوزات الرواتب (Pay Overrides)
    console.log('🎁 الخطوة 4: إضافة تجاوزات الرواتب...');
    let overrideCount = 0;

    const overrideTypes = ['bonus', 'deduction', 'emergency_payment'];
    for (const worker of allWorkers.slice(0, 10)) { // لأول 10 عمال فقط
      for (let i = 0; i < 2; i++) {
        const overrideType = overrideTypes[Math.floor(Math.random() * overrideTypes.length)];
        const amount = overrideType === 'deduction' 
          ? -(50 + Math.random() * 100)
          : (100 + Math.random() * 200);
        
        try {
          await db.execute(sql`
            INSERT INTO pay_overrides (
              worker_id, override_date, override_type, amount,
              status, reason, created_at, updated_at
            ) VALUES (
              ${worker.id}, '2026-01-${String(15 + i).padStart(2, '0')}',
              ${overrideType}, ${amount},
              'approved', 'تجاوز مالي تجريبي', NOW(), NOW()
            )
          `);
          overrideCount++;
        } catch (err) {
          // تجاهل الأخطاء
        }
      }
    }

    console.log(`✅ تم إضافة ${overrideCount} تجاوز راتب\n`);

    // الخطوة 5: إنشاء دفعات رواتب
    console.log('📦 الخطوة 5: إنشاء دفعات رواتب...');
    let batchCount = 0;

    for (const group of allGroups) {
      try {
        // إنشاء دفعة راتب
        const batchCode = `Jan-2026-${String(batchCount + 1).padStart(3, '0')}`;
        
        const batchResult = await db.execute(sql`
          INSERT INTO payroll_batches (
            batch_code, period_start, period_end, group_id,
            status, created_by, created_at, updated_at
          ) VALUES (
            ${batchCode}, ${MONTH_START}, ${MONTH_END},
            ${group.id}, 'approved', 1, NOW(), NOW()
          )
        `);

        // الحصول على معرف الدفعة
        const batchId = batchResult.insertId;

        // إضافة عمال المجموعة إلى الدفعة
        const groupWorkers = allWorkers.filter(w => w.group_id === group.id);
        let totalAmount = 0;

        for (const worker of groupWorkers) {
          // حساب إجمالي الراتب للعامل
          const workerFinance = await db.execute(sql`
            SELECT 
              SUM(COALESCE(day_rate, 0)) as total_rate,
              SUM(COALESCE(deductions, 0)) as total_deductions,
              SUM(COALESCE(additions, 0)) as total_additions,
              SUM(COALESCE(calculated_net_amount, 0)) as total_net
            FROM worker_daily_finance
            WHERE worker_id = ${worker.id}
            AND work_date BETWEEN ${MONTH_START} AND ${MONTH_END}
          `);

          const finance = workerFinance[0] || {};
          const netAmount = (finance.total_net || 0) + (finance.total_additions || 0) - (finance.total_deductions || 0);
          totalAmount += netAmount;

          // إضافة عنصر الدفعة
          try {
            await db.execute(sql`
              INSERT INTO payroll_batch_items (
                batch_id, worker_id, base_amount, deductions,
                additions, net_amount, created_at, updated_at
              ) VALUES (
                ${batchId}, ${worker.id},
                ${finance.total_rate || 0},
                ${finance.total_deductions || 0},
                ${finance.total_additions || 0},
                ${netAmount}, NOW(), NOW()
              )
            `);
          } catch (err) {
            // تجاهل الأخطاء
          }
        }

        // تحديث إجمالي الدفعة
        await db.execute(sql`
          UPDATE payroll_batches
          SET total_amount = ${totalAmount}
          WHERE id = ${batchId}
        `);

        batchCount++;
        console.log(`   ✅ دفعة راتب: ${batchCode} - المجموعة: ${group.name} - الإجمالي: ${totalAmount.toFixed(2)} ريال`);
      } catch (err) {
        console.error(`❌ خطأ في إنشاء دفعة راتب للمجموعة ${group.name}:`, err.message);
      }
    }

    console.log(`\n✅ تم إنشاء ${batchCount} دفعة راتب\n`);

    // الملخص النهائي
    console.log('📊 ملخص البيانات المالية المضافة:');
    console.log(`   ✅ سجلات مالية يومية: ${financeCount}`);
    console.log(`   ✅ خصومات وإضافات: ${deductionCount}`);
    console.log(`   ✅ تجاوزات رواتب: ${overrideCount}`);
    console.log(`   ✅ دفعات رواتب: ${batchCount}`);
    console.log(`\n🎉 تم إضافة البيانات المالية الشاملة بنجاح!\n`);

  } catch (error) {
    console.error('❌ خطأ في إضافة البيانات المالية:', error);
    process.exit(1);
  }
}

// تشغيل السكريبت
seedFinancialData().then(() => {
  console.log('✅ انتهى السكريبت بنجاح');
  process.exit(0);
}).catch(err => {
  console.error('❌ فشل السكريبت:', err);
  process.exit(1);
});
