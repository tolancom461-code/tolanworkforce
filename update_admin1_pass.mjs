import { createConnection } from 'mysql2/promise';
import crypto from 'crypto';

const connection = await createConnection({
  host: process.env.DATABASE_HOST || 'localhost',
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'tolanworkforce',
  ssl: 'Amazon RDS' in (process.env.DATABASE_URL || '') ? { rejectUnauthorized: false } : undefined,
});

// Hash the password
const password = 'admin11';
const hash = crypto.createHash('sha256').update(password).digest('hex');

// Update the user
const [result] = await connection.execute(
  'UPDATE users SET password_hash = ? WHERE username = ?',
  [hash, 'admin1']
);

console.log(`✅ تم تحديث كلمة السر للمستخدم admin1`);
console.log(`عدد الصفوف المتأثرة: ${result.affectedRows}`);

await connection.end();
