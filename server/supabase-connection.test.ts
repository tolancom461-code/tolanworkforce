import { describe, it, expect } from "vitest";
import postgres from "postgres";

/**
 * Test Supabase PostgreSQL connection
 * This test validates that SUPABASE_DB_URL is correctly configured
 */
describe("Supabase Connection", () => {
  it(
    "should connect to Supabase PostgreSQL database",
    async () => {
      const connectionString = process.env.SUPABASE_DB_URL;

      if (!connectionString) {
        throw new Error("SUPABASE_DB_URL environment variable is not set");
      }

      // Create a connection
      const sql = postgres(connectionString, {
        max: 1,
        idle_timeout: 5,
        connect_timeout: 20,
      });

      try {
        // Test query to verify connection
        const result = await sql`SELECT 1 as test`;

        expect(result).toBeDefined();
        expect(result.length).toBe(1);
        expect(result[0].test).toBe(1);

        console.log("✅ Successfully connected to Supabase PostgreSQL");
      } finally {
        await sql.end();
      }
    },
    { timeout: 30000 }
  );

  it(
    "should be able to query the users table",
    async () => {
      const connectionString = process.env.SUPABASE_DB_URL;

      if (!connectionString) {
        throw new Error("SUPABASE_DB_URL environment variable is not set");
      }

      const sql = postgres(connectionString, {
        max: 1,
        idle_timeout: 5,
        connect_timeout: 20,
      });

      try {
        // Query the users table
        const result = await sql`SELECT COUNT(*) as count FROM users`;

        expect(result).toBeDefined();
        expect(result.length).toBe(1);
        expect(typeof result[0].count).toBe("number");

        console.log(`✅ Users table has ${result[0].count} records`);
      } finally {
        await sql.end();
      }
    },
    { timeout: 30000 }
  );

  it(
    "should find the admin user",
    async () => {
      const connectionString = process.env.SUPABASE_DB_URL;

      if (!connectionString) {
        throw new Error("SUPABASE_DB_URL environment variable is not set");
      }

      const sql = postgres(connectionString, {
        max: 1,
        idle_timeout: 5,
        connect_timeout: 20,
      });

      try {
        // Find admin user
        const result = await sql`SELECT id, username, email, role FROM users WHERE username = 'admin' LIMIT 1`;

        expect(result).toBeDefined();
        expect(result.length).toBe(1);
        expect(result[0].username).toBe("admin");
        expect(result[0].role).toBe("admin");

        console.log("✅ Admin user found:", result[0]);
      } finally {
        await sql.end();
      }
    },
    { timeout: 30000 }
  );
});
