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
  
  // Get all distinct dates with finance records
  const [dates] = await conn.execute(
    'SELECT DISTINCT DATE_FORMAT(work_date, "%Y-%m-%d") as dt FROM worker_daily_finance ORDER BY dt'
  );
  
  console.log('Dates to recalculate:', dates.map(r => r.dt));
  
  // For each date, call the recalculate endpoint
  const baseUrl = 'http://localhost:3000';
  
  for (const dateRow of dates) {
    const date = dateRow.dt;
    console.log(`\n=== Recalculating ${date} ===`);
    
    try {
      // Use tRPC mutation endpoint directly
      const response = await fetch(`${baseUrl}/api/trpc/attendance.recalculateDailyFinance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          json: { date }
        }),
      });
      
      const result = await response.json();
      if (result.error) {
        console.log(`Error for ${date}:`, result.error.message || JSON.stringify(result.error));
      } else {
        console.log(`Success for ${date}:`, JSON.stringify(result.result?.data?.json || result));
      }
    } catch (error) {
      console.error(`Failed for ${date}:`, error.message);
    }
  }
  
  // Now check the results
  console.log('\n\n=== RESULTS AFTER RECALCULATION ===');
  const [rows] = await conn.execute(`
    SELECT w.full_name, DATE_FORMAT(wdf.work_date, '%Y-%m-%d') as work_date, 
           wdf.base_amount, wdf.deductions, wdf.net_amount, 
           wdf.worked_minutes, wdf.financial_minutes, wdf.late_minutes, wdf.early_leave_minutes,
           g.name as group_name, g.daily_wage, g.work_minutes
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
    worked_min: r.worked_minutes,
    fin_min: r.financial_minutes,
    late: r.late_minutes,
    early: r.early_leave_minutes,
    group: r.group_name,
    daily_wage: r.daily_wage,
    work_min: r.work_minutes
  })));
  
  await conn.end();
}

main().catch(console.error);
