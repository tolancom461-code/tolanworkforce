import { drizzle } from "drizzle-orm/mysql2";
import { users, permissions, userPermissions } from "./drizzle/schema.ts";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

const db = drizzle(DATABASE_URL);

async function createOmarUser() {
  try {
    console.log("🔄 Creating user 'omar'...");
    
    // Hash password
    const passwordHash = await bcrypt.hash("admin1", 10);
    
    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.username, "omar")).limit(1);
    
    let userId;
    if (existingUser.length > 0) {
      console.log("⚠️  User 'omar' already exists, updating...");
      userId = existingUser[0].id;
      
      // Update user
      await db.update(users)
        .set({
          passwordHash,
          fullName: "Omar - Administrator",
          loginMethod: "local",
          isActive: true,
          role: "admin",
        })
        .where(eq(users.id, userId));
    } else {
      // Create new user
      const [result] = await db.insert(users).values({
        username: "omar",
        passwordHash,
        fullName: "Omar - Administrator",
        loginMethod: "local",
        isActive: true,
        role: "admin",
      });
      
      userId = result.insertId;
      console.log(`✅ User 'omar' created with ID: ${userId}`);
    }
    
    // Get all permissions
    const allPermissions = await db.select().from(permissions);
    console.log(`📋 Found ${allPermissions.length} permissions`);
    
    // Delete existing user permissions
    await db.delete(userPermissions).where(eq(userPermissions.userId, userId));
    
    // Grant all permissions
    const permissionValues = allPermissions.map(p => ({
      userId,
      permissionId: p.id,
      granted: true,
    }));
    
    if (permissionValues.length > 0) {
      await db.insert(userPermissions).values(permissionValues);
      console.log(`✅ Granted ${permissionValues.length} permissions to omar`);
    }
    
    console.log("\n✨ Success! User 'omar' is ready:");
    console.log("   Username: omar");
    console.log("   Password: admin1");
    console.log(`   Permissions: ${allPermissions.length} (all)`);
    console.log("\n🔗 Login URL: /local-login");
    
  } catch (error) {
    console.error("❌ Error creating user:", error);
    process.exit(1);
  }
}

createOmarUser();
