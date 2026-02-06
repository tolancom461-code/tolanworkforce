import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { sql } from "drizzle-orm";
import { attendanceEvents } from "../drizzle/schema";
import { generateAttendanceExcel, generatePayrollExcel, type AttendanceReportRow, type PayrollReportRow } from "./excelExport";
import { parseGroupsFromExcel, parseWorkersFromExcel, generateGroupsExcelTemplate, generateWorkersExcelTemplate, generateGroupsExcelExport, generateWorkersExcelExport } from "./excelImportExport";
import * as analytics from "./analytics";
import * as QRCode from "qrcode";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return null;
      
      // Verify user still exists and is active
      const currentUser = await db.getUserById(ctx.user.id);
      
      if (!currentUser || !currentUser.isActive) {
        return null; // User deleted or deactivated
      }
      
      return currentUser;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    permissions: protectedProcedure.query(async ({ ctx }) => {
      // Old permission system removed
      // Use scopedPermissions router for the new atomic permissions system
      return [];
    }),
    localLogin: publicProcedure
      .input(z.object({
        username: z.string().min(1),
        password: z.string().min(1),
        rememberMe: z.boolean().optional().default(false),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await db.authenticateLocalUser(input.username, input.password);
        
        if (!user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'اسم المستخدم أو كلمة السر غير صحيحة',
          });
        }
        
        if (!user.isActive) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'هذا الحساب غير نشط',
          });
        }
        
        // Create session
        const expiresIn = input.rememberMe ? '30d' : '1d';
        const token = jwt.sign(
          { userId: user.id, username: user.username },
          process.env.JWT_SECRET || 'fallback-secret',
          { expiresIn }
        );
        
        const cookieOptions = getSessionCookieOptions(ctx.req);
        const maxAge = input.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 30 days or 1 day
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge });
        
        return { success: true, user };
      }),
  }),

  // Dashboard Statistics
  dashboard: router({
    stats: protectedProcedure.query(async () => {
      return await db.getDashboardStats();
    }),
  }),

  // AI-Powered Analytics
  analytics: router({
    executive: protectedProcedure.query(async () => {
      const today = new Date();
      const todayStats = await analytics.getDailyStats(today);
      const historicalStats = await analytics.getHistoricalStats(28); // Last 4 weeks
      
      const healthScore = await analytics.calculateHealthScore(todayStats, historicalStats);
      const pressurePoint = await analytics.detectPressurePoint(today);
      const anomaly = await analytics.detectAnomalies(todayStats, historicalStats);
      const forecast = await analytics.forecastEndOfDay(todayStats, historicalStats);
      const insight = await analytics.generateAIInsight(healthScore, pressurePoint, anomaly, todayStats);
      const pendingPayroll = await analytics.getPendingPayrollBatches();
      
      // Calculate trends
      const yesterdayStats = historicalStats[1] || todayStats;
      const weekAvg = historicalStats.slice(0, 7).reduce((sum, s) => sum + s.present, 0) / 7;
      
      return {
        todayStats,
        yesterdayStats,
        weekAvg: Math.round(weekAvg),
        healthScore,
        pressurePoint,
        anomaly,
        forecast,
        insight,
        pendingPayroll
      };
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
        code: z.string().min(1),
        name: z.string().min(2),
        costCenterId: z.number().optional().nullable(),
        supervisorId: z.number().optional().nullable(),
        dailyRate: z.string().optional(),
        workHours: z.string().optional(),
        dailyWage: z.string().optional().nullable(),
        workMinutes: z.string().optional().nullable(),
        latePenaltyRate: z.string().optional().nullable(),
        earlyLeavePenaltyRate: z.string().optional().nullable(),
        shiftStartTime: z.string().optional().nullable(),
        shiftEndTime: z.string().optional().nullable(),
        isActive: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        try {
          const id = await db.createGroup({
            code: input.code,
            name: input.name,
            costCenterId: input.costCenterId,
            supervisorId: input.supervisorId,
            dailyRate: input.dailyRate ? input.dailyRate : undefined,
            workHours: input.workHours ? input.workHours : undefined,
            dailyWage: input.dailyWage ? parseFloat(input.dailyWage) : null,
            workMinutes: input.workMinutes ? parseInt(input.workMinutes) : null,
            latePenaltyRate: input.latePenaltyRate ? parseFloat(input.latePenaltyRate) : null,
            earlyLeavePenaltyRate: input.earlyLeavePenaltyRate ? parseFloat(input.earlyLeavePenaltyRate) : null,
            shiftStartTime: input.shiftStartTime,
            shiftEndTime: input.shiftEndTime,
            isActive: input.isActive,
          } as any);
          return { id, success: true };
        } catch (error: any) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message || 'فشل إنشاء المجموعة',
          });
        }
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        fullName: z.string().min(2).optional(),
        email: z.string().email().optional().nullable(),
        phone: z.string().optional().nullable(),
        isActive: z.boolean().optional(),
        password: z.string().min(6).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, password, ...data } = input;
        
        // Hash password if provided
        if (password) {
          const bcrypt = await import('bcryptjs');
          const passwordHash = await bcrypt.hash(password, 10);
          await db.updateUser(id, { ...data, passwordHash });
        } else {
          await db.updateUser(id, data);
        }
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteUser(input.id);
        return { success: true };
      }),
    
    // NOTE: Permissions Management removed - all users have full permissions
    
    updateRole: protectedProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(['admin', 'user', 'accountant', 'financial_reviewer', 'accounts_manager', 'hr_manager', 'security_guard']),
      }))
      .mutation(async ({ input, ctx }) => {
        // All users have permission to change roles (no role system)
        const allowedRole = input.role === 'admin' ? 'admin' : 'user';
        await db.updateUserRole(input.userId, allowedRole);
        return { success: true };
      }),
    
    // NOTE: assignRole removed - role system no longer exists
    
    // OLD PERMISSION PROCEDURES - REMOVED
    // Replaced with Atomic Permissions + Scope System
  }),

  // Role Management
  // NOTE: roles and permissions routers have been removed.
  // All users are now treated as Admin with full access.

  // Groups Management
  groups: router({
    list: protectedProcedure.query(async () => {
      // All users have access to all groups (no permission system)
      return await db.getAllGroups();
    }),
    
    listByCostCenter: protectedProcedure
      .input(z.object({
        costCenterId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        // If no costCenterId provided, return all groups
        if (!input.costCenterId) {
          return await db.getAllGroups();
        }
        // Otherwise, return only groups for that cost center
        return await db.getGroupsByCostCenter(input.costCenterId);
      }),
    
    listWithPagination: protectedProcedure
      .input(z.object({
        page: z.number().default(1),
        limit: z.number().default(10),
        costCenterId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getGroupsWithPagination(input.page, input.limit, input.costCenterId);
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
        dailyWage: z.string().optional().nullable(),
        workMinutes: z.string().optional().nullable(),
        latePenaltyRate: z.string().optional().nullable(),
        earlyLeavePenaltyRate: z.string().optional().nullable(),
        shiftStartTime: z.string().optional().nullable(),
        shiftEndTime: z.string().optional().nullable(),
        isActive: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        try {
          const id = await db.createGroup({
            code: input.code,
            name: input.name,
            costCenterId: input.costCenterId,
            supervisorId: input.supervisorId,
            dailyRate: input.dailyRate,
            workHours: input.workHours,
            dailyWage: input.dailyWage ? parseFloat(input.dailyWage) : null,
            workMinutes: input.workMinutes ? parseInt(input.workMinutes) : null,
            latePenaltyRate: input.latePenaltyRate ? parseFloat(input.latePenaltyRate) : null,
            earlyLeavePenaltyRate: input.earlyLeavePenaltyRate ? parseFloat(input.earlyLeavePenaltyRate) : null,
            shiftStartTime: input.shiftStartTime,
            shiftEndTime: input.shiftEndTime,
            isActive: input.isActive,
          } as any);
          return { id, success: true };
        } catch (error: any) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message || 'فشل إنشاء المجموعة',
          });
        }
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
        dailyWage: z.string().optional().nullable(),
        workMinutes: z.string().optional().nullable(),
        latePenaltyRate: z.string().optional().nullable(),
        earlyLeavePenaltyRate: z.string().optional().nullable(),
        shiftStartTime: z.string().optional().nullable(),
        shiftEndTime: z.string().optional().nullable(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const updateData: any = {};
        
        if (data.code !== undefined) updateData.code = data.code;
        if (data.name !== undefined) updateData.name = data.name;
        if (data.costCenterId !== undefined) updateData.costCenterId = data.costCenterId;
        if (data.supervisorId !== undefined) updateData.supervisorId = data.supervisorId;
        if (data.dailyRate !== undefined) updateData.dailyRate = data.dailyRate;
        if (data.workHours !== undefined) updateData.workHours = data.workHours;
        if (data.dailyWage !== undefined) updateData.dailyWage = data.dailyWage ? parseFloat(data.dailyWage) : null;
        if (data.workMinutes !== undefined) updateData.workMinutes = data.workMinutes ? parseInt(data.workMinutes) : null;
        if (data.latePenaltyRate !== undefined) updateData.latePenaltyRate = data.latePenaltyRate ? parseFloat(data.latePenaltyRate) : null;
        if (data.earlyLeavePenaltyRate !== undefined) updateData.earlyLeavePenaltyRate = data.earlyLeavePenaltyRate ? parseFloat(data.earlyLeavePenaltyRate) : null;
        if (data.shiftStartTime !== undefined) updateData.shiftStartTime = data.shiftStartTime;
        if (data.shiftEndTime !== undefined) updateData.shiftEndTime = data.shiftEndTime;
        if (data.isActive !== undefined) updateData.isActive = data.isActive;
        
        await db.updateGroup(id, updateData);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteGroup(input.id);
        return { success: true };
      }),
  }),

  // Workers Management
  workers: router({
    // Placeholder for workers routes
  }),
});

export type AppRouter = typeof appRouter;
