import { createConnection } from 'mysql2/promise';
import bcrypt from 'bcrypt';

const connection = await createConnection({
  host: process.env.DATABASE_HOST || 'localhost',
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'tolanworkforce',
});

// البحث عن المستخدم
const [users] = await connection.execute(
  'SELECT id, username, email, password_hash FROM users WHERE username = ?',
  ['admin1']
);

if (users.length === 0) {
  console.log('❌ المستخدم admin1 غير موجود');
} else {
  const user = users[0];
  console.log('✅ المستخدم موجود:');
  console.log(`ID: ${user.id}`);
  console.log(`Username: ${user.username}`);
  console.log(`Email: ${user.email}`);
  console.log(`Password Hash: ${user.password_hash}`);
  
  // اختبار كلمة السر
  const isValid = await bcrypt.compare('admin11', user.password_hash);
  console.log(`\nاختبار كلمة السر "admin11": ${isValid ? '✅ صحيحة' : '❌ خاطئة'}`);
}

await connection.end();
