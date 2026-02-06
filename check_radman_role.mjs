import { createConnection } from 'mysql2/promise';

const connection = await createConnection({
  host: process.env.DATABASE_HOST || 'localhost',
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'tolanworkforce',
});

const [users] = await connection.execute(
  'SELECT id, username, email, role, is_active FROM users WHERE username = ?',
  ['RADMAN']
);

if (users.length === 0) {
  console.log('❌ المستخدم RADMAN غير موجود');
} else {
  const user = users[0];
  console.log('✅ بيانات المستخدم RADMAN:');
  console.log(`ID: ${user.id}`);
  console.log(`Username: ${user.username}`);
  console.log(`Email: ${user.email}`);
  console.log(`Role: ${user.role}`);
  console.log(`Is Active: ${user.is_active}`);
  
  if (user.role !== 'admin') {
    console.log('\n⚠️ الدور ليس "admin"! سأقوم بتحديثه...');
    await connection.execute(
      'UPDATE users SET role = ? WHERE id = ?',
      ['admin', user.id]
    );
    console.log('✅ تم تحديث الدور إلى "admin"');
  } else {
    console.log('\n✅ الدور صحيح: admin');
  }
}

await connection.end();
