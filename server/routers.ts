import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getUserByUsername, getWorkers, getWorkerById, getWorkersCount, getAttendanceEvents, getAttendanceCount } from "./db";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { testSupabaseConnection, getTablesList, getAllTables } from "./supabase";

/**
 * Authentication Router
 *
 * Handles local authentication using username/password with JWT tokens.
 * Tokens are stored in sessionStorage on the frontend and sent via Authorization header.
 * Backend validates Bearer tokens in the Authorization header.
 */
export const appRouter = router({
  // System router for internal operations
  system: systemRouter,

  // Authentication router - handles login/logout and user info
  auth: router({
    /**
     * Get current authenticated user
     * Returns null if not authenticated
     */
    me: publicProcedure.query(opts => opts.ctx.user),

    /**
     * Logout - clears session cookie
     */
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    /**
     * Local authentication with username and password
     *
     * Flow:
     * 1. Validate username and password
     * 2. Hash password with bcrypt and compare
     * 3. Generate JWT token with user info (id, username, role)
     * 4. Return token to frontend
     * 5. Frontend stores token in sessionStorage and sends via Authorization header
     *
     * Token format: Bearer <jwt_token>
     * Expiration: 15 minutes
     */
    localLogin: publicProcedure
      .input(z.object({
        username: z.string().min(1, "Username is required"),
        password: z.string().min(1, "Password is required"),
      }))
      .mutation(async ({ input, ctx }) => {
        // Find user by username
        const user = await getUserByUsername(input.username);

        if (!user || !user.passwordHash) {
          throw new Error("Invalid username or password");
        }

        // Verify password using bcryptjs
        const passwordMatch = await bcryptjs.compare(input.password, user.passwordHash);
        if (!passwordMatch) {
          throw new Error("Invalid username or password");
        }

        // Generate JWT token with user claims
        const token = jwt.sign(
          {
            id: user.id,
            username: user.username,
            role: user.role,
          },
          process.env.JWT_SECRET || "secret",
          { expiresIn: "15m" }
        );

        // Set session cookie (for backward compatibility with OAuth flow)
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, cookieOptions);

        // Return token and user info
        return {
          success: true,
          user: {
            id: user.id,
            username: user.username,
            name: user.fullName,
            role: user.role,
          },
          accessToken: token,
        };
      }),
  }),

  // Supabase Integration Router
  supabase: router({
    /**
     * Test connection to Supabase
     */
    testConnection: publicProcedure.query(async () => {
      return await testSupabaseConnection();
    }),

    /**
     * Get list of known tables from Supabase
     */
    getTables: publicProcedure.query(async () => {
      try {
        const tables = await getTablesList();
        return {
          success: true,
          tables,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

    /**
     * Get all tables from Supabase (comprehensive search)
     */
    getAllTables: publicProcedure.query(async () => {
      try {
        const tables = await getAllTables();
        return {
          success: true,
          tables,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),
  }),

  // Workers (Employees) Router
  workers: router({
    /**
     * Get all workers
     */
    list: publicProcedure.query(async () => {
      return await getWorkers();
    }),

    /**
     * Get single worker by ID
     */
    getById: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        return await getWorkerById(input.id);
      }),

    /**
     * Get workers count
     */
    count: publicProcedure.query(async () => {
      return await getWorkersCount();
    }),

    /**
     * Create a new worker
     */
    create: publicProcedure
      .input(z.object({
        code: z.string(),
        fullName: z.string(),
        nationalId: z.string().optional(),
        phone: z.string().optional(),
        groupId: z.number().optional(),
        jobId: z.number().optional(),
        dailyRate: z.number().optional(),
        photoUrl: z.string().optional(),
        hireDate: z.string().optional(),
        status: z.enum(['active', 'inactive', 'archived']).default('active'),
      }))
      .mutation(async ({ input }) => {
        // Placeholder for create logic
        return { success: true, id: 'new-id' };
      }),

    /**
     * Update a worker
     */
    update: publicProcedure
      .input(z.object({
        id: z.string(),
        code: z.string().optional(),
        fullName: z.string().optional(),
        nationalId: z.string().optional(),
        phone: z.string().optional(),
        groupId: z.number().optional(),
        jobId: z.number().optional(),
        dailyRate: z.number().optional(),
        photoUrl: z.string().optional(),
        hireDate: z.string().optional(),
        status: z.enum(['active', 'inactive', 'archived']).optional(),
      }))
      .mutation(async ({ input }) => {
        // Placeholder for update logic
        return { success: true };
      }),

    /**
     * Delete a worker
     */
    delete: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        // Placeholder for delete logic
        return { success: true };
      }),
  }),

  // Groups Router
  groups: router({
    /**
     * Get all groups
     */
    list: publicProcedure.query(async () => {
      // Placeholder for groups list
      return [];
    }),
  }),

  // Attendance Router
  attendance: router({
    /**
     * Get attendance events
     */
    list: publicProcedure
      .input(z.object({
        limit: z.number().default(100),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => {
        return await getAttendanceEvents(input.limit, input.offset);
      }),

    /**
     * Get attendance count
     */
    count: publicProcedure.query(async () => {
      return await getAttendanceCount();
    }),
  }),

  // Dashboard Router
  dashboard: router({
    /**
     * Get dashboard statistics
     */
    stats: publicProcedure.query(async () => {
      const workersCount = await getWorkersCount();
      const attendanceCount = await getAttendanceCount();
      
      return {
        totalWorkers: workersCount,
        totalAttendanceRecords: attendanceCount,
        activeWorkers: workersCount,
        todayAttendance: 0,
      };
    }),
  })
});

export type AppRouter = typeof appRouter;
