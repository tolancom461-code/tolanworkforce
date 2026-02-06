#!/usr/bin/env node
/**
 * Create Admin User Script
 * Creates a default admin user with username/password authentication
 * 
 * Usage: node scripts/create-admin-user.mjs
 */

import { drizzle } from "drizzle-orm/mysql2";
import { users } from "../drizzle/schema.ts";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  process.exit(1);
}

const db = drizzle(DATABASE_URL);

async function createAdminUser() {
  console.log("🔐 Creating admin user...\n");

  const username = "admin";
  const password = "ADMIN1";
  const fullName = "مدير النظام";
  const role = "admin";

  try {
    // Check if admin user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existingUser) {
      console.log("⚠️  Admin user already exists!");
      console.log(`   Username: ${existingUser.username}`);
      console.log(`   Full Name: ${existingUser.fullName}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log(`   Active: ${existingUser.isActive ? "Yes" : "No"}`);
      console.log("\n💡 To reset password, delete the user first and run this script again.");
      return;
    }

    // Hash the password
    console.log("🔒 Hashing password...");
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert admin user
    console.log("📝 Inserting admin user into database...");
    await db.insert(users).values({
      username,
      passwordHash,
      fullName,
      role,
      isActive: true,
      email: "admin@tolanworkforce.local",
      phone: null,
      openId: null,
      loginMethod: "local",
    });

    console.log("\n✅ Admin user created successfully!\n");
    console.log("📋 Login Credentials:");
    console.log("   ┌─────────────────────────────────");
    console.log(`   │ Username: ${username}`);
    console.log(`   │ Password: ${password}`);
    console.log(`   │ Role:     ${role}`);
    console.log("   └─────────────────────────────────");
    console.log("\n🌐 Login URL: /local-login");
    console.log("\n⚠️  IMPORTANT: Change the default password after first login!");
    
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
    process.exit(1);
  }
}

createAdminUser()
  .then(() => {
    console.log("\n✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });
