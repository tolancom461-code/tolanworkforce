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

  // Groups Management
  groups: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllGroups();
    }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getGroupById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        code: z.string().min(1),
        name: z.string().min(2),
        costCenterId: z.number().optional().nullable(),
        supervisorId: z.number().optional().nullable(),
        dailyRate: z.string().optional(),
        workHours: z.string().optional(),
        isActive: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createGroup(input);
        return { id, success: true };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        code: z.string().min(1).optional(),
        name: z.string().min(2).optional(),
        costCenterId: z.number().optional().nullable(),
        supervisorId: z.number().optional().nullable(),
        dailyRate: z.string().optional(),
        workHours: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateGroup(id, data);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteGroup(input.id);
        return { success: true };
      }),
    
    // Shifts
    getShifts: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ input }) => {
        return await db.getGroupShifts(input.groupId);
      }),
    
    createShift: protectedProcedure
      .input(z.object({
        groupId: z.number(),
        shiftName: z.string().min(1),
        startTime: z.string(),
        endTime: z.string(),
        isActive: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createGroupShift(input);
        return { id, success: true };
      }),
    
    updateShift: protectedProcedure
      .input(z.object({
        id: z.number(),
        shiftName: z.string().min(1).optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateGroupShift(id, data);
        return { success: true };
      }),
    
    deleteShift: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteGroupShift(input.id);
        return { success: true };
      }),
  }),

  // Workers Management
  workers: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllWorkers();
    }),
    
    listByGroup: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ input }) => {
        return await db.getWorkersByGroup(input.groupId);
      }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getWorkerById(input.id);
      }),
    
    getByCode: protectedProcedure
      .input(z.object({ code: z.string() }))
      .query(async ({ input }) => {
        return await db.getWorkerByCode(input.code);
      }),
    
    create: protectedProcedure
      .input(z.object({
        code: z.string().min(1),
        fullName: z.string().min(2),
        nationalId: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        groupId: z.number().optional().nullable(),
        jobId: z.number().optional().nullable(),
        dailyRate: z.string().optional(),
        photoUrl: z.string().optional().nullable(),
        hireDate: z.string().optional().nullable(),
        status: z.enum(["active", "inactive", "archived"]).default("active"),
      }))
      .mutation(async ({ input }) => {
        // Generate QR token
        const qrToken = `WRK-${input.code}-${Date.now()}`;
        const manualCode = input.code.toUpperCase();
        
        const id = await db.createWorker({
          ...input,
          qrToken,
          manualCode,
          hireDate: input.hireDate ? new Date(input.hireDate) : null,
        });
        return { id, qrToken, success: true };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        code: z.string().min(1).optional(),
        fullName: z.string().min(2).optional(),
        nationalId: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        groupId: z.number().optional().nullable(),
        jobId: z.number().optional().nullable(),
        dailyRate: z.string().optional(),
        photoUrl: z.string().optional().nullable(),
        status: z.enum(["active", "inactive", "archived"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateWorker(id, data);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteWorker(input.id);
        return { success: true };
      }),
    
    regenerateQR: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const worker = await db.getWorkerById(input.id);
        if (!worker) throw new Error("Worker not found");
        
        const qrToken = `WRK-${worker.code}-${Date.now()}`;
        await db.updateWorker(input.id, { qrToken });
        return { qrToken, success: true };
      }),
  }),

  // Cost Centers
  costCenters: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllCostCenters();
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
