import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './drizzle/schema.js';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

async function seed() {
  console.log('🌱 Seeding scoped permissions...');

  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection, { schema, mode: 'default' });

  try {
    // Get users
    const users = await db.select().from(schema.users);
    if (users.length === 0) {
      console.log('⚠️  No users found. Please create users first.');
      return;
    }

    // Get groups
    const groups = await db.select().from(schema.workGroups);
    if (groups.length === 0) {
      console.log('⚠️  No work groups found. Please create groups first.');
      return;
    }

    // Get cost centers
    const costCenters = await db.select().from(schema.costCenters);

    console.log(`Found ${users.length} users, ${groups.length} groups, ${costCenters.length} cost centers`);

    // Clear existing scoped permissions
    await connection.execute('DELETE FROM user_permissions');
    console.log('✅ Cleared existing scoped permissions');

    // Example 1: User 1 - Full access to group 1, view-only to group 2
    if (users.length >= 1 && groups.length >= 1) {
      const user1 = users[0];
      const group1 = groups[0];
      
      await db.insert(schema.userPermissions).values([
        {
          userId: user1.id,
          permission: 'view',
          scopeType: 'work_group',
          scopeId: String(group1.id),
          grantedBy: user1.id,
          grantedAt: new Date(),
        },
        {
          userId: user1.id,
          permission: 'create',
          scopeType: 'work_group',
          scopeId: String(group1.id),
          grantedBy: user1.id,
          grantedAt: new Date(),
        },
        {
          userId: user1.id,
          permission: 'update',
          scopeType: 'work_group',
          scopeId: String(group1.id),
          grantedBy: user1.id,
          grantedAt: new Date(),
        },
        {
          userId: user1.id,
          permission: 'delete',
          scopeType: 'work_group',
          scopeId: String(group1.id),
          grantedBy: user1.id,
          grantedAt: new Date(),
        },
      ]);

      console.log(`✅ Granted full access to ${user1.fullName} on group "${group1.name}"`);
    }

    // Example 2: User 2 - View-only access to group 2
    if (users.length >= 2 && groups.length >= 2) {
      const user2 = users[1];
      const group2 = groups[1];
      
      await db.insert(schema.userPermissions).values([
        {
          userId: user2.id,
          permission: 'view',
          scopeType: 'work_group',
          scopeId: String(group2.id),
          grantedBy: users[0].id,
          grantedAt: new Date(),
        },
      ]);

      console.log(`✅ Granted view-only access to ${user2.fullName} on group "${group2.name}"`);
    }

    // Example 3: User 1 - Cost center permissions
    if (users.length >= 1 && costCenters.length >= 1) {
      const user1 = users[0];
      const costCenter1 = costCenters[0];
      
      await db.insert(schema.userPermissions).values([
        {
          userId: user1.id,
          permission: 'view',
          scopeType: 'cost_center',
          scopeId: String(costCenter1.id),
          grantedBy: user1.id,
          grantedAt: new Date(),
        },
        {
          userId: user1.id,
          permission: 'export',
          scopeType: 'cost_center',
          scopeId: String(costCenter1.id),
          grantedBy: user1.id,
          grantedAt: new Date(),
        },
      ]);

      console.log(`✅ Granted view+export access to ${user1.fullName} on cost center "${costCenter1.name}"`);
    }

    // Example 4: User 2 - Payroll period permissions
    if (users.length >= 2) {
      const user2 = users[1];
      
      await db.insert(schema.userPermissions).values([
        {
          userId: user2.id,
          permission: 'view',
          scopeType: 'payroll_period',
          scopeId: '2026-01',
          grantedBy: users[0].id,
          grantedAt: new Date(),
        },
        {
          userId: user2.id,
          permission: 'create',
          scopeType: 'payroll_period',
          scopeId: '2026-01',
          grantedBy: users[0].id,
          grantedAt: new Date(),
        },
      ]);

      console.log(`✅ Granted view+create access to ${user2.fullName} on payroll period "2026-01"`);
    }

    console.log('\n🎉 Seeding completed successfully!');
    console.log('\n📊 Summary:');
    const allPermissions = await db.select().from(schema.userPermissions);
    console.log(`   Total scoped permissions: ${allPermissions.length}`);
    
    // Group by user
    const permissionsByUser = allPermissions.reduce((acc, perm) => {
      if (!acc[perm.userId]) acc[perm.userId] = [];
      acc[perm.userId].push(perm);
      return acc;
    }, {});

    for (const [userId, perms] of Object.entries(permissionsByUser)) {
      const user = users.find(u => u.id === Number(userId));
      console.log(`   ${user?.fullName}: ${perms.length} permissions`);
    }

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

seed()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
