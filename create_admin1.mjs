import bcrypt from 'bcrypt';
import { createConnection } from 'mysql2/promise';

const connection = await createConnection({
  host: process.env.DATABASE_HOST || 'localhost',
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'tolanworkforce',
});

// حذف المستخدم إذا كان موجوداً
await connection.execute('DELETE FROM users WHERE username = ?', ['admin1']);

// إنشاء hash للكلمة
const passwordHash = await bcrypt.hash('admin11', 10);

// إدراج المستخدم الجديد
const result = await connection.execute(
  `INSERT INTO users (username, email, full_name, role, password_hash, is_active, created_at, updated_at) 
   VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
  ['admin1', 'admin1@tolanworkforce.com', 'Admin One', 'admin', passwordHash, true]
);

console.log('✅ تم إنشاء المستخدم admin1 بنجاح');
console.log(`ID: ${result[0].insertId}`);
console.log(`Username: admin1`);
console.log(`Password: admin11`);

await connection.end();
