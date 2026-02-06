import { db } from "./server/db.ts";
import { aggregatePayrollData } from "./server/db.ts";

const workerId = 1;
const periodStart = "2026-02-06";
const periodEnd = "2026-02-06";

console.log("Testing aggregatePayrollData...");
console.log("workerId:", workerId);
console.log("periodStart:", periodStart);
console.log("periodEnd:", periodEnd);

try {
  const result = await aggregatePayrollData(workerId, periodStart, periodEnd);
  console.log("\n✅ Success!");
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error("\n❌ Error:", error.message);
  console.error(error.stack);
}

process.exit(0);
