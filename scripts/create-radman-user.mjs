import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import * as schema from '../drizzle/schema.js';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

async function createRadmanUser() {
  try {
    const username = 'RADMAN';
    const password = 'ADMIN';
    const passwordHash = await bcrypt.hash(password, 10);

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, username)
    });

    if (existingUser) {
      console.log('⚠️  User already exists. Updating password...');
      
      // Update existing user
      await db.update(schema.users)
        .set({
          passwordHash,
          role: 'admin',
          isActive: true,
          updatedAt: new Date()
        })
        .where(schema.users.username.eq(username));
      
      console.log('✅ User updated successfully!');
    } else {
      // Create new user
      await db.insert(schema.users).values({
        username,
        passwordHash,
        fullName: 'RADMAN - المدير العام',
        email: 'radman@tolanworkforce.com',
        role: 'admin',
        isActive: true,
        loginMethod: 'local'
      });

      console.log('✅ User created successfully!');
    }

    console.log('\n📝 Login Credentials:');
    console.log('   Username: RADMAN');
    console.log('   Password: ADMIN');
    console.log('   Role: admin (صلاحيات كاملة)');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

createRadmanUser();
