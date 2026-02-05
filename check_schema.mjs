import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

try {
  const result = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'users'
    ORDER BY ordinal_position;
  `;
  
  console.log('Columns in users table:');
  result.forEach(col => {
    console.log(`  - ${col.column_name}: ${col.data_type}`);
  });
  
  // Get admin user data
  const user = await sql`SELECT * FROM users WHERE username = 'admin' LIMIT 1;`;
  console.log('\nAdmin user data:');
  console.log(JSON.stringify(user[0], null, 2));
  
  await sql.end();
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
