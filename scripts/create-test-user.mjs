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

async function createTestUser() {
  try {
    const username = 'admin';
    const password = 'admin123';
    const passwordHash = await bcrypt.hash(password, 10);

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, username)
    });

    if (existingUser) {
      console.log('✅ User already exists:', username);
      console.log('   Username:', username);
      console.log('   Password:', password);
      return;
    }

    // Create new user
    await db.insert(schema.users).values({
      username,
      passwordHash,
      fullName: 'مدير النظام',
      email: 'admin@tolanworkforce.com',
      role: 'admin',
      isActive: true,
      loginMethod: 'local'
    });

    console.log('✅ Test user created successfully!');
    console.log('   Username:', username);
    console.log('   Password:', password);
    console.log('\n📝 You can now login with these credentials');
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

createTestUser();
