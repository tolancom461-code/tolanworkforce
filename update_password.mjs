import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';

// Parse DATABASE_URL
const dbUrl = process.env.DATABASE_URL;
const url = new URL(dbUrl);

const connection = await mysql.createConnection({
  host: url.hostname,
  port: url.port,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: {
    rejectUnauthorized: false,
  },
});

const newPassword = 'admin123';
const hashedPassword = await bcrypt.hash(newPassword, 10);

const [result] = await connection.execute(
  'UPDATE users SET password_hash = ? WHERE username = ?',
  [hashedPassword, 'RADMAN']
);

console.log(`✅ تم تحديث كلمة السر للمستخدم RADMAN`);
console.log(`الصفوف المتأثرة: ${result.affectedRows}`);
console.log(`كلمة السر الجديدة: admin123`);

await connection.end();
