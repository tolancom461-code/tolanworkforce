import { createConnection } from 'mysql2/promise';
import bcrypt from 'bcrypt';

const connection = await createConnection({
  host: process.env.DATABASE_HOST || 'localhost',
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'tolanworkforce',
});

console.log('🔍 فحص نظام التشفير والمصادقة...\n');

// 1. فحص جميع المستخدمين
const [users] = await connection.execute(
  'SELECT id, username, email, password_hash FROM users LIMIT 10'
);

console.log('📋 المستخدمين الموجودين:');
for (const user of users) {
  console.log(`\n👤 ${user.username} (${user.email})`);
  console.log(`   Hash: ${user.password_hash ? user.password_hash.substring(0, 30) + '...' : 'NULL'}`);
  
  if (user.password_hash) {
    // اختبار كلمات سر شائعة
    const testPasswords = ['admin123', 'admin11', '123456', 'password'];
    for (const pwd of testPasswords) {
      try {
        const isValid = await bcrypt.compare(pwd, user.password_hash);
        if (isValid) {
          console.log(`   ✅ كلمة السر الصحيحة: "${pwd}"`);
          break;
        }
      } catch (e) {
        console.log(`   ❌ خطأ في التحقق من "${pwd}": ${e.message}`);
      }
    }
  }
}

// 2. اختبار التشفير
console.log('\n\n🔐 اختبار التشفير:');
const testPassword = 'test123';
const hash = await bcrypt.hash(testPassword, 10);
console.log(`كلمة السر: ${testPassword}`);
console.log(`Hash: ${hash}`);
const isValid = await bcrypt.compare(testPassword, hash);
console.log(`التحقق: ${isValid ? '✅ نجح' : '❌ فشل'}`);

await connection.end();
