import pg from 'pg';

const { Client } = pg;

const DATABASE_URL = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set');
  process.exit(1);
}

async function setupTestData() {
  console.log('🚀 بدء تهيئة بيانات الاختبار...\n');

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    // 1. إنشاء 3 مراكز تكلفة
    console.log('📊 إنشاء مراكز التكلفة...');
    const costCentersData = [
      { code: 'CC001', name: 'مركز تكلفة الإنتاج', description: 'قسم الإنتاج الرئيسي' },
      { code: 'CC002', name: 'مركز تكلفة الصيانة', description: 'قسم الصيانة والدعم الفني' },
      { code: 'CC003', name: 'مركز تكلفة الإدارة', description: 'الإدارة والموارد البشرية' },
    ];

    const insertedCostCenters = [];
    for (const cc of costCentersData) {
      const result = await client.query(
        `INSERT INTO cost_centers (code, name, description, is_active) 
         VALUES ($1, $2, $3, true) 
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [cc.code, cc.name, cc.description]
      );
      insertedCostCenters.push(result.rows[0].id);
      console.log(`  ✅ ${cc.name} (ID: ${result.rows[0].id})`);
    }

    // 2. إنشاء 3 مجموعات عمل
    console.log('\n👥 إنشاء مجموعات العمل...');
    const groupsData = [
      {
        code: 'GRP001',
        name: 'مجموعة الوردية الصباحية',
        costCenterId: insertedCostCenters[0],
        dailyRate: 150.00,
        workHours: 8.00,
        dailyWage: 150.00,
        workMinutes: 480,
        minuteCost: 0.3125,
        latePenaltyRate: 0.50,
        earlyLeavePenaltyRate: 0.50,
        shiftStartTime: '08:00',
        shiftEndTime: '16:00',
      },
      {
        code: 'GRP002',
        name: 'مجموعة الوردية المسائية',
        costCenterId: insertedCostCenters[1],
        dailyRate: 160.00,
        workHours: 8.00,
        dailyWage: 160.00,
        workMinutes: 480,
        minuteCost: 0.3333,
        latePenaltyRate: 0.50,
        earlyLeavePenaltyRate: 0.50,
        shiftStartTime: '16:00',
        shiftEndTime: '00:00',
      },
      {
        code: 'GRP003',
        name: 'مجموعة الإدارة',
        costCenterId: insertedCostCenters[2],
        dailyRate: 200.00,
        workHours: 7.00,
        dailyWage: 200.00,
        workMinutes: 420,
        minuteCost: 0.4762,
        latePenaltyRate: 1.00,
        earlyLeavePenaltyRate: 1.00,
        shiftStartTime: '09:00',
        shiftEndTime: '16:00',
      },
    ];

    const insertedGroups = [];
    for (const grp of groupsData) {
      const result = await client.query(
        `INSERT INTO groups (
          code, name, cost_center_id, daily_rate, work_hours, 
          daily_wage, work_minutes, minute_cost, late_penalty_rate, 
          early_leave_penalty_rate, shift_start_time, shift_end_time, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true)
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id`,
        [
          grp.code, grp.name, grp.costCenterId, grp.dailyRate, grp.workHours,
          grp.dailyWage, grp.workMinutes, grp.minuteCost, grp.latePenaltyRate,
          grp.earlyLeavePenaltyRate, grp.shiftStartTime, grp.shiftEndTime
        ]
      );
      insertedGroups.push(result.rows[0].id);
      console.log(`  ✅ ${grp.name} (ID: ${result.rows[0].id})`);
    }

    // 3. إضافة 9 موظفين (3 لكل مجموعة)
    console.log('\n👤 إضافة الموظفين...');
    const workersData = [
      // مجموعة 1
      { code: 'W001', fullName: 'أحمد محمد علي', nationalId: '1234567890', phone: '0501234567', groupId: insertedGroups[0], dailyRate: 150.00 },
      { code: 'W002', fullName: 'محمد أحمد حسن', nationalId: '1234567891', phone: '0501234568', groupId: insertedGroups[0], dailyRate: 150.00 },
      { code: 'W003', fullName: 'علي حسن محمود', nationalId: '1234567892', phone: '0501234569', groupId: insertedGroups[0], dailyRate: 150.00 },
      // مجموعة 2
      { code: 'W004', fullName: 'خالد عبدالله سعيد', nationalId: '1234567893', phone: '0501234570', groupId: insertedGroups[1], dailyRate: 160.00 },
      { code: 'W005', fullName: 'سعيد خالد عمر', nationalId: '1234567894', phone: '0501234571', groupId: insertedGroups[1], dailyRate: 160.00 },
      { code: 'W006', fullName: 'عمر سعيد يوسف', nationalId: '1234567895', phone: '0501234572', groupId: insertedGroups[1], dailyRate: 160.00 },
      // مجموعة 3
      { code: 'W007', fullName: 'يوسف إبراهيم طارق', nationalId: '1234567896', phone: '0501234573', groupId: insertedGroups[2], dailyRate: 200.00 },
      { code: 'W008', fullName: 'إبراهيم طارق فهد', nationalId: '1234567897', phone: '0501234574', groupId: insertedGroups[2], dailyRate: 200.00 },
      { code: 'W009', fullName: 'طارق فهد ماجد', nationalId: '1234567898', phone: '0501234575', groupId: insertedGroups[2], dailyRate: 200.00 },
    ];

    for (const worker of workersData) {
      const result = await client.query(
        `INSERT INTO workers (code, full_name, national_id, phone, group_id, daily_rate, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')
         ON CONFLICT (code) DO UPDATE SET full_name = EXCLUDED.full_name
         RETURNING id`,
        [worker.code, worker.fullName, worker.nationalId, worker.phone, worker.groupId, worker.dailyRate]
      );
      console.log(`  ✅ ${worker.fullName} (ID: ${result.rows[0].id}, Code: ${worker.code})`);
    }

    console.log('\n✅ تم إنشاء بيانات الاختبار بنجاح!');
    console.log(`\n📊 الملخص:`);
    console.log(`   - مراكز التكلفة: 3`);
    console.log(`   - المجموعات: 3`);
    console.log(`   - الموظفين: 9`);

  } catch (error) {
    console.error('❌ خطأ أثناء إنشاء بيانات الاختبار:', error);
    throw error;
  } finally {
    await client.end();
  }
}

setupTestData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
