import { aggregatePayrollData } from './server/db.ts';

console.log('🧪 Testing aggregatePayrollData...\n');

const workerId = 1;
const periodStart = '2026-02-06';
const periodEnd = '2026-02-06';

console.log(`Worker ID: ${workerId}`);
console.log(`Period: ${periodStart} to ${periodEnd}\n`);

try {
  const result = await aggregatePayrollData(workerId, periodStart, periodEnd);
  console.log('✅ Result:', JSON.stringify(result, null, 2));
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
}
