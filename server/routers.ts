import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Dashboard Statistics
  dashboard: router({
    stats: protectedProcedure.query(async () => {
      return await db.getDashboardStats();
    }),
  }),

  // User Management
  users: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllUsers();
    }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getUserById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        username: z.string().min(3),
        fullName: z.string().min(2),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        roleId: z.number().optional(),
        isActive: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        const existingUser = await db.getUserByUsername(input.username);
        if (existingUser) {
          throw new Error("Username already exists");
        }
        const id = await db.createUser({
          username: input.username,
          fullName: input.fullName,
          email: input.email,
          phone: input.phone,
          roleId: input.roleId,
          isActive: input.isActive,
        });
        return { id, success: true };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        fullName: z.string().min(2).optional(),
        email: z.string().email().optional().nullable(),
        phone: z.string().optional().nullable(),
        roleId: z.number().optional().nullable(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateUser(id, data);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteUser(input.id);
        return { success: true };
      }),
    
    assignRole: protectedProcedure
      .input(z.object({
        userId: z.number(),
        roleId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.assignRoleToUser(input.userId, input.roleId);
        return { success: true };
      }),
  }),

  // Role Management
  roles: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllRoles();
    }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getRoleById(input.id);
      }),
  }),

  // Permission Management
  permissions: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllPermissions();
    }),
    
    getUserPermissions: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const direct = await db.getUserPermissions(input.userId);
        const fromRoles = await db.getUserRolePermissions(input.userId);
        return { direct, fromRoles };
      }),
    
    setUserPermissions: protectedProcedure
      .input(z.object({
        userId: z.number(),
        permissionIds: z.array(z.number()),
      }))
      .mutation(async ({ input }) => {
        await db.setUserPermissions(input.userId, input.permissionIds);
        return { success: true };
      }),
  }),

  // Profile Management
  profile: router({
    update: protectedProcedure
      .input(z.object({
        fullName: z.string().min(2).optional(),
        email: z.string().email().optional().nullable(),
        phone: z.string().optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        await db.updateUser(ctx.user.id, input);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
