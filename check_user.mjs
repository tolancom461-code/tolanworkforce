import { createConnection } from 'mysql2/promise';

const connection = await createConnection({
  host: process.env.DATABASE_HOST || 'localhost',
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'tolanworkforce',
});

const [users] = await connection.execute('SELECT id, username, email, role, password_hash FROM users WHERE username = ?', ['admin1']);

console.log('User data:');
console.log(JSON.stringify(users, null, 2));

if (users.length > 0) {
  console.log(`\nPassword hash exists: ${!!users[0].password_hash}`);
  console.log(`Password hash length: ${users[0].password_hash?.length || 0}`);
}

await connection.end();
