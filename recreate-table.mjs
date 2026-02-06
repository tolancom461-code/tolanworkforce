import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

async function recreateTable() {
  console.log('🚀 Starting table recreation...');
  
  try {
    // Parse DATABASE_URL
    const dbUrl = process.env.DATABASE_URL;
    const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
    
    if (!match) {
      throw new Error('Invalid DATABASE_URL format');
    }
    
    const [, user, password, host, port, database] = match;
    
    console.log(`📡 Connecting to ${host}...`);
    
    const connection = await mysql.createConnection({
      host,
      port: parseInt(port),
      user,
      password,
      database,
      ssl: { rejectUnauthorized: true }
    });
    
    console.log('✅ Connected!');
    
    // Read SQL file
    const sql = readFileSync('/home/ubuntu/tolanworkforce/recreate-table.sql', 'utf8');
    const statements = sql.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`\n📝 Executing: ${statement.trim().substring(0, 50)}...`);
        await connection.execute(statement);
        console.log('✅ Success!');
      }
    }
    
    await connection.end();
    console.log('\n🎉 Table recreated successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

recreateTable();
