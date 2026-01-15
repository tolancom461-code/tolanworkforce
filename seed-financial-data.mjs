import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from './drizzle/schema.js';
import { sql } from 'drizzle-orm';

// Database connection
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

console.log('💰 Starting financial data seeding...');

// ============================================
// 1. Get all workers with attendance
// ============================================
console.log('📊 Step 1: Processing attendance to create daily finance records...');

const workers = await db.select().from(schema.workers);
console.log(`Found ${workers.length} workers`);

// Get date range from attendance events
const dateRangeResult = await db.execute(sql`
  SELECT 
    MIN(DATE(event_time)) as min_date,
    MAX(DATE(event_time)) as max_date
  FROM attendance_events
`);

const minDate = dateRangeResult[0][0].min_date;
const maxDate = dateRangeResult[0][0].max_date;

console.log(`Date range: ${minDate} to ${maxDate}`);

// Process each worker's attendance
let financeRecordsCreated = 0;

for (const worker of workers) {
  // Get all dates this worker has attendance
  const attendanceDates = await db.execute(sql`
    SELECT DISTINCT DATE(event_time) as work_date
    FROM attendance_events
    WHERE worker_id = ${worker.id}
    ORDER BY work_date
  `);

  for (const dateRow of attendanceDates[0]) {
    const workDate = dateRow.work_date;
    
    // Check if finance record already exists
    const existingRecord = await db.execute(sql`
      SELECT id FROM worker_daily_finance
      WHERE worker_id = ${worker.id} AND work_date = ${workDate}
    `);

    if (existingRecord[0].length > 0) {
      continue; // Skip if already exists
    }

    // Get check-in and check-out for this date
    const events = await db.execute(sql`
      SELECT event_type, event_time
      FROM attendance_events
      WHERE worker_id = ${worker.id} AND DATE(event_time) = ${workDate}
      ORDER BY event_time
    `);

    const checkIn = events[0].find(e => e.event_type === 'check_in');
    const checkOut = events[0].find(e => e.event_type === 'check_out');

    if (!checkIn || !checkOut) continue; // Need both check-in and check-out

    // Calculate work hours
    const checkInTime = new Date(checkIn.event_time);
    const checkOutTime = new Date(checkOut.event_time);
    const workHours = (checkOutTime - checkInTime) / (1000 * 60 * 60);

    // Calculate base amount (assuming 8 hours standard)
    const dailyRate = parseFloat(worker.dailyRate || '150');
    const baseAmount = dailyRate;

    // Calculate late minutes (if check-in after 7:30 AM)
    const standardCheckIn = new Date(checkInTime);
    standardCheckIn.setHours(7, 30, 0, 0);
    const lateMinutes = checkInTime > standardCheckIn ? 
      Math.floor((checkInTime - standardCheckIn) / (1000 * 60)) : 0;

    // Calculate early leave minutes (if check-out before 3:00 PM)
    const standardCheckOut = new Date(checkOutTime);
    standardCheckOut.setHours(15, 0, 0, 0);
    const earlyLeaveMinutes = checkOutTime < standardCheckOut ? 
      Math.floor((standardCheckOut - checkOutTime) / (1000 * 60)) : 0;

    // Calculate deductions (1 SAR per 10 minutes late/early)
    const lateDeduction = Math.floor(lateMinutes / 10);
    const earlyDeduction = Math.floor(earlyLeaveMinutes / 10);
    const totalDeductions = lateDeduction + earlyDeduction;

    // Random bonuses (10% chance of 20-50 SAR bonus)
    const bonuses = Math.random() > 0.9 ? (20 + Math.floor(Math.random() * 30)) : 0;

    // Calculate net amount
    const netAmount = baseAmount - totalDeductions + bonuses;

    // Insert finance record
    await db.insert(schema.workerDailyFinance).values({
      workerId: worker.id,
      workDate: workDate,
      baseAmount: baseAmount.toString(),
      deductions: totalDeductions.toString(),
      bonuses: bonuses.toString(),
      netAmount: netAmount.toString(),
      lateMinutes: lateMinutes,
      earlyLeaveMinutes: earlyLeaveMinutes,
      notes: lateMinutes > 0 || earlyLeaveMinutes > 0 ? 
        `تأخير: ${lateMinutes} دقيقة، مغادرة مبكرة: ${earlyLeaveMinutes} دقيقة` : null
    });

    financeRecordsCreated++;
  }
}

console.log(`✅ Created ${financeRecordsCreated} daily finance records\n`);

// ============================================
// 2. Add some pay overrides (bonuses and deductions)
// ============================================
console.log('💵 Step 2: Adding pay overrides...');

// Add 5 random bonuses
const bonusWorkers = workers.slice(0, 5);
let overridesCreated = 0;

for (const worker of bonusWorkers) {
  // Get a random date from their attendance
  const workerDates = await db.execute(sql`
    SELECT DISTINCT work_date
    FROM worker_daily_finance
    WHERE worker_id = ${worker.id}
    LIMIT 1
  `);

  if (workerDates[0].length === 0) continue;

  const overrideDate = workerDates[0][0].work_date;

  await db.insert(schema.payOverrides).values({
    workerId: worker.id,
    overrideDate: overrideDate,
    overrideType: 'bonus',
    amount: (50 + Math.floor(Math.random() * 100)).toString(),
    reason: 'مكافأة أداء متميز',
    status: 'approved',
    approvedBy: 1,
    approvedAt: new Date(),
    createdBy: 1
  });

  overridesCreated++;
}

// Add 3 random deductions
const deductionWorkers = workers.slice(5, 8);

for (const worker of deductionWorkers) {
  // Get a random date from their attendance
  const workerDates = await db.execute(sql`
    SELECT DISTINCT work_date
    FROM worker_daily_finance
    WHERE worker_id = ${worker.id}
    LIMIT 1
  `);

  if (workerDates[0].length === 0) continue;

  const overrideDate = workerDates[0][0].work_date;

  await db.insert(schema.payOverrides).values({
    workerId: worker.id,
    overrideDate: overrideDate,
    overrideType: 'deduction',
    amount: (20 + Math.floor(Math.random() * 50)).toString(),
    reason: 'خصم لمخالفة',
    status: 'approved',
    approvedBy: 1,
    approvedAt: new Date(),
    createdBy: 1
  });

  overridesCreated++;
}

console.log(`✅ Created ${overridesCreated} pay overrides\n`);

// ============================================
// Summary
// ============================================
console.log('═══════════════════════════════════════');
console.log('🎉 Financial Data Seeding Completed!');
console.log('═══════════════════════════════════════');
console.log(`✅ Daily Finance Records: ${financeRecordsCreated}`);
console.log(`✅ Pay Overrides: ${overridesCreated}`);
console.log('═══════════════════════════════════════\n');

await connection.end();
