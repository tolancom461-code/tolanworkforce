import postgres from 'postgres';

const url = process.env.SUPABASE_DB_URL;
console.log('Testing connection to:', url?.substring(0, 50) + '...');

const sql = postgres(url, {
  max: 1,
  connect_timeout: 10,
});

try {
  console.log('Attempting to connect...');
  const result = await sql`SELECT 1 as test`;
  console.log('✅ Connection successful!', result);
  process.exit(0);
} catch (e) {
  console.error('❌ Connection failed:', e.message);
  process.exit(1);
} finally {
  await sql.end();
}
