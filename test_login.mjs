import postgres from 'postgres';
import bcryptjs from 'bcryptjs';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const urlObj = new URL(supabaseUrl);
const host = urlObj.hostname;
const connectionString = `postgresql://postgres:${supabaseServiceKey}@${host}:5432/postgres?sslmode=require`;

console.log('Connecting to:', connectionString.replace(supabaseServiceKey, '***'));

const sql = postgres(connectionString);

try {
  // Get admin user
  const user = await sql`SELECT * FROM users WHERE username = 'admin' LIMIT 1;`;
  
  if (!user || user.length === 0) {
    console.log('❌ User not found');
    process.exit(1);
  }
  
  console.log('✅ User found:', {
    id: user[0].id,
    username: user[0].username,
    email: user[0].email,
    role: user[0].role,
    hasPasswordHash: !!user[0].password_hash,
  });
  
  // Test password verification
  const password = 'ADMIN1';
  const passwordHash = user[0].password_hash;
  
  if (!passwordHash) {
    console.log('❌ No password hash found');
    process.exit(1);
  }
  
  const match = await bcryptjs.compare(password, passwordHash);
  console.log(`✅ Password verification: ${match ? 'SUCCESS' : 'FAILED'}`);
  
  await sql.end();
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
