import { createConnection } from 'mysql2/promise';

const connection = await createConnection({
  host: process.env.DATABASE_HOST || 'localhost',
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'tolanworkforce',
});

// Get user RADMAN
const [users] = await connection.execute(
  'SELECT id, username, role FROM users WHERE username = ?',
  ['RADMAN']
);

if (users.length === 0) {
  console.log('❌ المستخدم RADMAN غير موجود');
  process.exit(1);
}

const user = users[0];
console.log('✅ المستخدم RADMAN:');
console.log(`  ID: ${user.id}`);
console.log(`  Username: ${user.username}`);
console.log(`  Role: ${user.role}`);

// Get role permissions
const [rolePerms] = await connection.execute(
  `SELECT rp.id, p.code, p.name FROM role_permissions rp 
   JOIN roles r ON rp.role_id = r.id 
   JOIN permissions p ON rp.permission_id = p.id 
   WHERE r.code = ?`,
  [user.role]
);

console.log(`\n✅ عدد الصلاحيات للدور "${user.role}": ${rolePerms.length}`);

// Get all permissions
const [allPerms] = await connection.execute(
  'SELECT id, code, name FROM permissions'
);

console.log(`✅ إجمالي الصلاحيات في النظام: ${allPerms.length}`);

if (rolePerms.length < allPerms.length) {
  console.log('\n⚠️ الدور لا يملك جميع الصلاحيات!');
  console.log('سأقوم بإضافة جميع الصلاحيات للدور...\n');
  
  for (const perm of allPerms) {
    const exists = rolePerms.find(rp => rp.code === perm.code);
    if (!exists) {
      await connection.execute(
        'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        [user.id, perm.id]
      );
      console.log(`✅ تم إضافة الصلاحية: ${perm.code}`);
    }
  }
} else {
  console.log('\n✅ الدور يملك جميع الصلاحيات!');
}

await connection.end();
