import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function seedOperationalFlags() {
  const connection = await mysql.createConnection(DATABASE_URL);

  console.log('Starting to seed operational flags...\n');

  try {
    // Get first worker and group
    const [workers] = await connection.execute('SELECT id FROM workers LIMIT 5');
    const [groups] = await connection.execute('SELECT id FROM `groups` LIMIT 3');
    const [users] = await connection.execute('SELECT id FROM users LIMIT 1');

    if (workers.length === 0 || groups.length === 0 || users.length === 0) {
      console.log('❌ No workers, groups, or users found. Please seed workers and groups first.');
      await connection.end();
      return;
    }

    const workerId1 = workers[0].id;
    const workerId2 = workers.length > 1 ? workers[1].id : workers[0].id;
    const workerId3 = workers.length > 2 ? workers[2].id : workers[0].id;
    const workerId4 = workers.length > 3 ? workers[3].id : workers[0].id;
    const workerId5 = workers.length > 4 ? workers[4].id : workers[0].id;
    
    const groupId1 = groups[0].id;
    const groupId2 = groups.length > 1 ? groups[1].id : groups[0].id;
    const groupId3 = groups.length > 2 ? groups[2].id : groups[0].id;
    
    const userId = users[0].id;

    // Sample operational flags
    const flags = [
      {
        flagType: 'emergency_call',
        workerId: workerId1,
        groupId: groupId1,
        flagDate: new Date('2025-01-15'),
        description: 'استدعاء طارئ للعامل بسبب نقص في العمالة - يوم 15 يناير',
        status: 'PENDING_ADMIN_ACTION',
        createdBy: userId,
      },
      {
        flagType: 'justified_late',
        workerId: workerId2,
        groupId: groupId1,
        flagDate: new Date('2025-01-14'),
        description: 'تأخر العامل 30 دقيقة بسبب ظروف مرورية استثنائية',
        status: 'PENDING_ADMIN_ACTION',
        createdBy: userId,
      },
      {
        flagType: 'justified_early_leave',
        workerId: workerId3,
        groupId: groupId2,
        flagDate: new Date('2025-01-16'),
        description: 'خروج مبكر بسبب ظرف عائلي طارئ',
        status: 'PENDING_ADMIN_ACTION',
        createdBy: userId,
      },
      {
        flagType: 'justified_absence',
        workerId: workerId4,
        groupId: groupId2,
        flagDate: new Date('2025-01-13'),
        description: 'غياب مبرر بسبب مرض - تم تقديم شهادة طبية',
        status: 'PENDING_ADMIN_ACTION',
        createdBy: userId,
      },
      {
        flagType: 'proposed_deduction',
        workerId: workerId5,
        groupId: groupId3,
        flagDate: new Date('2025-01-17'),
        amount: 50.00,
        description: 'خصم مقترح بسبب تأخر متكرر خلال الأسبوع',
        status: 'PENDING_ADMIN_ACTION',
        createdBy: userId,
      },
      {
        flagType: 'proposed_bonus',
        workerId: workerId1,
        groupId: groupId1,
        flagDate: new Date('2025-01-18'),
        amount: 100.00,
        description: 'إضافة مقترحة كمكافأة للأداء المتميز',
        status: 'PENDING_ADMIN_ACTION',
        createdBy: userId,
      },
      {
        flagType: 'general_report',
        workerId: workerId2,
        groupId: groupId1,
        flagDate: new Date('2025-01-12'),
        description: 'بلاغ عام: العامل أظهر التزاماً استثنائياً في العمل الإضافي',
        status: 'PENDING_ADMIN_ACTION',
        createdBy: userId,
      },
      {
        flagType: 'emergency_call',
        workerId: workerId3,
        groupId: groupId2,
        flagDate: new Date('2025-01-19'),
        description: 'استدعاء طارئ لتغطية وردية عامل غائب',
        status: 'RESOLVED',
        createdBy: userId,
        resolvedBy: userId,
        resolvedAt: new Date('2025-01-19 10:00:00'),
        resolutionAction: 'تم اعتماد يوم كامل للعامل',
      },
    ];

    let addedCount = 0;
    for (const flag of flags) {
      const query = `
        INSERT INTO operational_flags (
          flag_type, worker_id, group_id, flag_date, end_date,
          amount, description, attachments, status,
          created_by, resolved_by, resolved_at, resolution_action
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      await connection.execute(query, [
        flag.flagType,
        flag.workerId,
        flag.groupId,
        flag.flagDate,
        flag.endDate || null,
        flag.amount || null,
        flag.description,
        flag.attachments || null,
        flag.status,
        flag.createdBy,
        flag.resolvedBy || null,
        flag.resolvedAt || null,
        flag.resolutionAction || null,
      ]);
      
      addedCount++;
      console.log(`✓ Added flag: ${flag.flagType} for worker ${flag.workerId} - ${flag.status}`);
    }

    console.log(`\n✅ Operational flags seeding completed!`);
    console.log(`Total flags added: ${addedCount}`);

    // Show summary
    const [pendingCount] = await connection.execute(
      'SELECT COUNT(*) as total FROM operational_flags WHERE status = "PENDING_ADMIN_ACTION"'
    );
    const [resolvedCount] = await connection.execute(
      'SELECT COUNT(*) as total FROM operational_flags WHERE status = "RESOLVED"'
    );
    
    console.log(`\nSummary:`);
    console.log(`  Pending flags: ${pendingCount[0].total}`);
    console.log(`  Resolved flags: ${resolvedCount[0].total}`);

  } catch (error) {
    console.error('Error seeding operational flags:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

seedOperationalFlags().catch(console.error);
