import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL || process.env.SUPABASE_DB_URL);

// Get all workers with their groups
const [workers] = await conn.execute(`
  SELECT w.id, w.full_name, w.group_id, w.daily_rate,
    g.daily_wage, g.work_minutes, g.late_penalty_rate, g.early_leave_penalty_rate
  FROM workers w
  LEFT JOIN \`groups\` g ON w.group_id = g.id
  WHERE w.status = 'active'
`);

console.log(`Found ${workers.length} active workers`);

// Get all attendance events
const [events] = await conn.execute(`
  SELECT ae.worker_id, ae.event_type, ae.event_time
  FROM attendance_events ae
  ORDER BY ae.event_time
`);

console.log(`Found ${events.length} attendance events`);

// Set timezone to Saudi Arabia
process.env.TZ = 'Asia/Riyadh';

// Group events by worker and date (local time)
const workerDayEvents = {};
for (const event of events) {
  const eventDate = new Date(event.event_time);
  const dateKey = eventDate.toLocaleDateString('en-CA'); // local date
  const key = `${event.worker_id}_${dateKey}`;
  if (!workerDayEvents[key]) {
    workerDayEvents[key] = { workerId: event.worker_id, date: dateKey, checkIn: null, checkOut: null };
  }
  if (event.event_type === 'check_in' && !workerDayEvents[key].checkIn) {
    workerDayEvents[key].checkIn = eventDate;
  }
  if (event.event_type === 'check_out') {
    workerDayEvents[key].checkOut = eventDate;
  }
}

// Get all group schedules
const [schedules] = await conn.execute('SELECT * FROM group_schedules WHERE is_active = 1');
const scheduleMap = {};
for (const s of schedules) {
  const key = `${s.group_id}_${s.day_of_week}`;
  scheduleMap[key] = { startTime: s.start_time, endTime: s.end_time };
}

console.log(`\nSchedules loaded: ${schedules.length}`);
console.log('Schedule map:', JSON.stringify(scheduleMap, null, 2));

// Process each worker-day
for (const [key, dayData] of Object.entries(workerDayEvents)) {
  const worker = workers.find(w => w.id === dayData.workerId);
  if (!worker) continue;

  const { checkIn, checkOut } = dayData;
  if (!checkIn || !checkOut) {
    console.log(`\n${worker.full_name} - ${dayData.date}: Missing check-in or check-out, skipping`);
    continue;
  }

  const groupDailyWage = Number(worker.daily_wage) || 0;
  const groupWorkMinutes = Number(worker.work_minutes) || 0;
  const latePenaltyRate = Number(worker.late_penalty_rate) || 0;
  const earlyLeavePenaltyRate = Number(worker.early_leave_penalty_rate) || 0;

  // Get day of week (local time)
  const workDateObj = new Date(dayData.date + 'T00:00:00');
  const dayOfWeek = workDateObj.getDay();
  
  // Get shift for this day
  const scheduleKey = `${worker.group_id}_${dayOfWeek}`;
  const schedule = scheduleMap[scheduleKey];

  let baseAmount = groupDailyWage > 0 ? groupDailyWage : (Number(worker.daily_rate) || 0);
  let lateMinutes = 0;
  let earlyLeaveMinutes = 0;
  let workedMinutes = Math.round((checkOut.getTime() - checkIn.getTime()) / 60000);
  let financialMinutes = groupWorkMinutes > 0 ? Math.min(workedMinutes, groupWorkMinutes) : workedMinutes;
  let deductions = 0;

  console.log(`\n${worker.full_name} - ${dayData.date} (day=${dayOfWeek}):`);
  console.log(`  Check-in: ${checkIn.toISOString()} | Check-out: ${checkOut.toISOString()}`);
  console.log(`  Group: dailyWage=${groupDailyWage}, workMin=${groupWorkMinutes}, latePR=${latePenaltyRate}, earlyPR=${earlyLeavePenaltyRate}`);

  if (schedule) {
    const [shiftStartH, shiftStartM] = schedule.startTime.split(':').map(Number);
    const [shiftEndH, shiftEndM] = schedule.endTime.split(':').map(Number);
    
    // Build shift times in local time
    const shiftStart = new Date(dayData.date + 'T00:00:00');
    shiftStart.setHours(shiftStartH, shiftStartM, 0, 0);
    
    const shiftEnd = new Date(dayData.date + 'T00:00:00');
    shiftEnd.setHours(shiftEndH, shiftEndM, 0, 0);

    console.log(`  Shift: ${shiftStart.toISOString()} - ${shiftEnd.toISOString()}`);

    // Financial check-in/out capped to shift boundaries
    const financialCheckIn = checkIn < shiftStart ? shiftStart : checkIn;
    const financialCheckOut = checkOut > shiftEnd ? shiftEnd : checkOut;

    if (financialCheckOut > financialCheckIn) {
      const finMin = Math.round((financialCheckOut.getTime() - financialCheckIn.getTime()) / 60000);
      financialMinutes = groupWorkMinutes > 0 ? Math.min(finMin, groupWorkMinutes) : finMin;
    } else {
      financialMinutes = 0;
    }

    // Late minutes
    if (checkIn > shiftStart) {
      lateMinutes = Math.round((checkIn.getTime() - shiftStart.getTime()) / 60000);
    }

    // Early leave minutes
    if (checkOut < shiftEnd) {
      earlyLeaveMinutes = Math.round((shiftEnd.getTime() - checkOut.getTime()) / 60000);
    }

    // Deductions
    if (groupDailyWage > 0 && groupWorkMinutes > 0) {
      const minuteCost = groupDailyWage / groupWorkMinutes;
      if (lateMinutes > 0 && latePenaltyRate > 0) {
        deductions += minuteCost * lateMinutes * (latePenaltyRate / 100);
      }
      if (earlyLeaveMinutes > 0 && earlyLeavePenaltyRate > 0) {
        deductions += minuteCost * earlyLeaveMinutes * (earlyLeavePenaltyRate / 100);
      }
    }

    console.log(`  Late: ${lateMinutes}min | Early leave: ${earlyLeaveMinutes}min`);
  } else {
    console.log(`  NO SHIFT DEFINED for day ${dayOfWeek} - no penalties`);
  }

  // Round deductions
  deductions = Math.round(deductions * 100) / 100;

  // Cap deductions at base amount
  if (deductions > baseAmount) {
    deductions = baseAmount;
  }

  baseAmount = Math.round(baseAmount * 100) / 100;
  const netAmount = Math.round((baseAmount - deductions) * 100) / 100;

  console.log(`  Base: ${baseAmount} | Deductions: ${deductions} | Net: ${netAmount}`);
  console.log(`  Worked: ${workedMinutes}min | Financial: ${financialMinutes}min`);

  // Update or insert worker_daily_finance
  const [existing] = await conn.execute(
    'SELECT id FROM worker_daily_finance WHERE worker_id = ? AND work_date = ?',
    [dayData.workerId, dayData.date]
  );

  if (existing.length > 0) {
    await conn.execute(`
      UPDATE worker_daily_finance SET
        base_amount = ?, base_salary = ?, deductions = ?, net_amount = ?, net_salary = ?,
        late_penalty = ?, early_leave_penalty = ?,
        worked_minutes = ?, financial_minutes = ?,
        late_minutes = ?, early_leave_minutes = ?,
        check_in_time = ?, check_out_time = ?,
        updated_at = NOW()
      WHERE worker_id = ? AND work_date = ?
    `, [
      baseAmount, baseAmount, deductions, netAmount, netAmount,
      deductions > 0 && lateMinutes > 0 ? (deductions * lateMinutes / (lateMinutes + earlyLeaveMinutes || 1)) : 0,
      deductions > 0 && earlyLeaveMinutes > 0 ? (deductions * earlyLeaveMinutes / (lateMinutes + earlyLeaveMinutes || 1)) : 0,
      workedMinutes, financialMinutes,
      lateMinutes, earlyLeaveMinutes,
      checkIn, checkOut,
      dayData.workerId, dayData.date
    ]);
    console.log(`  ✅ UPDATED`);
  } else {
    await conn.execute(`
      INSERT INTO worker_daily_finance 
        (worker_id, work_date, base_amount, base_salary, deductions, net_amount, net_salary,
         late_penalty, early_leave_penalty, worked_minutes, financial_minutes,
         late_minutes, early_leave_minutes, check_in_time, check_out_time, bonuses, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())
    `, [
      dayData.workerId, dayData.date,
      baseAmount, baseAmount, deductions, netAmount, netAmount,
      deductions > 0 && lateMinutes > 0 ? (deductions * lateMinutes / (lateMinutes + earlyLeaveMinutes || 1)) : 0,
      deductions > 0 && earlyLeaveMinutes > 0 ? (deductions * earlyLeaveMinutes / (lateMinutes + earlyLeaveMinutes || 1)) : 0,
      workedMinutes, financialMinutes,
      lateMinutes, earlyLeaveMinutes,
      checkIn, checkOut
    ]);
    console.log(`  ✅ INSERTED`);
  }
}

// Also update payroll batch items
const [batches] = await conn.execute('SELECT id, period_start, period_end FROM payroll_batches WHERE status = "draft"');
for (const batch of batches) {
  console.log(`\n=== Recalculating batch ${batch.id} ===`);
  const [items] = await conn.execute('SELECT * FROM payroll_batch_items WHERE batch_id = ?', [batch.id]);
  
  let batchTotal = 0;
  for (const item of items) {
    // Get finance records for this worker in the batch period
    const [finance] = await conn.execute(`
      SELECT SUM(base_amount) as totalBase, SUM(deductions) as totalDeductions, 
             SUM(COALESCE(bonuses, 0)) as totalBonuses, COUNT(*) as days
      FROM worker_daily_finance 
      WHERE worker_id = ? AND work_date >= ? AND work_date <= ?
    `, [item.worker_id, batch.period_start, batch.period_end]);
    
    if (finance[0] && finance[0].days > 0) {
      const base = Number(finance[0].totalBase) || 0;
      const ded = Number(finance[0].totalDeductions) || 0;
      const bon = Number(finance[0].totalBonuses) || 0;
      const net = base - ded + bon;
      
      await conn.execute(`
        UPDATE payroll_batch_items SET
          days_worked = ?, base_amount = ?, total_deductions = ?, total_bonuses = ?, net_amount = ?
        WHERE id = ?
      `, [finance[0].days, base.toFixed(2), ded.toFixed(2), bon.toFixed(2), net.toFixed(2), item.id]);
      
      batchTotal += net;
      console.log(`  Worker ${item.worker_id}: base=${base}, ded=${ded}, bon=${bon}, net=${net}, days=${finance[0].days}`);
    }
  }
  
  await conn.execute('UPDATE payroll_batches SET total_amount = ? WHERE id = ?', [batchTotal.toFixed(2), batch.id]);
  console.log(`  Batch total: ${batchTotal}`);
}

await conn.end();
console.log('\n✅ Done!');
