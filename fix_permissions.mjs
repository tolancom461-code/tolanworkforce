import { drizzle } from 'drizzle-orm/mysql2/driver';
import mysql from 'mysql2/promise';
import * as schema from './drizzle/schema.ts';

// Parse DATABASE_URL
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const url = new URL(dbUrl);
const config = {
  host: url.hostname,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
};

const connection = await mysql.createConnection(config);
const db = drizzle(connection, { schema });

try {
  // Get user RADMAN
  const radman = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.username, 'RADMAN'),
  });

  if (!radman) {
    console.log('❌ المستخدم RADMAN غير موجود');
    process.exit(1);
  }

  console.log('✅ المستخدم RADMAN:');
  console.log(`  ID: ${radman.id}`);
  console.log(`  Username: ${radman.username}`);
  console.log(`  Role: ${radman.role}`);

  // Get the admin role
  const adminRole = await db.query.roles.findFirst({
    where: (roles, { eq }) => eq(roles.code, radman.role),
  });

  if (!adminRole) {
    console.log('❌ الدور غير موجود');
    process.exit(1);
  }

  console.log(`\n✅ الدور: ${adminRole.name}`);

  // Get all permissions
  const allPermissions = await db.query.permissions.findMany();
  console.log(`✅ إجمالي الصلاحيات: ${allPermissions.length}`);

  // Get role permissions
  const rolePermissions = await db.query.rolePermissions.findMany({
    where: (rp, { eq }) => eq(rp.roleId, adminRole.id),
  });

  console.log(`✅ صلاحيات الدور الحالية: ${rolePermissions.length}`);

  if (rolePermissions.length < allPermissions.length) {
    console.log('\n⚠️ الدور لا يملك جميع الصلاحيات!');
    console.log('سأقوم بإضافة جميع الصلاحيات للدور...\n');

    for (const perm of allPermissions) {
      const exists = rolePermissions.find(rp => rp.permissionId === perm.id);
      if (!exists) {
        await db.insert(schema.rolePermissions).values({
          roleId: adminRole.id,
          permissionId: perm.id,
        });
        console.log(`✅ تم إضافة الصلاحية: ${perm.code}`);
      }
    }
    console.log('\n✅ تم إضافة جميع الصلاحيات بنجاح!');
  } else {
    console.log('\n✅ الدور يملك جميع الصلاحيات بالفعل!');
  }
} finally {
  await connection.end();
}
