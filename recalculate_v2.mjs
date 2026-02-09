import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const url = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!url) { console.error('No DATABASE_URL'); process.exit(1); }
  
  const conn = await mysql.createConnection(url + '&connectTimeout=10000');
  
  // Get all finance records with worker/group data
  const [records] = await conn.execute(`
    SELECT wdf.id, wdf.worker_id, wdf.work_date, wdf.check_in_time, wdf.check_out_time,
           w.full_name, w.group_id, w.daily_rate as worker_daily_rate,
           g.daily_wage, g.work_minutes, g.minute_cost, g.late_penalty_rate, g.early_leave_penalty_rate
    FROM worker_daily_finance wdf
    JOIN workers w ON wdf.worker_id = w.id
    LEFT JOIN \`groups\` g ON w.group_id = g.id
    ORDER BY wdf.work_date, wdf.worker_id
  `);
  
  console.log(`Found ${records.length} finance records to recalculate\n`);
  
  for (const rec of records) {
    const workDate = new Date(rec.work_date);
    const workDateStr = workDate.toISOString().split('T')[0];
    const dayOfWeek = workDate.getDay();
    
    const dailyWage = parseFloat(rec.daily_wage || '0');
    const workMinutes = parseInt(rec.work_minutes || '0');
    const minuteCost = parseFloat(rec.minute_cost || '0');
    const latePenaltyRate = parseFloat(rec.late_penalty_rate || '0');
    const earlyLeavePenaltyRate = parseFloat(rec.early_leave_penalty_rate || '0');
    const workerDailyRate = parseFloat(rec.worker_daily_rate || '0');
    
    // Base salary = fixed daily wage
    let baseSalary = dailyWage > 0 ? dailyWage : workerDailyRate;
    
    if (!rec.check_in_time || !rec.check_out_time) {
      console.log(`  ${rec.full_name} (${workDateStr}): Missing check-in/out, setting to 0`);
      await conn.execute(
        `UPDATE worker_daily_finance SET base_amount='0', deductions='0', net_amount='0',
         base_salary='0', late_penalty='0', early_leave_penalty='0', net_salary='0',
         worked_minutes=0, financial_minutes=0, late_minutes=0, early_leave_minutes=0, updated_at=NOW()
         WHERE id=?`, [rec.id]
      );
      continue;
    }
    
    const checkInTime = new Date(rec.check_in_time);
    const checkOutTime = new Date(rec.check_out_time);
    const rawWorkedMinutes = Math.round((checkOutTime.getTime() - checkInTime.getTime()) / 60000);
    
    // Get shift from group_schedules
    const [schedules] = await conn.execute(
      `SELECT start_time, end_time FROM group_schedules 
       WHERE group_id = ? AND day_of_week = ? AND is_active = 1
       AND (effective_date IS NULL OR effective_date <= ?)
       ORDER BY effective_date DESC LIMIT 1`,
      [rec.group_id, dayOfWeek, workDateStr]
    );
    
    let lateMinutes = 0;
    let earlyLeaveMinutes = 0;
    let financialMinutes = workMinutes > 0 ? Math.min(rawWorkedMinutes, workMinutes) : rawWorkedMinutes;
    let latePenalty = 0;
    let earlyLeavePenalty = 0;
    
    if (schedules.length > 0) {
      // ✅ SHIFT DEFINED: Calculate penalties based on shift times
      const shiftStartStr = schedules[0].start_time;
      const shiftEndStr = schedules[0].end_time;
      const [startH, startM] = shiftStartStr.split(':').map(Number);
      const [endH, endM] = shiftEndStr.split(':').map(Number);
      
      const shiftStart = new Date(workDate);
      shiftStart.setHours(startH, startM, 0, 0);
      
      const shiftEnd = new Date(workDate);
      shiftEnd.setHours(endH, endM, 0, 0);
      
      // Financial boundaries
      const financialCheckIn = checkInTime < shiftStart ? shiftStart : checkInTime;
      const financialCheckOut = checkOutTime > shiftEnd ? shiftEnd : checkOutTime;
      
      if (financialCheckOut > financialCheckIn) {
        financialMinutes = Math.round((financialCheckOut.getTime() - financialCheckIn.getTime()) / 60000);
        if (workMinutes > 0) financialMinutes = Math.min(financialMinutes, workMinutes);
      } else {
        financialMinutes = 0;
      }
      
      // Late: only if checked in AFTER shift start
      if (checkInTime > shiftStart) {
        lateMinutes = Math.round((checkInTime.getTime() - shiftStart.getTime()) / 60000);
      }
      
      // Early leave: only if checked out BEFORE shift end
      if (checkOutTime < shiftEnd) {
        earlyLeaveMinutes = Math.round((shiftEnd.getTime() - checkOutTime.getTime()) / 60000);
      }
      
      // Penalties (percentage-based)
      if (minuteCost > 0) {
        if (lateMinutes > 0 && latePenaltyRate > 0) {
          latePenalty = lateMinutes * minuteCost * (latePenaltyRate / 100);
        }
        if (earlyLeaveMinutes > 0 && earlyLeavePenaltyRate > 0) {
          earlyLeavePenalty = earlyLeaveMinutes * minuteCost * (earlyLeavePenaltyRate / 100);
        }
      }
      
      console.log(`  ${rec.full_name} (${workDateStr}): shift=${shiftStartStr}-${shiftEndStr}`);
      console.log(`    checkIn=${checkInTime.toTimeString().slice(0,5)}, checkOut=${checkOutTime.toTimeString().slice(0,5)}`);
      console.log(`    late=${lateMinutes}min, early=${earlyLeaveMinutes}min`);
    } else {
      // ❌ NO SHIFT: No penalties, worker gets full daily wage
      console.log(`  ${rec.full_name} (${workDateStr}): NO SHIFT DEFINED - no penalties`);
    }
    
    // CAP: Deductions cannot exceed base salary (net >= 0)
    let totalDeductions = Math.round((latePenalty + earlyLeavePenalty) * 100) / 100;
    if (totalDeductions > baseSalary) {
      const scale = baseSalary / totalDeductions;
      latePenalty = Math.round(latePenalty * scale * 100) / 100;
      earlyLeavePenalty = Math.round(earlyLeavePenalty * scale * 100) / 100;
      totalDeductions = baseSalary;
      console.log(`    ⚠️ CAPPED deductions to ${baseSalary} (was ${totalDeductions})`);
    }
    
    const netSalary = Math.round((baseSalary - totalDeductions) * 100) / 100;
    
    console.log(`    base=${baseSalary}, deduct=${totalDeductions}, net=${netSalary}`);
    console.log(`    workedMin=${rawWorkedMinutes}, finMin=${financialMinutes}`);
    
    // Update record
    await conn.execute(
      `UPDATE worker_daily_finance SET 
        base_amount=?, deductions=?, net_amount=?,
        base_salary=?, late_penalty=?, early_leave_penalty=?, net_salary=?,
        worked_minutes=?, financial_minutes=?, late_minutes=?, early_leave_minutes=?,
        bonuses='0.00', updated_at=NOW()
       WHERE id=?`,
      [
        baseSalary.toFixed(2), totalDeductions.toFixed(2), netSalary.toFixed(2),
        baseSalary.toFixed(2), latePenalty.toFixed(2), earlyLeavePenalty.toFixed(2), netSalary.toFixed(2),
        rawWorkedMinutes, financialMinutes, lateMinutes, earlyLeaveMinutes,
        rec.id
      ]
    );
  }
  
  // Show final results
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
  console.log('\n✅ Done!');
}

main().catch(console.error);
