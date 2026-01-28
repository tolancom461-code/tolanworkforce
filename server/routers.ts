import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { generateAttendanceExcel, generatePayrollExcel, type AttendanceReportRow, type PayrollReportRow } from "./excelExport";
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
        username: z.string().min(3),
        password: z.string().min(6),
        fullName: z.string().min(2),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        isActive: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        const existingUser = await db.getUserByUsername(input.username);
        if (existingUser) {
          throw new Error("Username already exists");
        }
        
        // Hash password
        const bcrypt = await import('bcryptjs');
        const passwordHash = await bcrypt.hash(input.password, 10);
        
        const id = await db.createUser({
          username: input.username,
          passwordHash,
          fullName: input.fullName,
          email: input.email,
          phone: input.phone,
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
    list: protectedProcedure
      .query(async ({ ctx }) => {
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
    
    getAttendance: protectedProcedure
      .input(z.object({ workerId: z.number(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        return await db.getWorkerAttendance(input.workerId, input.limit || 30);
      }),
    
    getFinanceSummary: protectedProcedure
      .input(z.object({ workerId: z.number() }))
      .query(async ({ input }) => {
        return await db.getWorkerFinanceSummary(input.workerId);
      }),
    
    getPayOverrides: protectedProcedure
      .input(z.object({ workerId: z.number() }))
      .query(async ({ input }) => {
        return await db.getWorkerPayOverrides(input.workerId);
      }),
    
    // Export single worker QR Code to PDF
    exportWorkerQRCode: protectedProcedure
      .input(z.object({ workerId: z.number() }))
      .mutation(async ({ input }) => {
        const worker = await db.getWorkerById(input.workerId);
        
        if (!worker) {
          throw new Error('Worker not found');
        }
        
        if (!worker.qrToken) {
          throw new Error('Worker QR token not found');
        }
        
        // Generate QR Code as data URL
        const qrDataUrl = await QRCode.toDataURL(worker.qrToken, {
          width: 300,
          margin: 2,
        });
        
        // Create PDF (simple layout: code + QR only)
        const doc = new PDFDocument({ size: 'A6', margin: 20 });
        const chunks: Buffer[] = [];
        
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        
        await new Promise<void>((resolve) => {
          doc.on('end', () => resolve());
          
          // Add worker code at top
          doc.fontSize(24).text(worker.manualCode || 'N/A', { align: 'center' });
          doc.moveDown(2);
          
          // Add QR Code (centered)
          const qrImage = Buffer.from(qrDataUrl.split(',')[1], 'base64');
          doc.image(qrImage, {
            fit: [250, 250],
            align: 'center',
          });
          
          doc.end();
        });
        
        const pdfBuffer = Buffer.concat(chunks);
        
        return {
          filename: `worker_${worker.manualCode}_qr.pdf`,
          data: pdfBuffer.toString('base64'),
        };
      }),
    
    // Export all workers QR Codes in a group to PDF
    exportGroupQRCodes: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .mutation(async ({ input }) => {
        const workers = await db.getWorkersByGroup(input.groupId);
        
        if (!workers || workers.length === 0) {
          throw new Error('No workers found in this group');
        }
        
        // Get group name
        const group = await db.getGroupById(input.groupId);
        const groupName = group?.name || 'مجموعة';
        
        // Create PDF (simple layout: code + QR only)
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        const chunks: Buffer[] = [];
        
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        
        await new Promise<void>(async (resolve) => {
          doc.on('end', () => resolve());
          
          // Add each worker (3 per page)
          for (let i = 0; i < workers.length; i++) {
            const worker = workers[i];
            
            // Skip workers without QR token
            if (!worker.qrToken) {
              continue;
            }
            
            // Add page break after every 3 workers (except first)
            if (i > 0 && i % 3 === 0) {
              doc.addPage();
            }
            
            // Generate QR Code
            const qrDataUrl = await QRCode.toDataURL(worker.qrToken, {
              width: 200,
              margin: 1,
            });
            
            // Worker code at top
            doc.fontSize(18).text(worker.manualCode || 'N/A', { align: 'center' });
            doc.moveDown(1);
            
            // Add QR Code
            const qrImage = Buffer.from(qrDataUrl.split(',')[1], 'base64');
            doc.image(qrImage, {
              fit: [180, 180],
              align: 'center',
            });
            
            doc.moveDown(2);
            
            // Add separator line
            if (i < workers.length - 1 && (i + 1) % 3 !== 0) {
              doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
              doc.moveDown();
            }
          }
          
          doc.end();
        });
        
        const pdfBuffer = Buffer.concat(chunks);
        
        return {
          filename: `group_${groupName}_qr_codes.pdf`,
          data: pdfBuffer.toString('base64'),
        };
      }),
  }),

  // Cost Centers
  costCenters: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      // إذا كان admin، يرى جميع مراكز التكلفة
      if (true) { // All users are treated as admin
        return await db.getAllCostCenters();
      }
      
      // All users have access to all cost centers (no permission system)
      return await db.getAllCostCenters();
    }),
    
    create: protectedProcedure
      .input(z.object({
        code: z.string().min(1),
        name: z.string().min(1),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createCostCenter(input);
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        code: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateCostCenter(id, data);
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteCostCenter(input.id);
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
    
    changePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(6),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        await db.changeUserPassword(ctx.user.id, input.currentPassword, input.newPassword);
        return { success: true };
      }),
  }),

  // Attendance System (Phase 4)
  attendance: router({
    // Record check-in or check-out
    record: protectedProcedure
      .input(z.object({
        workerId: z.number(),
        eventType: z.enum(['check_in', 'check_out']),
        method: z.string().default('manual'),
      }))
      .mutation(async ({ input, ctx }) => {
        return await db.recordAttendance(
          input.workerId,
          input.eventType,
          input.method,
          undefined,
          ctx.user?.id
        );
      }),
    
    // Get worker info from QR code or manual code (without recording)
    getWorkerFromQR: publicProcedure
      .input(z.object({ qrToken: z.string() }))
      .query(async ({ input }) => {
        // Try to find worker by QR token first
        let worker: any = await db.getWorkerByQRToken(input.qrToken);
        
        // If not found, try to extract code from token and search by code
        if (!worker && input.qrToken.startsWith('WRK-')) {
          const parts = input.qrToken.split('-');
          if (parts.length >= 2) {
            const code = parts[1];
            worker = await db.getWorkerByCode(code);
          }
        }
        
        if (!worker) throw new Error("رمز QR غير صالح");
        
        // Get last event to determine next action
        const lastEvent = await db.getWorkerLastEvent(worker.id);
        const nextEventType = (!lastEvent || lastEvent.eventType === 'check_out') ? 'check_in' : 'check_out';
        
        // Get today's events
        const today = new Date().toISOString().split('T')[0];
        const todayEventsRaw = await db.getAttendanceEventsForEdit(worker.id, today);
        
        // Convert snake_case from DB to camelCase for frontend
        const todayEvents = todayEventsRaw.map((event: any) => ({
          ...event,
          eventTime: event.event_time || event.eventTime,
          eventType: event.event_type || event.eventType,
          workerId: event.worker_id || event.workerId,
        }));
        
        return { 
          worker, 
          nextEventType,
          lastEvent,
          todayEvents
        };
      }),

    // Confirm and record attendance
    confirmAttendance: protectedProcedure
      .input(z.object({ 
        workerId: z.number(),
        eventType: z.enum(['check_in', 'check_out']),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.recordAttendance(
          input.workerId,
          input.eventType,
          'qr',
          undefined,
          ctx.user?.id
        );
        
        return result;
      }),
    
    // Scan QR code to get worker and record attendance (legacy - kept for compatibility)
    scanQR: protectedProcedure
      .input(z.object({ qrToken: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const worker = await db.getWorkerByQRToken(input.qrToken);
        if (!worker) throw new Error("رمز QR غير صالح");
        
        // Get last event to determine next action
        const lastEvent = await db.getWorkerLastEvent(worker.id);
        const nextEventType = (!lastEvent || lastEvent.eventType === 'check_out') ? 'check_in' : 'check_out';
        
        const result = await db.recordAttendance(
          worker.id,
          nextEventType,
          'qr',
          undefined,
          ctx.user?.id
        );
        
        return { ...result, worker, eventType: nextEventType };
      }),
    
    // Manual code entry
    manualEntry: protectedProcedure
      .input(z.object({ code: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const worker = await db.getWorkerByManualCode(input.code);
        if (!worker) throw new Error("الرمز غير صالح");
        
        const lastEvent = await db.getWorkerLastEvent(worker.id);
        const nextEventType = (!lastEvent || lastEvent.eventType === 'check_out') ? 'check_in' : 'check_out';
        
        const result = await db.recordAttendance(
          worker.id,
          nextEventType,
          'manual',
          undefined,
          ctx.user?.id
        );
        
        return { ...result, worker, eventType: nextEventType };
      }),
    
    // Get today's attendance log
    todayLog: protectedProcedure
      .input(z.object({ groupId: z.number().optional() }))
      .query(async ({ input }) => {
        return await db.getTodayAttendance(input.groupId);
      }),
    
    // Get worker's last event today
    workerLastEvent: protectedProcedure
      .input(z.object({ workerId: z.number() }))
      .query(async ({ input }) => {
        return await db.getWorkerLastEvent(input.workerId);
      }),
    
    // Get monthly report
    monthlyReport: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
        groupId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getMonthlyAttendanceReport(input.year, input.month, input.groupId);
      }),
    
    // Get attendance stats
    stats: protectedProcedure
      .input(z.object({ groupId: z.number().optional() }))
      .query(async ({ input }) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return await db.getAttendanceStats(today, tomorrow, input.groupId);
      }),
    
    // Bulk update attendance times
    bulkUpdate: protectedProcedure
      .input(z.object({
        eventIds: z.array(z.number()),
        adjustmentMinutes: z.number(),
        internalNote: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const results = [];
        for (const eventId of input.eventIds) {
          try {
            const event = await db.getAttendanceEventById(eventId);
            if (!event) {
              results.push({ eventId, success: false, error: 'Event not found' });
              continue;
            }
            
            const currentTime = new Date(event.eventTime);
            const newTime = new Date(currentTime.getTime() + input.adjustmentMinutes * 60 * 1000);
            
            await db.updateAttendanceEvent(eventId, newTime.toISOString(), input.internalNote);
            results.push({ eventId, success: true });
          } catch (error) {
            results.push({ eventId, success: false, error: String(error) });
          }
        }
        return results;
      }),
  }),

  // Work Days Management
  workDays: router({
    list: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
      }))
      .query(async ({ input }) => {
        return await db.getWorkDays(input.year, input.month);
      }),
    
    upsert: protectedProcedure
      .input(z.object({
        workDate: z.string(),
        dayType: z.enum(['normal', 'holiday', 'weekend']),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.upsertWorkDay(input.workDate, input.dayType, input.notes);
      }),
  }),

  // Daily Finance (Attendance to Finance)
  dailyFinance: router({
    // Process attendance to create daily finance record
    processAttendance: protectedProcedure
      .input(z.object({
        workerId: z.number(),
        workDate: z.string(),
      }))
      .mutation(async ({ input }) => {
        return await db.processAttendanceToFinance(input.workerId, input.workDate);
      }),
    
    // Get daily finance records for a worker
    getRecords: protectedProcedure
      .input(z.object({
        workerId: z.number(),
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input }) => {
        return await db.getDailyFinanceRecords(input.workerId, input.startDate, input.endDate);
      }),
    
    // Add finance entry (deduction, bonus, fine, addition)
    addEntry: protectedProcedure
      .input(z.object({
        workerId: z.number(),
        workDate: z.string(),
        entryType: z.enum(['deduction', 'bonus', 'fine', 'addition']),
        amount: z.number().positive(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Check if payroll batch exists for this date
        const batch = await db.checkPayrollBatchForDate(input.workDate);
        if (batch) {
          throw new Error(`لا يمكن إضافة خصومات أو إضافات بعد إنشاء دفعة الراتب. يجب حذف المسودة أولاً (دفعة رقم: ${batch.batchCode})`);
        }
        
        return await db.addFinanceEntry(
          input.workerId,
          input.workDate,
          input.entryType,
          input.amount,
          input.reason
        );
      }),
    
    // Update daily finance manually
    update: protectedProcedure
      .input(z.object({
        workerId: z.number(),
        workDate: z.string(),
        baseAmount: z.number().optional(),
        deductions: z.number().optional(),
        bonuses: z.number().optional(),
        lateMinutes: z.number().optional(),
        earlyLeaveMinutes: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createOrUpdateDailyFinance(input.workerId, input.workDate, {
          baseAmount: input.baseAmount,
          deductions: input.deductions,
          bonuses: input.bonuses,
          lateMinutes: input.lateMinutes,
          earlyLeaveMinutes: input.earlyLeaveMinutes,
          notes: input.notes,
        });
      }),
    
    // Set full day override
    setFullDayOverride: protectedProcedure
      .input(z.object({
        workerId: z.number(),
        workDate: z.string(),
        override: z.boolean(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check is already done in db.setFullDayOverride
        // No need to duplicate here
        return await db.setFullDayOverride(
          input.workerId,
          input.workDate,
          input.override,
          input.reason,
          ctx.user?.id
        );
      }),
    
    // Get full day override status
    getFullDayOverrideStatus: protectedProcedure
      .input(z.object({
        workerId: z.number(),
        workDate: z.string(),
      }))
      .query(async ({ input }) => {
        return await db.getFullDayOverrideStatus(input.workerId, input.workDate);
      }),
  }),

  // Attendance Adjustment (HR)
  attendanceAdjust: router({
    // Get events for editing
    getEvents: protectedProcedure
      .input(z.object({
        workerId: z.number(),
        workDate: z.string(),
      }))
      .query(async ({ input }) => {
        return await db.getAttendanceEventsForEdit(input.workerId, input.workDate);
      }),
    
    // Get events by group for editing
    getEventsByGroup: protectedProcedure
      .input(z.object({
        groupId: z.number(),
        workDate: z.string(),
      }))
      .query(async ({ input }) => {
        return await db.getAttendanceEventsByGroup(input.groupId, input.workDate);
      }),
    
    // Update attendance event
    updateEvent: protectedProcedure
      .input(z.object({
        eventId: z.number(),
        newTime: z.string(), // ISO string
        internalNote: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        
        // Get event to check date
        const event = await db.getAttendanceEventById(input.eventId);
        if (!event) throw new Error("Event not found");
        
        // Check if payroll batch exists for this date
        const eventDate = new Date(event.eventTime).toISOString().split('T')[0];
        const batch = await db.checkPayrollBatchForDate(eventDate);
        if (batch) {
          throw new Error(`لا يمكن تعديل الحضور بعد إنشاء دفعة الراتب. يجب حذف المسودة أولاً (دفعة رقم: ${batch.batchCode})`);
        }
        
        return await db.updateAttendanceEvent(
          input.eventId,
          input.newTime,
          input.internalNote,
          ctx.user.id
        );
      }),
  }),

  // Pay Overrides (Exceptions)
  payOverrides: router({
    // Create new override
    create: protectedProcedure
      .input(z.object({
        workerId: z.number(),
        overrideDate: z.string(),
        overrideType: z.enum(['bonus', 'deduction', 'advance', 'emergency_call']),
        amount: z.number().positive(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        
        // Check if payroll batch exists for this date
        const batch = await db.checkPayrollBatchForDate(input.overrideDate);
        if (batch) {
          throw new Error(`لا يمكن إضافة خصومات أو إضافات بعد إنشاء دفعة الراتب. يجب حذف المسودة أولاً (دفعة رقم: ${batch.batchCode})`);
        }
        
        return await db.createPayOverride({
          ...input,
          createdBy: ctx.user.id,
        });
      }),
    
    // Get pending overrides
    pending: protectedProcedure
      .input(z.object({ groupId: z.number().optional() }))
      .query(async ({ input }) => {
        return await db.getPendingOverrides(input.groupId);
      }),
    
    // Approve override
    approve: protectedProcedure
      .input(z.object({ overrideId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await db.approveOverride(input.overrideId, ctx.user.id);
      }),
    
    // Reject override
    reject: protectedProcedure
      .input(z.object({ overrideId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await db.rejectOverride(input.overrideId, ctx.user.id);
      }),
  }),

  // Excel Export
  export: router({    // Export attendance report
    attendanceReport: protectedProcedure
      .input(z.object({
        month: z.string(),
        year: z.number(),
        groupId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        
        // Get attendance data
        const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        const monthNumber = monthNames.indexOf(input.month) + 1;
        const data = await db.getMonthlyAttendanceReport(input.year, monthNumber, input.groupId);
        
        // Transform to Excel format
        const excelData: AttendanceReportRow[] = data.map(row => ({
          workerName: row.workerName,
          workerCode: row.workerCode,
          groupName: '', // Group name not in report
          daysWorked: row.daysPresent,
          daysLate: 0, // TODO: Add late tracking
          daysAbsent: 0, // TODO: Add absence tracking
          totalHours: row.totalHours,
          lateMinutes: 0, // TODO: Add late minutes tracking
        }));
        
        // Generate Excel buffer
        const buffer = await generateAttendanceExcel(excelData, input.month, input.year);
        
        // Return base64 encoded buffer
        return {
          data: buffer.toString('base64'),
          filename: `attendance_${input.month}_${input.year}.xlsx`,
        };
      }),
    
    // Export payroll report
    payrollReport: protectedProcedure
      .input(z.object({ batchId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        
        // Get batch details
        const batch = await db.getPayrollBatchDetails(input.batchId);
        if (!batch) throw new Error("Batch not found");
        
        // Transform to Excel format
        const excelData: PayrollReportRow[] = batch.items.map(item => ({
          workerName: item.workerName,
          workerCode: item.workerCode,
          groupName: '', // Group name not in payroll items
          baseSalary: parseFloat(item.baseAmount || '0'),
          deductions: parseFloat(item.totalDeductions || '0'),
          bonuses: parseFloat(item.totalBonuses || '0'),
          netSalary: parseFloat(item.netAmount || '0'),
        }));
        
        // Generate Excel buffer
        const buffer = await generatePayrollExcel(
          excelData,
          batch.batch.batchCode || `دفعة ${batch.batch.id}`,
          `${batch.batch.periodStart.toISOString().split('T')[0]} - ${batch.batch.periodEnd.toISOString().split('T')[0]}`
        );
        
        // Return base64 encoded buffer
        return {
          data: buffer.toString('base64'),
          filename: `payroll_batch_${batch.batch.id}.xlsx`,
        };
      }),
  }),

  // Financial Reports
  financialReports: router({
    // Get worker financial report
    worker: protectedProcedure
      .input(z.object({
        workerId: z.number(),
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input }) => {
        return await db.getWorkerFinancialReport(
          input.workerId,
          new Date(input.startDate),
          new Date(input.endDate)
        );
      }),
    
    // Get group financial report
    group: protectedProcedure
      .input(z.object({
        groupId: z.number(),
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input }) => {
        return await db.getGroupFinancialReport(
          input.groupId,
          new Date(input.startDate),
          new Date(input.endDate)
        );
      }),
    
    // Get cost center financial report
    costCenter: protectedProcedure
      .input(z.object({
        costCenterId: z.number(),
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input }) => {
        return await db.getCostCenterFinancialReport(
          input.costCenterId,
          new Date(input.startDate),
          new Date(input.endDate)
        );
      }),
    
    // Get all financial reports summary
    summary: protectedProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input }) => {
        return await db.getAllFinancialReportsSummary(
          new Date(input.startDate),
          new Date(input.endDate)
        );
      }),
  }),

  // Payroll Batches
  payroll: router({
    // Create draft batch
    createBatch: protectedProcedure
      .input(z.object({
        periodStart: z.string(),
        periodEnd: z.string(),
        groupId: z.number().optional(),
        costCenterId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await db.createPayrollBatch({
          ...input,
          createdBy: ctx.user.id,
        });
      }),
    
    // Get payroll batches with search and filtering
    getPayrollBatches: protectedProcedure
      .input(z.object({
        search: z.string().optional(),
        statusFilter: z.string().optional(),
        costCenterFilter: z.number().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        sortBy: z.enum(['date', 'batchId', 'totalAmount']).optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getPayrollBatches({
          search: input.search,
          statusFilter: input.statusFilter,
          costCenterFilter: input.costCenterFilter,
          dateFrom: input.dateFrom,
          dateTo: input.dateTo,
          sortBy: input.sortBy || 'date',
          sortOrder: input.sortOrder || 'desc',
          limit: input.limit || 10,
          offset: input.offset || 0,
        });
      }),
    
    // List all batches
    listBatches: protectedProcedure
      .input(z.object({
        costCenterId: z.number().optional(),
        groupId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const filters: any = {};
        if (input.costCenterId) filters.costCenterId = input.costCenterId;
        if (input.groupId) filters.groupId = input.groupId;
        if (input.startDate) filters.startDate = new Date(input.startDate);
        if (input.endDate) filters.endDate = new Date(input.endDate);
        
        return await db.getBatchesByStatus(undefined, filters);
      }),
    
    // List batches by status
    listBatchesByStatus: protectedProcedure
      .input(z.object({ status: z.string() }))
      .query(async ({ input }) => {
        return await db.getBatchesByStatus(input.status);
      }),
    
    // Get batch details
    getDetails: protectedProcedure
      .input(z.object({ batchId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPayrollBatchDetails(input.batchId);
      }),
    
    // Update batch item (DRAFT or RETURNED only)
    updateItem: protectedProcedure
      .input(z.object({
        itemId: z.number(),
        baseAmount: z.string().optional(),
        totalDeductions: z.string().optional(),
        totalBonuses: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.updateBatchItem(input);
      }),
    
    // Submit for accountant review
    submitForReview: protectedProcedure
      .input(z.object({ batchId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await db.submitBatchForReview(input.batchId, ctx.user.id);
      }),
    
    // Accountant approve
    accountantApprove: protectedProcedure
      .input(z.object({ batchId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await db.accountantApproveBatch(input.batchId, ctx.user.id);
      }),
    
    // Accountant reject
    accountantReject: protectedProcedure
      .input(z.object({
        batchId: z.number(),
        noteType: z.enum(['critical', 'warning', 'info']),
        note: z.string(),
        workerId: z.number().optional(),
        fieldName: z.string().optional(),
        attachmentUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await db.accountantRejectBatch({
          ...input,
          reviewerId: ctx.user.id,
        });
      }),
    
    // Financial reviewer approve
    financialReviewerApprove: protectedProcedure
      .input(z.object({ batchId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await db.financialReviewerApproveBatch(input.batchId, ctx.user.id);
      }),
    
    // Financial reviewer reject
    financialReviewerReject: protectedProcedure
      .input(z.object({
        batchId: z.number(),
        noteType: z.enum(['critical', 'warning', 'info']),
        note: z.string(),
        workerId: z.number().optional(),
        fieldName: z.string().optional(),
        attachmentUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await db.financialReviewerRejectBatch({
          ...input,
          reviewerId: ctx.user.id,
        });
      }),
    
    // Accounts manager final approve
    accountsManagerApprove: protectedProcedure
      .input(z.object({ batchId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await db.accountsManagerApproveBatch(input.batchId, ctx.user.id);
      }),
    
    // Accounts manager final reject
    accountsManagerReject: protectedProcedure
      .input(z.object({
        batchId: z.number(),
        note: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await db.accountsManagerRejectBatch({
          ...input,
          reviewerId: ctx.user.id,
        });
      }),
    
    // Delete batch (DRAFT only)
    deleteBatch: protectedProcedure
      .input(z.object({ batchId: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteBatch(input.batchId);
      }),
    
    // Force unlock payroll batch (requires FORCE_UNLOCK_PAYROLL permission)
    forceUnlock: protectedProcedure
      .input(z.object({
        batchId: z.number(),
        reason: z.string().min(10, 'يجب إدخال سبب واضح (10 أحرف على الأقل)'),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check permission
        const hasPermission = await db.checkUserPermission(ctx.user.id, 'FORCE_UNLOCK_PAYROLL');
        if (!hasPermission) {
          throw new Error('ليس لديك صلاحية إلغاء قفل دفعات الرواتب');
        }
        
        return await db.forceUnlockPayroll(input.batchId, input.reason, ctx.user.id);
      }),
    
    // Re-lock payroll batch
    relock: protectedProcedure
      .input(z.object({ batchId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Check permission
        const hasPermission = await db.checkUserPermission(ctx.user.id, 'FORCE_UNLOCK_PAYROLL');
        if (!hasPermission) {
          throw new Error('ليس لديك صلاحية إعادة قفل دفعات الرواتب');
        }
        
        return await db.relockPayroll(input.batchId, ctx.user.id);
      }),
    
    // Workflow: Submit to accounting
    submitToAccounting: protectedProcedure
      .input(z.object({ batchId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        
        const hasPermission = await db.checkUserPermission(ctx.user.id, 'CREATE_PAYROLL');
        if (!hasPermission) {
          throw new Error('ليس لديك صلاحية إرسال دفعات الرواتب');
        }
        
        return await db.submitBatchToAccounting(input.batchId, ctx.user.id);
      }),
    
    // Workflow: Submit to final review
    submitToFinalReview: protectedProcedure
      .input(z.object({ batchId: z.number(), reason: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        
        const hasPermission = await db.checkUserPermission(ctx.user.id, 'REVIEW_PAYROLL_ACCOUNTING');
        if (!hasPermission) {
          throw new Error('ليس لديك صلاحية مراجعة دفعات الرواتب');
        }
        
        return await db.submitBatchToFinalReview(input.batchId, ctx.user.id, input.reason);
      }),
    
    // Workflow: Submit for approval
    submitForApproval: protectedProcedure
      .input(z.object({ batchId: z.number(), reason: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        
        const hasPermission = await db.checkUserPermission(ctx.user.id, 'REVIEW_PAYROLL_FINAL');
        if (!hasPermission) {
          throw new Error('ليس لديك صلاحية مراجعة دفعات الرواتب');
        }
        
        return await db.submitBatchForApproval(input.batchId, ctx.user.id, input.reason);
      }),
    
    // Workflow: Approve batch (Manager only)
    approveBatchFinal: protectedProcedure
      .input(z.object({ batchId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        
        const hasPermission = await db.checkUserPermission(ctx.user.id, 'APPROVE_PAYROLL');
        if (!hasPermission) {
          throw new Error('ليس لديك صلاحية اعتماد دفعات الرواتب');
        }
        
        return await db.approveBatch(input.batchId, ctx.user.id);
      }),
    
    // Workflow: Reject batch (Manager only)
    rejectBatchFinal: protectedProcedure
      .input(z.object({ batchId: z.number(), reason: z.string() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        
        const hasPermission = await db.checkUserPermission(ctx.user.id, 'REJECT_PAYROLL');
        if (!hasPermission) {
          throw new Error('ليس لديك صلاحية رفض دفعات الرواتب');
        }
        
        return await db.rejectBatch(input.batchId, ctx.user.id, input.reason);
      }),
    
    // Get official payroll report by group
    getReportByGroup: protectedProcedure
      .input(z.object({
        periodStart: z.string(),
        periodEnd: z.string(),
        groupId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getPayrollReportByGroup(input.periodStart, input.periodEnd, input.groupId);
      }),
    
    // Get official payroll report by worker
    getReportByWorker: protectedProcedure
      .input(z.object({
        periodStart: z.string(),
        periodEnd: z.string(),
        workerId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getPayrollReportByWorker(input.periodStart, input.periodEnd, input.workerId);
      }),
    
    // Get official payroll report by cost center
    getReportByCostCenter: protectedProcedure
      .input(z.object({
        periodStart: z.string(),
        periodEnd: z.string(),
        costCenterId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getPayrollReportByCostCenter(input.periodStart, input.periodEnd, input.costCenterId);
      }),
    
    // Get official payroll report summary (all groups)
    getReportSummary: protectedProcedure
      .input(z.object({
        periodStart: z.string(),
        periodEnd: z.string(),
      }))
      .query(async ({ input }) => {
        return await db.getPayrollReportSummary(input.periodStart, input.periodEnd);
      }),
    
    // Export batch to Excel
    exportToExcel: protectedProcedure
      .input(z.object({ batchId: z.number() }))
      .mutation(async ({ input }) => {
        const batchData = await db.getPayrollBatchDetails(input.batchId);
        
        if (!batchData || !batchData.batch) {
          throw new Error('Batch not found');
        }
        
        // Create workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('دفعة الرواتب');
        
        // Set RTL
        worksheet.views = [{ rightToLeft: true }];
        
        // Add header info
        worksheet.mergeCells('A1:G1');
        worksheet.getCell('A1').value = `دفعة رواتب #${batchData.batch.batchCode}`;
        worksheet.getCell('A1').font = { size: 16, bold: true };
        worksheet.getCell('A1').alignment = { horizontal: 'center' };
        
        worksheet.mergeCells('A2:G2');
        worksheet.getCell('A2').value = `الفترة: ${new Date(batchData.batch.periodStart).toLocaleDateString('ar-SA')} - ${new Date(batchData.batch.periodEnd).toLocaleDateString('ar-SA')}`;
        worksheet.getCell('A2').alignment = { horizontal: 'center' };
        
        // Add empty row
        worksheet.addRow([]);
        
        // Group items by groupId
        const groupedItems = batchData.items?.reduce((acc: any, item: any) => {
          const groupKey = item.groupId || 'unknown';
          if (!acc[groupKey]) {
            acc[groupKey] = {
              groupId: item.groupId,
              groupName: item.groupName || 'مجموعة غير محددة',
              workers: [],
              summary: {
                count: 0,
                totalBase: 0,
                totalDeductions: 0,
                totalBonuses: 0,
                totalNet: 0,
              },
            };
          }
          acc[groupKey].workers.push(item);
          acc[groupKey].summary.count += 1;
          acc[groupKey].summary.totalBase += parseFloat(item.baseAmount || '0');
          acc[groupKey].summary.totalDeductions += parseFloat(item.totalDeductions || '0');
          acc[groupKey].summary.totalBonuses += parseFloat(item.totalBonuses || '0');
          acc[groupKey].summary.totalNet += parseFloat(item.netAmount || '0');
          return acc;
        }, {});
        
        const groups = Object.values(groupedItems || {});
        
        // Add table header
        const headerRow = worksheet.addRow(['اسم العامل / المجموعة', 'الراتب الأساسي', 'الخصومات', 'الإضافات', 'الصافي', 'أيام العمل', 'ملاحظات']);
        headerRow.font = { bold: true };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
        
        // Add data grouped by groups
        groups.forEach((group: any) => {
          // Group summary row
          const summaryRow = worksheet.addRow([
            `${group.groupName} (${group.summary.count} عامل)`,
            group.summary.totalBase.toFixed(2),
            group.summary.totalDeductions.toFixed(2),
            group.summary.totalBonuses.toFixed(2),
            group.summary.totalNet.toFixed(2),
            '',
            ''
          ]);
          summaryRow.font = { bold: true };
          summaryRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF0F0F0' }
          };
          
          // Worker rows
          group.workers.forEach((worker: any) => {
            worksheet.addRow([
              `  ${worker.workerName}`,
              parseFloat(worker.baseAmount).toFixed(2),
              parseFloat(worker.totalDeductions).toFixed(2),
              parseFloat(worker.totalBonuses).toFixed(2),
              parseFloat(worker.netAmount).toFixed(2),
              worker.daysWorked || 0,
              worker.notes || '-'
            ]);
          });
        });
        
        // Set column widths
        worksheet.columns = [
          { width: 30 },
          { width: 15 },
          { width: 15 },
          { width: 15 },
          { width: 15 },
          { width: 12 },
          { width: 30 }
        ];
        
        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();
        
        // Return base64 encoded file
        const bufferData = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer as any);
        return {
          filename: `payroll_${batchData.batch.batchCode}_${Date.now()}.xlsx`,
          data: bufferData.toString('base64')
        };
      }),
    
    // Get daily finance records for a worker in a batch
    getDailyFinanceForWorker: protectedProcedure
      .input(z.object({
        workerId: z.number(),
        periodStart: z.string(),
        periodEnd: z.string(),
      }))
      .query(async ({ input }) => {
        return await db.getDailyFinanceForWorker(input.workerId, input.periodStart, input.periodEnd);
      }),
    
    // Update full day override for a specific day
    updateFullDayOverride: protectedProcedure
      .input(z.object({
        workerId: z.number(),
        workDate: z.string(),
        fullDayOverride: z.boolean(),
        overrideReason: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await db.updateFullDayOverride(
          input.workerId,
          input.workDate,
          input.fullDayOverride,
          input.overrideReason,
          ctx.user.id
        );
      }),
  }),

  // Operational Flags (البلاغات التشغيلية)
  operationalFlags: router({
    // Create a new operational flag
    create: protectedProcedure
      .input(z.object({
        flagType: z.enum([
          'emergency_call',
          'justified_late',
          'justified_early_leave',
          'justified_absence',
          'proposed_deduction',
          'proposed_bonus',
          'general_report'
        ]),
        workerId: z.number(),
        groupId: z.number().optional(),
        flagDate: z.string(),
        endDate: z.string().optional(),
        description: z.string().min(1),
        attachments: z.array(z.string()).optional(),
        amount: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        const flagId = await db.createOperationalFlag({
          ...input,
          createdBy: ctx.user.id,
        });
        
        // Send notification to admin
        try {
          const { notifyOwner } = await import('./_core/notification');
          const flagTypeLabels: Record<string, string> = {
            'emergency_call': 'استدعاء طارئ',
            'justified_late': 'تأخر مبرر',
            'justified_early_leave': 'خروج مبكر مبرر',
            'justified_absence': 'غياب مبرر',
            'proposed_deduction': 'خصم مقترح',
            'proposed_bonus': 'إضافة مقترحة',
            'general_report': 'بلاغ عام'
          };
          await notifyOwner({
            title: `بلاغ تشغيلي جديد: ${flagTypeLabels[input.flagType] || input.flagType}`,
            content: `تم إنشاء بلاغ تشغيلي جديد بواسطة ${ctx.user.fullName || ctx.user.username}\nنوع البلاغ: ${flagTypeLabels[input.flagType] || input.flagType}\nالتاريخ: ${input.flagDate}\nالوصف: ${input.description}\n\nيرجى مراجعة البلاغ ومعالجته من قسم الشؤون الإدارية.`
          });
        } catch (error) {
          console.error('Failed to send notification:', error);
        }
        
        return { success: true, flagId };
      }),

    // List operational flags with filters
    list: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        workerId: z.number().optional(),
        groupId: z.number().optional(),
        flagType: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return await db.listOperationalFlags(input);
      }),

    // Get a single flag by ID
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getOperationalFlag(input.id);
      }),

    // Resolve a flag (execute action)
    resolve: protectedProcedure
      .input(z.object({
        id: z.number(),
        action: z.string(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        
        // Get flag details before resolving
        const flag = await db.getOperationalFlag(input.id);
        
        const result = await db.resolveOperationalFlag(
          input.id,
          ctx.user.id,
          input.action,
          input.notes
        );
        
        // Send notification to flag creator
        if (flag && flag.createdBy) {
          try {
            const { notifyOwner } = await import('./_core/notification');
            const flagTypeLabels: Record<string, string> = {
              'emergency_call': 'استدعاء طارئ',
              'justified_late': 'تأخر مبرر',
              'justified_early_leave': 'خروج مبكر مبرر',
              'justified_absence': 'غياب مبرر',
              'proposed_deduction': 'خصم مقترح',
              'proposed_bonus': 'إضافة مقترحة',
              'general_report': 'بلاغ عام'
            };
            await notifyOwner({
              title: `تم معالجة بلاغك التشغيلي`,
              content: `تم معالجة بلاغك التشغيلي بواسطة ${ctx.user.fullName || ctx.user.username}\nنوع البلاغ: ${flagTypeLabels[flag.flagType] || flag.flagType}\nالتاريخ: ${flag.flagDate}\nالإجراء: ${input.action}${input.notes ? `\nملاحظات: ${input.notes}` : ''}`
            });
          } catch (error) {
            console.error('Failed to send notification:', error);
          }
        }
        
        return result;
      }),

    // Ignore a flag
    ignore: protectedProcedure
      .input(z.object({
        id: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await db.ignoreOperationalFlag(input.id, ctx.user.id, input.notes);
      }),

    // Check for unresolved flags
    checkUnresolved: protectedProcedure
      .input(z.object({
        workerId: z.number().optional(),
        groupId: z.number().optional(),
        dateRange: z.object({
          start: z.string(),
          end: z.string(),
        }).optional(),
      }))
      .query(async ({ input }) => {
        return await db.checkUnresolvedFlags(
          input.workerId,
          input.groupId,
          input.dateRange
        );
      }),
  }),

  // NOTE: scopedPermissions router has been removed.
  // All users have full permissions now.
});

export type AppRouter = typeof appRouter;
