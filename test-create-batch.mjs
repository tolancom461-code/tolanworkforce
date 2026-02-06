import { aggregatePayrollData } from "./server/db.ts";

console.log("Testing payroll batch creation...");

const periodStart = "2026-02-06";
const periodEnd = "2026-02-06";
const costCenterId = 1;

// Test with worker ID 1
console.log("\nTesting worker 1...");
try {
  const result = await aggregatePayrollData(1, periodStart, periodEnd);
  console.log("✅ Worker 1 result:", JSON.stringify(result, null, 2));
} catch (error) {
  console.error("❌ Worker 1 error:", error.message);
}

// Test with worker ID 2
console.log("\nTesting worker 2...");
try {
  const result = await aggregatePayrollData(2, periodStart, periodEnd);
  console.log("✅ Worker 2 result:", JSON.stringify(result, null, 2));
} catch (error) {
  console.error("❌ Worker 2 error:", error.message);
}

process.exit(0);
