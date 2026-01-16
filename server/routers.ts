import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router, requirePermission, hasPermission } from "./_core/trpc";
import * as db from "./db";
import { generateAttendanceExcel, generatePayrollExcel, type AttendanceReportRow, type PayrollReportRow } from "./excelExport";
import * as analytics from "./analytics";
import * as QRCode from "qrcode";
import PDFDocument from "pdfkit";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    permissions: protectedProcedure.query(async ({ ctx }) => {
      // جلب الصلاحيات المباشرة للمستخدم
      const directPerms = await db.getUserPermissions(ctx.user.id);
      // جلب الصلاحيات من خلال الأدوار
      const rolePerms = await db.getUserRolePermissions(ctx.user.id);
      
      // دمج الصلاحيات وإزالة التكرار
      const allPerms = [...directPerms, ...rolePerms];
      const uniquePerms = Array.from(
        new Map(allPerms.map(p => [p.code, p])).values()
      );
      
      return uniquePerms.map(p => p.code);
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
    
    getUserPermissions: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        // Get both role permissions and individual permissions
        const rolePerms = await db.getUserRolePermissions(input.userId);
        const individualPerms = await db.getUserPermissions(input.userId);
        return {
          rolePermissions: rolePerms,
          individualPermissions: individualPerms,
          allPermissions: [...rolePerms, ...individualPerms],
        };
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
    
    create: protectedProcedure
      .input(z.object({
        code: z.string().min(1),
        name: z.string().min(1),
        description: z.string().optional(),
        level: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createRole(input);
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        code: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        level: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateRole(id, data);
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteRole(input.id);
      }),
    
    getRolePermissions: protectedProcedure
      .input(z.object({ roleId: z.number() }))
      .query(async ({ input }) => {
        return await db.getRolePermissions(input.roleId);
      }),
    
    setRolePermissions: protectedProcedure
      .input(z.object({
        roleId: z.number(),
        permissionIds: z.array(z.number()),
      }))
      .mutation(async ({ input }) => {
        await db.setRolePermissions(input.roleId, input.permissionIds);
        return { success: true };
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
        
        // Create PDF
        const doc = new PDFDocument({ size: 'A6', margin: 20 });
        const chunks: Buffer[] = [];
        
        // Register Arabic font
        const fontPath = path.resolve('/home/ubuntu/tolanworkforce/server/fonts/NotoSansArabic-Regular.ttf');
        doc.registerFont('Arabic', fontPath);
        doc.font('Arabic');
        
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        
        await new Promise<void>((resolve) => {
          doc.on('end', () => resolve());
          
          // Add title
          doc.fontSize(16).text('بطاقة عامل', { align: 'center' });
          doc.moveDown();
          
          // Add worker info
          doc.fontSize(14).text(`الاسم: ${worker.fullName}`, { align: 'right' });
          doc.fontSize(12).text(`الرمز: ${worker.manualCode || 'N/A'}`, { align: 'right' });
          doc.moveDown();
          
          // Add QR Code
          const qrImage = Buffer.from(qrDataUrl.split(',')[1], 'base64');
          doc.image(qrImage, {
            fit: [200, 200],
            align: 'center',
          });
          
          doc.moveDown();
          doc.fontSize(10).text(worker.qrToken!, { align: 'center' });
          
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
        
        // Create PDF
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        const chunks: Buffer[] = [];
        
        // Register Arabic font
        const fontPath = path.resolve('/home/ubuntu/tolanworkforce/server/fonts/NotoSansArabic-Regular.ttf');
        doc.registerFont('Arabic', fontPath);
        doc.font('Arabic');
        
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        
        await new Promise<void>(async (resolve) => {
          doc.on('end', () => resolve());
          
          // Add title
          doc.fontSize(18).text(`بطاقات عمال - ${groupName}`, { align: 'center' });
          doc.moveDown(2);
          
          // Add each worker
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
            
            // Worker card
            doc.fontSize(14).text(`${i + 1}. ${worker.fullName}`, { align: 'right' });
            doc.fontSize(11).text(`الرمز: ${worker.manualCode || 'N/A'}`, { align: 'right' });
            doc.moveDown(0.5);
            
            // Add QR Code
            const qrImage = Buffer.from(qrDataUrl.split(',')[1], 'base64');
            doc.image(qrImage, {
              fit: [150, 150],
              align: 'center',
            });
            
            doc.fontSize(9).text(worker.qrToken!, { align: 'center' });
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
    list: protectedProcedure.query(async () => {
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
    
    // Scan QR code to get worker and record attendance
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
    
    // Update attendance event
    updateEvent: protectedProcedure
      .input(z.object({
        eventId: z.number(),
        newTime: z.string(), // ISO string
        internalNote: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
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
      .use(requirePermission("payroll_batch_accountant_review"))
      .input(z.object({ batchId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await db.accountantApproveBatch(input.batchId, ctx.user.id);
      }),
    
    // Accountant reject
    accountantReject: protectedProcedure
      .use(requirePermission("payroll_batch_accountant_review"))
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
      .use(requirePermission("payroll_batch_financial_review"))
      .input(z.object({ batchId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await db.financialReviewerApproveBatch(input.batchId, ctx.user.id);
      }),
    
    // Financial reviewer reject
    financialReviewerReject: protectedProcedure
      .use(requirePermission("payroll_batch_financial_review"))
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
      .use(requirePermission("payroll_batch_manager_review"))
      .input(z.object({ batchId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await db.accountsManagerApproveBatch(input.batchId, ctx.user.id);
      }),
    
    // Accounts manager final reject
    accountsManagerReject: protectedProcedure
      .use(requirePermission("payroll_batch_manager_review"))
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
    
    // Export batch to Excel
    exportToExcel: protectedProcedure
      .input(z.object({ batchId: z.number() }))
      .mutation(async ({ input }) => {
        const ExcelJS = require('exceljs');
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
        return {
          filename: `payroll_${batchData.batch.batchCode}_${Date.now()}.xlsx`,
          data: buffer.toString('base64')
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
