import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const url = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!url) {
    console.error('No DATABASE_URL found');
    process.exit(1);
  }
  
  const conn = await mysql.createConnection(url + '&connectTimeout=10000');
  
  // Get all workers with their groups
  const [workers] = await conn.execute(`
    SELECT w.id as worker_id, w.full_name, w.group_id,
           g.daily_wage, g.work_minutes, g.minute_cost, g.late_penalty_rate, g.early_leave_penalty_rate
    FROM workers w
    LEFT JOIN \`groups\` g ON w.group_id = g.id
    WHERE w.status = 'active'
  `);
  
  console.log(`Found ${workers.length} active workers`);
  
  // Get all dates with finance records
  const [dates] = await conn.execute(
    'SELECT DISTINCT DATE_FORMAT(work_date, "%Y-%m-%d") as dt FROM worker_daily_finance ORDER BY dt'
  );
  
  console.log(`Dates to recalculate: ${dates.map(r => r.dt).join(', ')}`);
  
  for (const dateRow of dates) {
    const workDate = dateRow.dt;
    const workDateObj = new Date(workDate + 'T00:00:00');
    const dayOfWeek = workDateObj.getDay(); // 0=Sunday
    
    console.log(`\n=== Recalculating ${workDate} (day ${dayOfWeek}) ===`);
    
    // Get all finance records for this date
    const [financeRecords] = await conn.execute(
      `SELECT wdf.id, wdf.worker_id, wdf.check_in_time, wdf.check_out_time
       FROM worker_daily_finance wdf
       WHERE DATE_FORMAT(wdf.work_date, '%Y-%m-%d') = ?`,
      [workDate]
    );
    
    for (const record of financeRecords) {
      const worker = workers.find(w => w.worker_id === record.worker_id);
      if (!worker) {
        console.log(`  Worker ${record.worker_id} not found, skipping`);
        continue;
      }
      
      const groupId = worker.group_id;
      const dailyWage = parseFloat(worker.daily_wage || '0');
      const workMinutes = parseInt(worker.work_minutes || '0');
      const minuteCost = parseFloat(worker.minute_cost || '0');
      const latePenaltyRate = parseFloat(worker.late_penalty_rate || '0');
      const earlyLeavePenaltyRate = parseFloat(worker.early_leave_penalty_rate || '0');
      
      // Get schedule for this day
      const [schedules] = await conn.execute(
        `SELECT start_time, end_time FROM group_schedules 
         WHERE group_id = ? AND day_of_week = ? AND is_active = 1
         ORDER BY effective_date DESC LIMIT 1`,
        [groupId, dayOfWeek]
      );
      
      let shiftStart = null;
      let shiftEnd = null;
      
      if (schedules.length > 0) {
        shiftStart = schedules[0].start_time;
        shiftEnd = schedules[0].end_time;
      }
      
      // Get attendance events for this worker on this date
      const [events] = await conn.execute(
        `SELECT event_type, event_time FROM attendance_events 
         WHERE worker_id = ? AND DATE(event_time) = ?
         ORDER BY event_time`,
        [record.worker_id, workDate]
      );
      
      const checkInEvent = events.find(e => e.event_type === 'check_in');
      const checkOutEvent = events.find(e => e.event_type === 'check_out');
      
      if (!checkInEvent || !checkOutEvent) {
        console.log(`  Worker ${worker.full_name}: Missing check-in or check-out, skipping`);
        continue;
      }
      
      const checkInTime = new Date(checkInEvent.event_time);
      const checkOutTime = new Date(checkOutEvent.event_time);
      
      // Calculate
      let baseAmount = dailyWage; // Fixed daily wage
      let lateMinutes = 0;
      let earlyLeaveMinutes = 0;
      let workedMinutes = Math.round((checkOutTime.getTime() - checkInTime.getTime()) / 60000);
      let financialMinutes = workMinutes > 0 ? Math.min(workedMinutes, workMinutes) : workedMinutes;
      
      // If shift times are defined, calculate penalties
      if (shiftStart && shiftEnd) {
        const [startH, startM] = shiftStart.split(':').map(Number);
        const [endH, endM] = shiftEnd.split(':').map(Number);
        
        const shiftStartTime = new Date(workDateObj);
        shiftStartTime.setHours(startH, startM, 0, 0);
        
        const shiftEndTime = new Date(workDateObj);
        shiftEndTime.setHours(endH, endM, 0, 0);
        
        // Financial check-in: use shift start if arrived early
        const financialCheckIn = checkInTime < shiftStartTime ? shiftStartTime : checkInTime;
        // Financial check-out: use shift end if left late
        const financialCheckOut = checkOutTime > shiftEndTime ? shiftEndTime : checkOutTime;
        
        if (financialCheckOut > financialCheckIn) {
          financialMinutes = Math.round((financialCheckOut.getTime() - financialCheckIn.getTime()) / 60000);
          if (workMinutes > 0) {
            financialMinutes = Math.min(financialMinutes, workMinutes);
          }
        } else {
          financialMinutes = 0;
        }
        
        // Late minutes
        if (checkInTime > shiftStartTime) {
          lateMinutes = Math.round((checkInTime.getTime() - shiftStartTime.getTime()) / 60000);
        }
        
        // Early leave minutes
        if (checkOutTime < shiftEndTime) {
          earlyLeaveMinutes = Math.round((shiftEndTime.getTime() - checkOutTime.getTime()) / 60000);
        }
      }
      
      // Calculate deductions
      let latePenalty = 0;
      let earlyLeavePenalty = 0;
      
      if (minuteCost > 0) {
        // penaltyRate is stored as percentage (100 = 100% = 1x multiplier)
        if (lateMinutes > 0 && latePenaltyRate > 0) {
          latePenalty = lateMinutes * minuteCost * (latePenaltyRate / 100);
        }
        if (earlyLeaveMinutes > 0 && earlyLeavePenaltyRate > 0) {
          earlyLeavePenalty = earlyLeaveMinutes * minuteCost * (earlyLeavePenaltyRate / 100);
        }
      }
      
      const totalDeductions = Math.round((latePenalty + earlyLeavePenalty) * 100) / 100;
      const netAmount = Math.round((baseAmount - totalDeductions) * 100) / 100;
      
      console.log(`  ${worker.full_name} (${workDate}): shift=${shiftStart}-${shiftEnd}, checkIn=${checkInTime.toTimeString().slice(0,5)}, checkOut=${checkOutTime.toTimeString().slice(0,5)}`);
      console.log(`    base=${baseAmount}, late=${lateMinutes}min, early=${earlyLeaveMinutes}min, deduct=${totalDeductions}, net=${netAmount}`);
      console.log(`    workedMin=${workedMinutes}, finMin=${financialMinutes}`);
      
      // Update the record
      await conn.execute(
        `UPDATE worker_daily_finance SET 
          base_amount = ?, deductions = ?, net_amount = ?,
          base_salary = ?, late_penalty = ?, early_leave_penalty = ?, net_salary = ?,
          worked_minutes = ?, financial_minutes = ?, late_minutes = ?, early_leave_minutes = ?,
          bonuses = '0.00',
          updated_at = NOW()
         WHERE id = ?`,
        [
          baseAmount.toFixed(2), totalDeductions.toFixed(2), netAmount.toFixed(2),
          baseAmount.toFixed(2), latePenalty.toFixed(2), earlyLeavePenalty.toFixed(2), netAmount.toFixed(2),
          workedMinutes, financialMinutes, lateMinutes, earlyLeaveMinutes,
          record.id
        ]
      );
    }
  }
  
  // Show results
  console.log('\n\n=== FINAL RESULTS ===');
  const [rows] = await conn.execute(`
    SELECT w.full_name, DATE_FORMAT(wdf.work_date, '%Y-%m-%d') as work_date, 
           wdf.base_amount, wdf.deductions, wdf.net_amount, 
           wdf.worked_minutes, wdf.financial_minutes, wdf.late_minutes, wdf.early_leave_minutes,
           g.name as group_name
    FROM worker_daily_finance wdf
    JOIN workers w ON wdf.worker_id = w.id
    LEFT JOIN \`groups\` g ON w.group_id = g.id
    ORDER BY wdf.work_date, wdf.worker_id
  `);
  
  console.table(rows.map(r => ({
    name: r.full_name,
    date: r.work_date,
    base: r.base_amount,
    deduct: r.deductions,
    net: r.net_amount,
    worked: r.worked_minutes,
    financial: r.financial_minutes,
    late: r.late_minutes,
    early: r.early_leave_minutes,
    group: r.group_name
  })));
  
  await conn.end();
  console.log('\nDone!');
}

main().catch(console.error);
