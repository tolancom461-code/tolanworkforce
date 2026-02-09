import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  try {
    console.log('Connecting to database...');
    const connection = await mysql.createConnection({
      uri: process.env.SUPABASE_DB_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    console.log('\n=== 1. Checking groups table ===');
    const [groups] = await connection.execute(
      'SELECT id, name, code, daily_wage, work_minutes, late_penalty_rate, early_leave_penalty_rate FROM groups WHERE code = "GRP02"'
    );
    console.log('Cleaning Group (GRP02):', JSON.stringify(groups, null, 2));
    
    if (groups.length === 0) {
      console.log('ERROR: No cleaning group found!');
      await connection.end();
      return;
    }
    
    const groupId = groups[0].id;
    
    console.log('\n=== 2. Checking workers in cleaning group ===');
    const [workers] = await connection.execute(
      'SELECT id, name, code, group_id FROM workers WHERE group_id = ?',
      [groupId]
    );
    console.log('Workers count:', workers.length);
    console.log('Workers:', JSON.stringify(workers, null, 2));
    
    console.log('\n=== 3. Checking attendance for 2026-02-02 ===');
    const [attendance] = await connection.execute(
      'SELECT worker_id, event_type, event_time FROM attendance_events WHERE DATE(event_time) = "2026-02-02" ORDER BY worker_id, event_time'
    );
    console.log('Attendance events count:', attendance.length);
    console.log('Attendance events:', JSON.stringify(attendance, null, 2));
    
    console.log('\n=== 4. Checking worker_daily_finance for 2026-02-02 ===');
    const [finance] = await connection.execute(
      'SELECT worker_id, work_date, base_amount, deductions, bonuses, net_amount, late_minutes, early_leave_minutes FROM worker_daily_finance WHERE work_date = "2026-02-02"'
    );
    console.log('Daily finance records count:', finance.length);
    console.log('Daily finance records:', JSON.stringify(finance, null, 2));
    
    console.log('\n=== 5. Checking payroll batches for cleaning group ===');
    const [batches] = await connection.execute(
      'SELECT id, batch_code, period_start, period_end, group_id, total_amount, total_workers FROM payroll_batches WHERE group_id = ? ORDER BY created_at DESC LIMIT 1',
      [groupId]
    );
    console.log('Latest payroll batch:', JSON.stringify(batches, null, 2));
    
    if (batches.length > 0) {
      console.log('\n=== 6. Checking payroll batch items ===');
      const [items] = await connection.execute(
        'SELECT worker_id, days_worked, base_amount, total_deductions, total_bonuses, net_amount FROM payroll_batch_items WHERE batch_id = ?',
        [batches[0].id]
      );
      console.log('Batch items:', JSON.stringify(items, null, 2));
    }
    
    await connection.end();
    console.log('\n=== Done ===');
  } catch (error) {
    console.error('Error:', error);
  }
})();
