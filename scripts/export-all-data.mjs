/**
 * Export all data from TolanWorkforce database as SQL INSERT statements
 * Usage: DATABASE_URL=... node scripts/export-all-data.mjs
 */
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

// Parse DATABASE_URL
const url = new URL(DATABASE_URL);
const config = {
  host: url.hostname,
  port: parseInt(url.port) || 4000,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: true },
};

// Tables in dependency order (parents first)
const TABLES_ORDER = [
  'cost_centers',
  'users',
  'user_cost_centers',
  'groups',
  'workers',
  'worker_archive',
  'work_days',
  'attendance_events',
  'deduction_rules',
  'pay_overrides',
  'payroll_batches',
  'payroll_batch_items',
  'payroll_batch_notes',
  'payroll_batch_corrections',
  'worker_daily_finance',
  'audit_log',
  'operational_flags',
  'group_schedules',
];

function escapeValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val.toString();
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (val instanceof Date) {
    return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
  }
  // Escape string
  const escaped = String(val)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
  return `'${escaped}'`;
}

async function main() {
  const conn = await mysql.createConnection(config);
  const outputPath = path.resolve('scripts/full-data-export.sql');
  let sql = '';

  sql += '-- ================================================\n';
  sql += '-- TolanWorkforce - Full Database Export\n';
  sql += `-- Generated: ${new Date().toISOString()}\n`;
  sql += '-- ================================================\n\n';
  sql += 'SET FOREIGN_KEY_CHECKS = 0;\n';
  sql += 'SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";\n\n';

  for (const table of TABLES_ORDER) {
    console.log(`Exporting ${table}...`);
    
    // Get table structure
    const [createResult] = await conn.query(`SHOW CREATE TABLE \`${table}\``);
    const createStatement = createResult[0]['Create Table'];
    
    sql += `-- ------------------------------------------------\n`;
    sql += `-- Table: ${table}\n`;
    sql += `-- ------------------------------------------------\n`;
    sql += `DROP TABLE IF EXISTS \`${table}\`;\n`;
    sql += createStatement + ';\n\n';
    
    // Get data
    const [rows] = await conn.query(`SELECT * FROM \`${table}\``);
    
    if (rows.length > 0) {
      const columns = Object.keys(rows[0]);
      const colList = columns.map(c => `\`${c}\``).join(', ');
      
      // Batch inserts (100 rows per INSERT)
      for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100);
        sql += `INSERT INTO \`${table}\` (${colList}) VALUES\n`;
        const values = batch.map(row => {
          const vals = columns.map(c => escapeValue(row[c])).join(', ');
          return `  (${vals})`;
        });
        sql += values.join(',\n') + ';\n\n';
      }
    }
    
    console.log(`  → ${rows.length} rows exported`);
  }

  sql += '\nSET FOREIGN_KEY_CHECKS = 1;\n';
  sql += '\n-- End of export\n';

  fs.writeFileSync(outputPath, sql, 'utf8');
  console.log(`\nExport complete: ${outputPath}`);
  console.log(`File size: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);

  await conn.end();
}

main().catch(err => {
  console.error('Export failed:', err);
  process.exit(1);
});
