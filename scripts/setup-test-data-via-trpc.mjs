import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000/api/trpc';

async function callTRPC(procedure, input) {
  const response = await fetch(`${API_URL}/${procedure}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`TRPC call failed: ${error}`);
  }

  return await response.json();
}

async function setupTestData() {
  console.log('🚀 بدء تهيئة بيانات الاختبار عبر tRPC...\n');

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
      try {
        const result = await callTRPC('costCenter.create', cc);
        insertedCostCenters.push(result.result.data.id);
        console.log(`  ✅ ${cc.name} (ID: ${result.result.data.id})`);
      } catch (error) {
        console.log(`  ⚠️  ${cc.name} - قد يكون موجوداً بالفعل`);
        // محاولة الحصول على ID من القائمة
        const list = await callTRPC('costCenter.list', {});
        const existing = list.result.data.find(c => c.code === cc.code);
        if (existing) {
          insertedCostCenters.push(existing.id);
        }
      }
    }

    // 2. إنشاء 3 مجموعات عمل
    console.log('\n👥 إنشاء مجموعات العمل...');
    const groupsData = [
      {
        code: 'GRP001',
        name: 'مجموعة الوردية الصباحية',
        costCenterId: insertedCostCenters[0],
        dailyRate: '150.00',
        workHours: '8.00',
      },
      {
        code: 'GRP002',
        name: 'مجموعة الوردية المسائية',
        costCenterId: insertedCostCenters[1],
        dailyRate: '160.00',
        workHours: '8.00',
      },
      {
        code: 'GRP003',
        name: 'مجموعة الإدارة',
        costCenterId: insertedCostCenters[2],
        dailyRate: '200.00',
        workHours: '7.00',
      },
    ];

    const insertedGroups = [];
    for (const grp of groupsData) {
      try {
        const result = await callTRPC('group.create', grp);
        insertedGroups.push(result.result.data.id);
        console.log(`  ✅ ${grp.name} (ID: ${result.result.data.id})`);
      } catch (error) {
        console.log(`  ⚠️  ${grp.name} - قد يكون موجوداً بالفعل`);
        const list = await callTRPC('group.list', {});
        const existing = list.result.data.find(g => g.code === grp.code);
        if (existing) {
          insertedGroups.push(existing.id);
        }
      }
    }

    // 3. إضافة 9 موظفين (3 لكل مجموعة)
    console.log('\n👤 إضافة الموظفين...');
    const workersData = [
      // مجموعة 1
      { code: 'W001', fullName: 'أحمد محمد علي', nationalId: '1234567890', phone: '0501234567', groupId: insertedGroups[0], dailyRate: '150.00' },
      { code: 'W002', fullName: 'محمد أحمد حسن', nationalId: '1234567891', phone: '0501234568', groupId: insertedGroups[0], dailyRate: '150.00' },
      { code: 'W003', fullName: 'علي حسن محمود', nationalId: '1234567892', phone: '0501234569', groupId: insertedGroups[0], dailyRate: '150.00' },
      // مجموعة 2
      { code: 'W004', fullName: 'خالد عبدالله سعيد', nationalId: '1234567893', phone: '0501234570', groupId: insertedGroups[1], dailyRate: '160.00' },
      { code: 'W005', fullName: 'سعيد خالد عمر', nationalId: '1234567894', phone: '0501234571', groupId: insertedGroups[1], dailyRate: '160.00' },
      { code: 'W006', fullName: 'عمر سعيد يوسف', nationalId: '1234567895', phone: '0501234572', groupId: insertedGroups[1], dailyRate: '160.00' },
      // مجموعة 3
      { code: 'W007', fullName: 'يوسف إبراهيم طارق', nationalId: '1234567896', phone: '0501234573', groupId: insertedGroups[2], dailyRate: '200.00' },
      { code: 'W008', fullName: 'إبراهيم طارق فهد', nationalId: '1234567897', phone: '0501234574', groupId: insertedGroups[2], dailyRate: '200.00' },
      { code: 'W009', fullName: 'طارق فهد ماجد', nationalId: '1234567898', phone: '0501234575', groupId: insertedGroups[2], dailyRate: '200.00' },
    ];

    for (const worker of workersData) {
      try {
        const result = await callTRPC('worker.create', worker);
        console.log(`  ✅ ${worker.fullName} (ID: ${result.result.data.id}, Code: ${worker.code})`);
      } catch (error) {
        console.log(`  ⚠️  ${worker.fullName} - قد يكون موجوداً بالفعل`);
      }
    }

    console.log('\n✅ تم إنشاء بيانات الاختبار بنجاح!');
    console.log(`\n📊 الملخص:`);
    console.log(`   - مراكز التكلفة: 3`);
    console.log(`   - المجموعات: 3`);
    console.log(`   - الموظفين: 9`);

  } catch (error) {
    console.error('❌ خطأ أثناء إنشاء بيانات الاختبار:', error);
    throw error;
  }
}

setupTestData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
