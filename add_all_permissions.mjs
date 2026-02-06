import { createConnection } from 'mysql2/promise';

const connection = await createConnection({
  host: process.env.DATABASE_HOST || 'localhost',
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'tolanworkforce',
  ssl: { rejectUnauthorized: false },
});

// Get admin role
const [roles] = await connection.execute('SELECT id FROM roles WHERE code = ?', ['admin']);
if (roles.length === 0) {
  console.log('❌ دور admin غير موجود');
  process.exit(1);
}

const adminRoleId = roles[0].id;
console.log(`✅ دور admin ID: ${adminRoleId}`);

// Get all permissions
const [permissions] = await connection.execute('SELECT id, code FROM permissions');
console.log(`✅ إجمالي الصلاحيات: ${permissions.length}`);

// Get existing role permissions
const [existing] = await connection.execute('SELECT permission_id FROM role_permissions WHERE role_id = ?', [adminRoleId]);
const existingIds = new Set(existing.map(e => e.permission_id));

console.log(`✅ الصلاحيات الموجودة حالياً: ${existingIds.size}`);

// Add missing permissions
let added = 0;
for (const perm of permissions) {
  if (!existingIds.has(perm.id)) {
    await connection.execute(
      'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
      [adminRoleId, perm.id]
    );
    added++;
    console.log(`✅ تم إضافة: ${perm.code}`);
  }
}

console.log(`\n✅ تم إضافة ${added} صلاحية جديدة`);
console.log(`✅ إجمالي الصلاحيات الآن: ${existingIds.size + added}`);

await connection.end();
