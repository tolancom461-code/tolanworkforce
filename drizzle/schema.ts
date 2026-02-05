import { pgTable, varchar, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Core user table backing auth flow.
 * This schema matches the users table structure in Supabase.
 * All column names use snake_case to match PostgreSQL conventions.
 */

export const users = pgTable("users", {
  /**
   * Surrogate primary key. UUID managed by the database.
   * Use this for relations between tables.
   */
  id: uuid("id").primaryKey(),
  
  /** Local authentication username (unique, required for local login) */
  username: varchar("username", { length: 64 }).unique().notNull(),
  
  /** User email address */
  email: varchar("email", { length: 320 }),
  
  /** Local authentication password hash (for local login) */
  passwordHash: varchar("password_hash", { length: 255 }),
  
  /** User full name (English) */
  fullName: varchar("full_name", { length: 255 }),
  
  /** User full name in Arabic */
  fullNameAr: varchar("full_name_ar", { length: 255 }),
  
  /** User phone number */
  phone: varchar("phone", { length: 20 }),
  
  /** User role (user or admin) */
  role: varchar("role", { length: 50 }).default("user"),
  
  /** Is user active (timestamp of activation) */
  isActive: timestamp("is_active", { withTimezone: true }),
});

export type User = typeof users.$inferSelect;
export type InsertUser = Partial<typeof users.$inferInsert>;

// TODO: Add your tables here
