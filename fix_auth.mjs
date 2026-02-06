import { createConnection } from 'mysql2/promise';
import bcrypt from 'bcrypt';

const connection = await createConnection({
  host: process.env.DATABASE_HOST || 'localhost',
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'tolanworkforce',
});

console.log('🔧 إصلاح نظام التشفير...\n');

// 1. حذف جميع المستخدمين (اختياري)
console.log('1️⃣ حذف المستخدمين القدماء...');
await connection.execute('DELETE FROM users WHERE username IN (?, ?, ?)', ['admin1', 'RADMAN', 'test']);

// 2. إنشاء مستخدمين جدد بكلمات سر صحيحة
const users = [
  { username: 'RADMAN', password: 'admin123', email: 'radman@tolanworkforce.com', fullName: 'RADMAN' },
  { username: 'admin1', password: 'admin11', email: 'admin1@tolanworkforce.com', fullName: 'Admin One' },
  { username: 'test', password: 'test123', email: 'test@tolanworkforce.com', fullName: 'Test User' },
];

console.log('\n2️⃣ إنشاء مستخدمين جدد...');
for (const user of users) {
  const hash = await bcrypt.hash(user.password, 10);
  console.log(`\n👤 ${user.username}`);
  console.log(`   كلمة السر: ${user.password}`);
  console.log(`   Hash: ${hash.substring(0, 30)}...`);
  
  // التحقق من التشفير
  const isValid = await bcrypt.compare(user.password, hash);
  console.log(`   التحقق: ${isValid ? '✅ نجح' : '❌ فشل'}`);
  
  // إدراج المستخدم
  await connection.execute(
    'INSERT INTO users (username, email, full_name, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, ?)',
    [user.username, user.email, user.fullName, hash, 'admin', 1]
  );
  console.log(`   ✅ تم الإدراج`);
}

// 3. التحقق من المستخدمين الجدد
console.log('\n\n3️⃣ التحقق من المستخدمين الجدد...');
const [newUsers] = await connection.execute('SELECT username, email, password_hash FROM users WHERE username IN (?, ?, ?)', ['RADMAN', 'admin1', 'test']);

for (const user of newUsers) {
  console.log(`\n👤 ${user.username} (${user.email})`);
  
  // اختبار كلمات السر
  const testPassword = user.username === 'RADMAN' ? 'admin123' : user.username === 'admin1' ? 'admin11' : 'test123';
  const isValid = await bcrypt.compare(testPassword, user.password_hash);
  console.log(`   كلمة السر "${testPassword}": ${isValid ? '✅ صحيحة' : '❌ خاطئة'}`);
}

await connection.end();
console.log('\n✅ تم إصلاح نظام التشفير بنجاح!');
