import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./drizzle/schema.ts";
import { eq, and, gte, lte } from "drizzle-orm";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: "default" });

console.log("🚀 Starting payroll batches seed...");

// Get existing data
const groups = await db.select().from(schema.groups);
const workers = await db.select().from(schema.workers);
const users = await db.select().from(schema.users);

if (groups.length === 0 || workers.length === 0) {
  console.error("❌ No groups or workers found. Please run seed-demo-data.mjs first.");
  process.exit(1);
}

// Find users by role
const hrAdmin = users.find(u => u.role === "admin" || (u.name && u.name.includes("مدير")));
const accountant = users.find(u => u.name && u.name.includes("محاسب"));
const financialReviewer = users.find(u => u.name && u.name.includes("مراجع"));
const accountsManager = users.find(u => u.name && u.name.includes("مدير الحسابات"));

console.log(`Found ${groups.length} groups, ${workers.length} workers`);
console.log(`HR Admin: ${hrAdmin?.name}, Accountant: ${accountant?.name}`);

// Helper function to generate batch code
function generateBatchCode(index) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `PAY-${year}${month}-${String(index).padStart(3, "0")}`;
}

// Helper function to create batch items
async function createBatchItems(batchId, periodStart, periodEnd) {
  const items = [];
  
  for (const worker of workers.slice(0, 10)) { // First 10 workers
    const dailyWage = Number(worker.dailyWage) || 100; // Default 100 if not set
    const baseAmount = dailyWage * 7; // 7 days
    const deductions = Math.floor(Math.random() * 200); // Random deductions
    const bonuses = Math.floor(Math.random() * 300); // Random bonuses
    const netAmount = baseAmount - deductions + bonuses;

    items.push({
      batchId,
      workerId: worker.id,
      workerName: worker.name,
      workerCode: worker.code,
      baseAmount: baseAmount.toString(),
      totalDeductions: deductions.toString(),
      totalBonuses: bonuses.toString(),
      netAmount: netAmount.toString(),
      notes: null,
    });
  }

  await db.insert(schema.payrollBatchItems).values(items);
  
  // Calculate totals
  const totalAmount = items.reduce((sum, item) => sum + Number(item.netAmount), 0);
  return { totalWorkers: items.length, totalAmount };
}

// Helper function to add note
async function addNote(batchId, reviewerId, reviewerName, reviewerRole, noteType, noteText) {
  await db.insert(schema.payrollBatchNotes).values({
    batchId,
    reviewerId,
    reviewerRole,
    noteType,
    note: noteText,
    createdAt: new Date(),
  });
}

try {
  // Clean existing payroll data
  console.log("🧹 Cleaning existing payroll batches...");
  await db.delete(schema.payrollBatchNotes);
  await db.delete(schema.payrollBatchCorrections);
  await db.delete(schema.payrollBatchItems);
  await db.delete(schema.payrollBatches);

  const now = new Date();
  const batches = [];

  // Batch 1: Draft (مسودة)
  console.log("📝 Creating batch 1: Draft");
  const batch1Start = new Date(now.getFullYear(), now.getMonth(), 1);
  const batch1End = new Date(now.getFullYear(), now.getMonth(), 7);
  
  const [batch1Result] = await db.insert(schema.payrollBatches).values({
    batchCode: generateBatchCode(1),
    periodStart: batch1Start,
    periodEnd: batch1End,
    status: "draft",
    createdById: hrAdmin?.id || 1,
    createdByName: hrAdmin?.name || "مدير الموارد البشرية",
    groupId: groups[0].id,
    costCenterId: groups[0].costCenterId,
    totalWorkers: 0,
    totalAmount: "0",
    rejectionCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  
  const batch1Id = batch1Result.insertId;
  const batch1Totals = await createBatchItems(batch1Id, batch1Start, batch1End);
  await db.update(schema.payrollBatches)
    .set({ 
      totalWorkers: batch1Totals.totalWorkers, 
      totalAmount: batch1Totals.totalAmount.toString() 
    })
    .where(eq(schema.payrollBatches.id, batch1Id));

  // Batch 2: Under Accountant Review (تحت مراجعة المحاسب)
  console.log("📊 Creating batch 2: Under Accountant Review");
  const batch2Start = new Date(now.getFullYear(), now.getMonth(), 8);
  const batch2End = new Date(now.getFullYear(), now.getMonth(), 14);
  
  const [batch2Result] = await db.insert(schema.payrollBatches).values({
    batchCode: generateBatchCode(2),
    periodStart: batch2Start,
    periodEnd: batch2End,
    status: "under_accountant_review",
    createdById: hrAdmin?.id || 1,
    createdByName: hrAdmin?.name || "مدير الموارد البشرية",
    groupId: groups[1]?.id || groups[0].id,
    costCenterId: groups[1]?.costCenterId || groups[0].costCenterId,
    totalWorkers: 0,
    totalAmount: "0",
    rejectionCount: 0,
    submittedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
    createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
    updatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
  });
  
  const batch2Id = batch2Result.insertId;
  const batch2Totals = await createBatchItems(batch2Id, batch2Start, batch2End);
  await db.update(schema.payrollBatches)
    .set({ 
      totalWorkers: batch2Totals.totalWorkers, 
      totalAmount: batch2Totals.totalAmount.toString() 
    })
    .where(eq(schema.payrollBatches.id, batch2Id));

  // Batch 3: Returned from Accountant (مرفوضة من المحاسب)
  console.log("❌ Creating batch 3: Returned from Accountant");
  const batch3Start = new Date(now.getFullYear(), now.getMonth(), 15);
  const batch3End = new Date(now.getFullYear(), now.getMonth(), 21);
  
  const [batch3Result] = await db.insert(schema.payrollBatches).values({
    batchCode: generateBatchCode(3),
    periodStart: batch3Start,
    periodEnd: batch3End,
    status: "returned_from_accountant",
    createdById: hrAdmin?.id || 1,
    createdByName: hrAdmin?.name || "مدير الموارد البشرية",
    groupId: groups[2]?.id || groups[0].id,
    costCenterId: groups[2]?.costCenterId || groups[0].costCenterId,
    totalWorkers: 0,
    totalAmount: "0",
    rejectionCount: 1,
    submittedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
    createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
    updatedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
  });
  
  const batch3Id = batch3Result.insertId;
  const batch3Totals = await createBatchItems(batch3Id, batch3Start, batch3End);
  await db.update(schema.payrollBatches)
    .set({ 
      totalWorkers: batch3Totals.totalWorkers, 
      totalAmount: batch3Totals.totalAmount.toString() 
    })
    .where(eq(schema.payrollBatches.id, batch3Id));
  
  await addNote(
    batch3Id,
    accountant?.id || 2,
    accountant?.name || "المحاسب",
    "accountant",
    "critical",
    "يوجد خطأ في حساب الخصومات للعامل أحمد محمد. يرجى المراجعة والتصحيح."
  );

  // Batch 4: Under Financial Review (تحت مراجعة المراجع المالي)
  console.log("💰 Creating batch 4: Under Financial Review");
  const batch4Start = new Date(now.getFullYear(), now.getMonth() - 1, 22);
  const batch4End = new Date(now.getFullYear(), now.getMonth() - 1, 28);
  
  const [batch4Result] = await db.insert(schema.payrollBatches).values({
    batchCode: generateBatchCode(4),
    periodStart: batch4Start,
    periodEnd: batch4End,
    status: "under_financial_review",
    createdById: hrAdmin?.id || 1,
    createdByName: hrAdmin?.name || "مدير الموارد البشرية",
    groupId: groups[0].id,
    costCenterId: groups[0].costCenterId,
    totalWorkers: 0,
    totalAmount: "0",
    rejectionCount: 0,
    submittedAt: new Date(now.getTime() - 10 * 60 * 60 * 1000),
    createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
    updatedAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
  });
  
  const batch4Id = batch4Result.insertId;
  const batch4Totals = await createBatchItems(batch4Id, batch4Start, batch4End);
  await db.update(schema.payrollBatches)
    .set({ 
      totalWorkers: batch4Totals.totalWorkers, 
      totalAmount: batch4Totals.totalAmount.toString() 
    })
    .where(eq(schema.payrollBatches.id, batch4Id));
  
  await addNote(
    batch4Id,
    accountant?.id || 2,
    accountant?.name || "المحاسب",
    "accountant",
    "info",
    "تمت المراجعة. جميع الحسابات صحيحة."
  );

  // Batch 5: Under Accounts Manager Review (تحت مراجعة مدير الحسابات)
  console.log("👔 Creating batch 5: Under Accounts Manager Review");
  const batch5Start = new Date(now.getFullYear(), now.getMonth() - 1, 15);
  const batch5End = new Date(now.getFullYear(), now.getMonth() - 1, 21);
  
  const [batch5Result] = await db.insert(schema.payrollBatches).values({
    batchCode: generateBatchCode(5),
    periodStart: batch5Start,
    periodEnd: batch5End,
    status: "under_accounts_manager_review",
    createdById: hrAdmin?.id || 1,
    createdByName: hrAdmin?.name || "مدير الموارد البشرية",
    groupId: groups[1]?.id || groups[0].id,
    costCenterId: groups[1]?.costCenterId || groups[0].costCenterId,
    totalWorkers: 0,
    totalAmount: "0",
    rejectionCount: 0,
    submittedAt: new Date(now.getTime() - 20 * 60 * 60 * 1000),
    createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    updatedAt: new Date(now.getTime() - 15 * 60 * 60 * 1000),
  });
  
  const batch5Id = batch5Result.insertId;
  const batch5Totals = await createBatchItems(batch5Id, batch5Start, batch5End);
  await db.update(schema.payrollBatches)
    .set({ 
      totalWorkers: batch5Totals.totalWorkers, 
      totalAmount: batch5Totals.totalAmount.toString() 
    })
    .where(eq(schema.payrollBatches.id, batch5Id));
  
  await addNote(
    batch5Id,
    accountant?.id || 2,
    accountant?.name || "المحاسب",
    "accountant",
    "info",
    "تمت المراجعة المحاسبية. جاهزة للاعتماد."
  );
  
  await addNote(
    batch5Id,
    financialReviewer?.id || 3,
    financialReviewer?.name || "المراجع المالي",
    "financial_reviewer",
    "info",
    "تمت المراجعة المالية. الأرقام متوافقة مع الميزانية."
  );

  // Batch 6: Approved (معتمدة)
  console.log("✅ Creating batch 6: Approved");
  const batch6Start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const batch6End = new Date(now.getFullYear(), now.getMonth() - 1, 7);
  
  const [batch6Result] = await db.insert(schema.payrollBatches).values({
    batchCode: generateBatchCode(6),
    periodStart: batch6Start,
    periodEnd: batch6End,
    status: "approved",
    createdById: hrAdmin?.id || 1,
    createdByName: hrAdmin?.name || "مدير الموارد البشرية",
    groupId: groups[0].id,
    costCenterId: groups[0].costCenterId,
    totalWorkers: 0,
    totalAmount: "0",
    rejectionCount: 0,
    submittedAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
    approvedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    approvedById: accountsManager?.id || 4,
    approvedByName: accountsManager?.name || "مدير الحسابات",
    createdAt: new Date(now.getTime() - 50 * 60 * 60 * 1000),
    updatedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
  });
  
  const batch6Id = batch6Result.insertId;
  const batch6Totals = await createBatchItems(batch6Id, batch6Start, batch6End);
  await db.update(schema.payrollBatches)
    .set({ 
      totalWorkers: batch6Totals.totalWorkers, 
      totalAmount: batch6Totals.totalAmount.toString() 
    })
    .where(eq(schema.payrollBatches.id, batch6Id));
  
  await addNote(
    batch6Id,
    accountsManager?.id || 4,
    accountsManager?.name || "مدير الحسابات",
    "accounts_manager",
    "info",
    "تم الاعتماد النهائي. جاهزة للصرف."
  );

  // Batch 7: Rejected Final (مرفوضة نهائياً)
  console.log("🚫 Creating batch 7: Rejected Final");
  const batch7Start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const batch7End = new Date(now.getFullYear(), now.getMonth() - 2, 7);
  
  const [batch7Result] = await db.insert(schema.payrollBatches).values({
    batchCode: generateBatchCode(7),
    periodStart: batch7Start,
    periodEnd: batch7End,
    status: "rejected_final",
    createdById: hrAdmin?.id || 1,
    createdByName: hrAdmin?.name || "مدير الموارد البشرية",
    groupId: groups[2]?.id || groups[0].id,
    costCenterId: groups[2]?.costCenterId || groups[0].costCenterId,
    totalWorkers: 0,
    totalAmount: "0",
    rejectionCount: 3,
    submittedAt: new Date(now.getTime() - 72 * 60 * 60 * 1000),
    createdAt: new Date(now.getTime() - 80 * 60 * 60 * 1000),
    updatedAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
  });
  
  const batch7Id = batch7Result.insertId;
  const batch7Totals = await createBatchItems(batch7Id, batch7Start, batch7End);
  await db.update(schema.payrollBatches)
    .set({ 
      totalWorkers: batch7Totals.totalWorkers, 
      totalAmount: batch7Totals.totalAmount.toString() 
    })
    .where(eq(schema.payrollBatches.id, batch7Id));
  
  await addNote(
    batch7Id,
    accountant?.id || 2,
    accountant?.name || "المحاسب",
    "accountant",
    "critical",
    "أخطاء متكررة في الحسابات. يرجى المراجعة الشاملة."
  );
  
  await addNote(
    batch7Id,
    accountsManager?.id || 4,
    accountsManager?.name || "مدير الحسابات",
    "accounts_manager",
    "critical",
    "تم الرفض النهائي بعد 3 محاولات. يجب إنشاء دفعة جديدة."
  );

  console.log("✅ Payroll batches seed completed!");
  console.log(`Created 7 batches with different statuses`);
  
} catch (error) {
  console.error("❌ Error seeding payroll batches:", error);
  throw error;
} finally {
  await connection.end();
}
