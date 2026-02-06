import { createConnection } from 'mysql2/promise';
import bcrypt from 'bcrypt';

const connection = await createConnection({
  host: process.env.DATABASE_HOST || 'localhost',
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'tolanworkforce',
  ssl: 'Amazon RDS' in (process.env.DATABASE_URL || '') ? { rejectUnauthorized: false } : undefined,
});

// Hash the password with bcrypt
const password = 'admin11';
const hash = await bcrypt.hash(password, 10);

console.log(`✅ Password hash created: ${hash}`);

// Insert the new user
const [result] = await connection.execute(
  'INSERT INTO users (username, full_name, email, password_hash, role, is_active, createdAt, updatedAt, lastSignedIn) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())',
  ['admin1', 'Admin One', 'admin1@tolanworkforce.com', hash, 'admin', true]
);

console.log(`✅ تم إنشاء المستخدم admin1 بنجاح`);
console.log(`عدد الصفوف المضافة: ${result.affectedRows}`);

await connection.end();
