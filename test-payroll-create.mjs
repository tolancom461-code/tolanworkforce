import fetch from 'node-fetch';

console.log('🧪 Testing payroll batch creation...\n');

const periodStart = '2026-02-06';
const periodEnd = '2026-02-06';
const costCenterId = 1;

// Step 1: Get workers
console.log('📋 Step 1: Getting workers...');
const workersResponse = await fetch('http://localhost:3000/api/trpc/workers.list');
const workersData = await workersResponse.json();
const workers = workersData.result?.data || [];
console.log(`Found ${workers.length} workers\n`);

// Step 2: Calculate daily finances for each worker
console.log('💰 Step 2: Calculating daily finances...');
for (const worker of workers) {
  console.log(`  Worker ${worker.id}: ${worker.fullName || worker.code}`);
  
  // Call calculateDailyFinancesForPeriod
  const calcResponse = await fetch('http://localhost:3000/api/trpc/payroll.calculateDailyFinancesForPeriod', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workerId: worker.id,
      periodStart,
      periodEnd,
    }),
  });
  
  if (!calcResponse.ok) {
    console.log(`    ❌ Error: ${calcResponse.statusText}`);
    continue;
  }
  
  console.log(`    ✅ Calculated`);
}

console.log('\n📊 Step 3: Aggregating payroll data...');
const results = [];
for (const worker of workers) {
  const aggResponse = await fetch(
    `http://localhost:3000/api/trpc/payroll.aggregatePayrollData?input=${encodeURIComponent(
      JSON.stringify({
        workerId: worker.id,
        periodStart,
        periodEnd,
      })
    )}`
  );
  
  if (!aggResponse.ok) {
    console.log(`  ❌ Worker ${worker.id}: ${aggResponse.statusText}`);
    continue;
  }
  
  const aggData = await aggResponse.json();
  const aggregated = aggData.result?.data;
  
  if (!aggregated || aggregated.daysWorked === 0) {
    console.log(`  ⚠️  Worker ${worker.id}: No data`);
    continue;
  }
  
  console.log(`  ✅ Worker ${worker.id}: ${aggregated.daysWorked} days, ${aggregated.netAmount} SAR`);
  results.push({
    workerId: worker.id,
    workerName: worker.fullName || worker.code,
    ...aggregated,
  });
}

console.log(`\n🎉 Summary:`);
console.log(`  Workers with data: ${results.length}`);
console.log(`  Total net amount: ${results.reduce((sum, r) => sum + parseFloat(r.netAmount), 0).toFixed(2)} SAR`);
