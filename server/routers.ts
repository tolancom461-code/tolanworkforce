"use client";

import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "./db";
import { eq, and, sql, desc, asc, inArray } from "drizzle-orm";
import {
  workers,
  groups,
  costCenters,
  attendanceEvents,
  payrollBatches,
  workerDailyFinance,
  payOverrides,
  operationalFlags,
  groupSchedules,
  workerDeductions,
  workerBonuses,
  users,
} from "../drizzle/schema";
import { getDb } from "./db";
import { notifyOwner } from "./notification";
import { invokeLLM } from "./_core/llm";
import { calculateDailyFinanceFromAttendance } from "./attendance-to-finance";

const t = initTRPC.context<{ user?: any }>().create();

export const router = t.router({
  // ============================================
  // Groups (المجموعات)
  // ============================================
  groups: t.router({
    list: t.procedure.query(async () => {
      return await db.select().from(groups);
    }),

    listByCostCenter: t.procedure
      .input(z.object({ costCenterId: z.number().optional() }))
      .query(async ({ input }) => {
        if (!input.costCenterId) return [];
        return await db
          .select()
          .from(groups)
          .where(eq(groups.costCenterId, input.costCenterId));
      }),

    create: t.procedure
      .input(
        z.object({
          code: z.string().min(1),
          name: z.string().min(1),
          costCenterId: z.number(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const result = await db.insert(groups).values(input);
        return { id: result.insertId, ...input };
      }),

    update: t.procedure
      .input(
        z.object({
          id: z.number(),
          code: z.string().optional(),
          name: z.string().optional(),
          costCenterId: z.number().optional(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await db.update(groups).set(updates).where(eq(groups.id, id));
        return { id, ...updates };
      }),

    delete: t.procedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.delete(groups).where(eq(groups.id, input.id));
        return { success: true };
      }),
  }),

  // ============================================
  // Cost Centers (مراكز التكلفة)
  // ============================================
  costCenters: t.router({
    list: t.procedure.query(async () => {
      return await db.select().from(costCenters);
    }),

    create: t.procedure
      .input(
        z.object({
          code: z.string().min(1),
          name: z.string().min(1),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const result = await db.insert(costCenters).values(input);
        return { id: result.insertId, ...input };
      }),

    update: t.procedure
      .input(
        z.object({
          id: z.number(),
          code: z.string().optional(),
          name: z.string().optional(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await db
          .update(costCenters)
          .set(updates)
          .where(eq(costCenters.id, id));
        return { id, ...updates };
      }),

    delete: t.procedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.delete(costCenters).where(eq(costCenters.id, input.id));
        return { success: true };
      }),
  }),

  // ============================================
  // Workers (العمال)
  // ============================================
  workers: t.router({
    list: t.procedure.query(async () => {
      return await db
        .select({
          id: workers.id,
          code: workers.code,
          fullName: workers.fullName,
          groupId: workers.groupId,
          group: {
            id: groups.id,
            name: groups.name,
          },
          baseSalary: workers.baseSalary,
          createdAt: workers.createdAt,
        })
        .from(workers)
        .leftJoin(groups, eq(workers.groupId, groups.id));
    }),

    listWithPagination: t.procedure
      .input(
        z.object({
          page: z.number().default(1),
          limit: z.number().default(10),
          groupId: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        const offset = (input.page - 1) * input.limit;
        const query = db.select().from(workers);

        if (input.groupId) {
          query.where(eq(workers.groupId, input.groupId));
        }

        const results = await query
          .orderBy(asc(workers.code))
          .limit(input.limit)
          .offset(offset);

        return results;
      }),

    getById: t.procedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const result = await db
          .select()
          .from(workers)
          .where(eq(workers.id, input.id));
        return result[0];
      }),

    create: t.procedure
      .input(
        z.object({
          code: z.string().min(1),
          fullName: z.string().min(1),
          groupId: z.number(),
          baseSalary: z.number().default(0),
        })
      )
      .mutation(async ({ input }) => {
        const result = await db.insert(workers).values(input);
        return { id: result.insertId, ...input };
      }),

    update: t.procedure
      .input(
        z.object({
          id: z.number(),
          code: z.string().optional(),
          fullName: z.string().optional(),
          groupId: z.number().optional(),
          baseSalary: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await db.update(workers).set(updates).where(eq(workers.id, id));
        return { id, ...updates };
      }),

    delete: t.procedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.delete(workers).where(eq(workers.id, input.id));
        return { success: true };
      }),

    importFromExcel: t.procedure
      .input(
        z.object({
          workers: z.array(
            z.object({
              code: z.string(),
              fullName: z.string(),
              groupId: z.number(),
              baseSalary: z.number().optional(),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        const results = [];
        for (const worker of input.workers) {
          try {
            const result = await db.insert(workers).values(worker);
            results.push({ success: true, id: result.insertId });
          } catch (error) {
            results.push({
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }
        return results;
      }),
  }),

  // ============================================
  // Attendance (الحضور والانصراف)
  // ============================================
  attendance: t.router({
    recordAttendance: t.procedure
      .input(
        z.object({
          workerId: z.number(),
          eventType: z.enum(["check_in", "check_out"]),
          method: z.string().optional(),
          deviceId: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const result = await db.recordAttendance(
          input.workerId,
          input.eventType,
          input.method || "manual",
          input.deviceId,
          ctx.user?.id
        );
        return result;
      }),

    getDailyRecords: t.procedure
      .input(
        z.object({
          workDate: z.date(),
          groupId: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        const dateStr = input.workDate.toISOString().split("T")[0];
        const query = db
          .select({
            workerId: workers.id,
            workerCode: workers.code,
            workerName: workers.fullName,
            groupId: workers.groupId,
            groupName: groups.name,
            checkInTime: sql<string>`MIN(CASE WHEN ${attendanceEvents.eventType} = 'check_in' THEN ${attendanceEvents.eventTime} END)`,
            checkOutTime: sql<string>`MAX(CASE WHEN ${attendanceEvents.eventType} = 'check_out' THEN ${attendanceEvents.eventTime} END)`,
            checkInCount: sql<number>`SUM(CASE WHEN ${attendanceEvents.eventType} = 'check_in' THEN 1 ELSE 0 END)`,
            checkOutCount: sql<number>`SUM(CASE WHEN ${attendanceEvents.eventType} = 'check_out' THEN 1 ELSE 0 END)`,
          })
          .from(workers)
          .leftJoin(groups, eq(workers.groupId, groups.id))
          .leftJoin(
            attendanceEvents,
            and(
              eq(attendanceEvents.workerId, workers.id),
              sql`DATE(${attendanceEvents.eventTime}) = ${dateStr}`
            )
          );

        if (input.groupId) {
          query.where(eq(workers.groupId, input.groupId));
        }

        const results = await query.groupBy(workers.id, workers.code, workers.fullName, workers.groupId, groups.name);
        return results;
      }),

    updateDailyRecord: t.procedure
      .input(
        z.object({
          workerId: z.number(),
          workDate: z.date(),
          checkInTime: z.string().optional(),
          checkOutTime: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        // This is a placeholder for updating daily records
        // In a real implementation, you'd update the attendance_events table
        return { success: true };
      }),

    getForReview: t.procedure
      .input(
        z.object({
          workDate: z.date(),
          status: z.enum(["PENDING_REVIEW", "APPROVED", "REJECTED"]).optional(),
        })
      )
      .query(async ({ input }) => {
        const dateStr = input.workDate.toISOString().split("T")[0];

        // Get all attendance events for the date
        const events = await db
          .select({
            id: attendanceEvents.id,
            workerId: attendanceEvents.workerId,
            eventType: attendanceEvents.eventType,
            eventTime: attendanceEvents.eventTime,
            method: attendanceEvents.method,
            note: attendanceEvents.note,
            workerCode: workers.code,
            workerFullName: workers.fullName,
            groupName: groups.name,
          })
          .from(attendanceEvents)
          .innerJoin(workers, eq(attendanceEvents.workerId, workers.id))
          .leftJoin(groups, eq(workers.groupId, groups.id))
          .where(sql`DATE(${attendanceEvents.eventTime}) = ${dateStr}`)
          .orderBy(workers.code, attendanceEvents.eventTime);

        return events.map((e) => ({
          id: e.id,
          workerId: e.workerId,
          worker: {
            code: e.workerCode,
            fullName: e.workerFullName,
            group: {
              name: e.groupName,
            },
          },
          eventType: e.eventType,
          eventTime: e.eventTime,
          method: e.method,
          note: e.note,
          status: "PENDING_REVIEW",
        }));
      }),

    approvePunch: t.procedure
      .input(
        z.object({
          id: z.number(),
          note: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        console.log("Approving punch:", input.id);
        return { success: true, message: "تم الموافقة على البصمة" };
      }),

    rejectPunch: t.procedure
      .input(
        z.object({
          id: z.number(),
          note: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        console.log("Rejecting punch:", input.id);
        return { success: true, message: "تم رفض البصمة" };
      }),

    confirmAttendance: t.procedure
      .input(
        z.object({
          workerId: z.number(),
          eventType: z.enum(["check_in", "check_out"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const result = await db.recordAttendance(
          input.workerId,
          input.eventType,
          "qr",
          undefined,
          ctx.user?.id
        );

        return result;
      }),

    scanQR: t.procedure
      .input(z.object({ qrToken: z.string() }))
      .mutation(async ({ input, ctx }) => {
        // Placeholder for QR scanning
        return { success: true };
      }),

    calculateDailyFinance: t.procedure
      .input(
        z.object({
          workDate: z.date(),
          groupId: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const dateStr = input.workDate.toISOString().split("T")[0];

        // Get workers for the date
        const workersForDate = await db
          .select({ id: workers.id })
          .from(workers)
          .where(
            input.groupId ? eq(workers.groupId, input.groupId) : undefined
          );

        const results = [];
        for (const worker of workersForDate) {
          try {
            await calculateDailyFinanceFromAttendance(
              worker.id,
              new Date(dateStr)
            );
            results.push({ workerId: worker.id, success: true });
          } catch (error) {
            results.push({
              workerId: worker.id,
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }

        return results;
      }),
  }),

  // ============================================
  // Payroll (الرواتب)
  // ============================================
  payroll: t.router({
    createBatch: t.procedure
      .input(
        z.object({
          periodStart: z.string(),
          periodEnd: z.string(),
          groupId: z.number().optional(),
          costCenterId: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        const batchId = await db.createPayrollBatch({
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          groupId: input.groupId,
          costCenterId: input.costCenterId,
        });

        return { batchId, success: true };
      }),

    calculateDailyFinancesForPeriod: t.procedure
      .input(
        z.object({
          workerId: z.number(),
          periodStart: z.string(),
          periodEnd: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        // Calculate daily finances for each day in the period
        const startDate = new Date(input.periodStart);
        const endDate = new Date(input.periodEnd);

        const results = [];
        for (
          let d = new Date(startDate);
          d <= endDate;
          d.setDate(d.getDate() + 1)
        ) {
          try {
            await calculateDailyFinanceFromAttendance(input.workerId, d);
            results.push({ date: d.toISOString().split("T")[0], success: true });
          } catch (error) {
            results.push({
              date: d.toISOString().split("T")[0],
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }

        return results;
      }),

    aggregatePayrollData: t.procedure
      .input(
        z.object({
          workerId: z.number(),
          periodStart: z.string(),
          periodEnd: z.string(),
        })
      )
      .query(async ({ input }) => {
        return await db.aggregatePayrollData(
          input.workerId,
          input.periodStart,
          input.periodEnd
        );
      }),

    getBatchDetails: t.procedure
      .input(z.object({ batchId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPayrollBatchDetails(input.batchId);
      }),

    approveBatch: t.procedure
      .input(z.object({ batchId: z.number() }))
      .mutation(async ({ input }) => {
        await db.approvePayrollBatch(input.batchId);
        return { success: true };
      }),

    rejectBatch: t.procedure
      .input(z.object({ batchId: z.number(), reason: z.string() }))
      .mutation(async ({ input }) => {
        await db.rejectPayrollBatch(input.batchId, input.reason);
        return { success: true };
      }),
  }),

  // ============================================
  // Group Schedules (الورديات الديناميكية)
  // ============================================
  groupSchedules: t.router({
    listByGroup: t.procedure
      .input(z.object({ groupId: z.number().optional() }))
      .query(async ({ input }) => {
        return await db.getGroupSchedules(input.groupId);
      }),

    update: t.procedure
      .input(
        z.object({
          id: z.number(),
          startTime: z.string(),
          endTime: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        await db
          .update(groupSchedules)
          .set({
            startTime: input.startTime,
            endTime: input.endTime,
          })
          .where(eq(groupSchedules.id, input.id));

        return { success: true };
      }),
  }),

  // ============================================
  // Operational Flags (البلاغات التشغيلية)
  // ============================================
  operationalFlags: t.router({
    checkUnresolved: t.procedure
      .input(
        z.object({
          groupId: z.number().optional(),
          dateRange: z
            .object({
              start: z.date(),
              end: z.date(),
            })
            .optional(),
        })
      )
      .query(async ({ input }) => {
        const query = db
          .select({ count: sql<number>`COUNT(*)` })
          .from(operationalFlags)
          .where(eq(operationalFlags.status, "unresolved"));

        if (input.groupId) {
          query.where(eq(operationalFlags.groupId, input.groupId));
        }

        const result = await query;
        return { count: result[0]?.count || 0 };
      }),
  }),

  // ============================================
  // System (النظام)
  // ============================================
  system: t.router({
    notifyOwner: t.procedure
      .input(
        z.object({
          title: z.string(),
          content: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        return await sendNotification({
          title: input.title,
          content: input.content,
        });
      }),
  }),

  // ============================================
  // Auth (المصادقة)
  // ============================================
  auth: t.router({
    me: t.procedure.query(async ({ ctx }) => {
      return ctx.user || null;
    }),

    logout: t.procedure.mutation(async ({ ctx }) => {
      // Logout logic handled by middleware
      return { success: true };
    }),

    localLogin: t.procedure
      .input(
        z.object({
          username: z.string(),
          password: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        const user = await database
          .select()
          .from(users)
          .where(eq(users.username, input.username))
          .limit(1);

        if (!user || user.length === 0) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "اسم المستخدم أو كلمة السر غير صحيحة",
          });
        }

        const foundUser = user[0];

        if (foundUser.passwordHash !== input.password) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "اسم المستخدم أو كلمة السر غير صحيحة",
          });
        }

        await database
          .update(users)
          .set({ lastSignedIn: new Date() })
          .where(eq(users.id, foundUser.id));

        return {
          success: true,
          user: {
            id: foundUser.id,
            username: foundUser.username,
            fullName: foundUser.fullName,
            role: foundUser.role,
          },
        };
      }),
  }),
});

export type AppRouter = typeof router;
