import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import * as schema from './drizzle/schema.js';

const { workers, groups, attendanceEvents, workerDailyFinance, groupSchedules } = schema;

// Database connection
const connection = await mysql.createConnection(process.env.SUPABASE_DB_URL);
const db = drizzle(connection, { schema, mode: 'default' });

console.log('🔄 إعادة حساب البيانات المالية ليوم 6 فبراير 2026...\n');

// Get all check_out events for Feb 6, 2026
const targetDate = '2026-02-06';
const checkOutEvents = await db
  .select()
  .from(attendanceEvents)
  .where(
    and(
      eq(attendanceEvents.eventType, 'check_out'),
      gte(attendanceEvents.eventTime, new Date(`${targetDate}T00:00:00`)),
      lte(attendanceEvents.eventTime, new Date(`${targetDate}T23:59:59`))
    )
  );

console.log(`✅ وجدت ${checkOutEvents.length} سجل انصراف ليوم 6 فبراير\n`);

for (const checkOut of checkOutEvents) {
  const workerId = checkOut.workerId;
  const checkOutTime = checkOut.eventTime;
  
  console.log(`📊 معالجة العامل #${workerId}...`);
  
  // Get check_in time
  const lookbackTime = new Date(checkOutTime);
  lookbackTime.setHours(lookbackTime.getHours() - 48);
  
  const checkInEvents = await db
    .select()
    .from(attendanceEvents)
    .where(
      and(
        eq(attendanceEvents.workerId, workerId),
        eq(attendanceEvents.eventType, 'check_in'),
        gte(attendanceEvents.eventTime, lookbackTime),
        lte(attendanceEvents.eventTime, checkOutTime)
      )
    )
    .orderBy(desc(attendanceEvents.eventTime))
    .limit(1);
  
  if (checkInEvents.length === 0) {
    console.log(`   ❌ لم يتم العثور على سجل حضور مطابق`);
    continue;
  }
  
  const checkInTime = checkInEvents[0].eventTime;
  console.log(`   ✅ وقت الحضور: ${checkInTime.toLocaleString('ar-SA')}`);
  console.log(`   ✅ وقت الانصراف: ${checkOutTime.toLocaleString('ar-SA')}`);
  
  // Get worker and group data
  const [workerData] = await db
    .select({
      workerId: workers.id,
      workerName: workers.nameAr,
      dailyRate: workers.dailyRate,
      groupId: workers.groupId,
    })
    .from(workers)
    .where(eq(workers.id, workerId))
    .limit(1);
  
  if (!workerData) {
    console.log(`   ❌ لم يتم العثور على بيانات العامل`);
    continue;
  }
  
  console.log(`   👤 العامل: ${workerData.workerName}`);
  console.log(`   💰 الأجر اليومي: ${workerData.dailyRate} ريال`);
  
  // Get schedule for Thursday (day 4)
  const dayOfWeek = 4; // Thursday
  const schedules = await db
    .select()
    .from(groupSchedules)
    .where(
      and(
        eq(groupSchedules.groupId, workerData.groupId),
        eq(groupSchedules.dayOfWeek, dayOfWeek),
        lte(groupSchedules.effectiveDate, new Date(targetDate))
      )
    )
    .orderBy(desc(groupSchedules.effectiveDate))
    .limit(1);
  
  if (schedules.length === 0) {
    console.log(`   ❌ لم يتم العثور على وردية ليوم الخميس`);
    continue;
  }
  
  const schedule = schedules[0];
  console.log(`   🕐 الوردية: ${schedule.startTime} - ${schedule.endTime}`);
  console.log(`   ⏱️  الساعات المطلوبة: ${schedule.requiredHours} ساعة`);
  
  // Calculate hours worked
  const hoursWorked = (checkOutTime - checkInTime) / (1000 * 60 * 60);
  console.log(`   ⏱️  الساعات الفعلية: ${hoursWorked.toFixed(2)} ساعة`);
  
  // Calculate amount (simple: dailyRate * hoursWorked / requiredHours)
  const baseAmount = (workerData.dailyRate * hoursWorked / schedule.requiredHours);
  console.log(`   💵 المبلغ المحسوب: ${baseAmount.toFixed(2)} ريال`);
  
  // Save to database
  await db.insert(workerDailyFinance).values({
    workerId: workerId,
    workDate: new Date(targetDate),
    baseAmount: baseAmount.toFixed(2),
    deductions: '0.00',
    bonuses: '0.00',
    netAmount: baseAmount.toFixed(2),
    isLocked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  
  console.log(`   ✅ تم حفظ البيانات المالية بنجاح!\n`);
}

console.log('🎉 تم إعادة حساب جميع البيانات المالية بنجاح!');

await connection.end();
