import Database from 'better-sqlite3';

const db = new Database(process.env.DATABASE_URL?.replace('file:', '') || './local.db');

const additionalPermissions = [
  // HR (4 permissions)
  { code: 'export_workers', name: 'تصدير قائمة العمال', description: 'تصدير قائمة العمال إلى Excel', category: 'HR' },
  { code: 'view_worker_details', name: 'عرض تفاصيل عامل', description: 'عرض تفاصيل عامل محدد', category: 'HR' },
  { code: 'export_groups', name: 'تصدير المجموعات', description: 'تصدير قائمة المجموعات إلى Excel', category: 'HR' },
  { code: 'export_cost_centers', name: 'تصدير مراكز التكلفة', description: 'تصدير قائمة مراكز التكلفة إلى Excel', category: 'HR' },
  
  // Attendance (5 permissions)
  { code: 'export_attendance_log', name: 'تصدير سجل الحضور', description: 'تصدير سجل الحضور إلى Excel', category: 'Attendance' },
  { code: 'view_worker_card', name: 'عرض بطاقة عامل', description: 'عرض بطاقة عامل مع QR Code', category: 'Attendance' },
  { code: 'print_worker_card', name: 'طباعة بطاقة عامل', description: 'طباعة بطاقة عامل', category: 'Attendance' },
  { code: 'approve_attendance_adjustment', name: 'اعتماد تعديل الحضور', description: 'اعتماد تعديل على سجل الحضور', category: 'Attendance' },
  { code: 'reject_attendance_adjustment', name: 'رفض تعديل الحضور', description: 'رفض تعديل على سجل الحضور', category: 'Attendance' },
  
  // Operational Flags (2 permissions)
  { code: 'view_flag_details', name: 'عرض تفاصيل بلاغ', description: 'عرض تفاصيل بلاغ تشغيلي محدد', category: 'Operational Flags' },
  { code: 'export_flags', name: 'تصدير البلاغات', description: 'تصدير البلاغات التشغيلية إلى Excel', category: 'Operational Flags' },
  
  // Finance (5 permissions)
  { code: 'view_payroll_batch_details', name: 'عرض تفاصيل دفعة راتب', description: 'عرض تفاصيل دفعة راتب محددة', category: 'Finance' },
  { code: 'cancel_payroll_batch', name: 'إلغاء دفعة راتب', description: 'إلغاء دفعة راتب', category: 'Finance' },
  { code: 'reject_payroll_batch', name: 'رفض دفعة راتب', description: 'رفض دفعة راتب', category: 'Finance' },
  { code: 'export_payroll_batch', name: 'تصدير دفعة راتب', description: 'تصدير دفعة راتب إلى Excel', category: 'Finance' },
  { code: 'view_finance_entry_history', name: 'عرض تاريخ الخصومات/الإضافات', description: 'عرض تاريخ الخصومات والإضافات لعامل', category: 'Finance' },
  
  // System (2 permissions)
  { code: 'view_user_activity_log', name: 'عرض سجل نشاط المستخدمين', description: 'عرض سجل نشاط وتسجيل دخول المستخدمين', category: 'System' },
  { code: 'export_audit_log', name: 'تصدير سجل المراجعة', description: 'تصدير سجل المراجعة والتدقيق', category: 'System' },
];

console.log('Adding 18 additional permissions...\n');

for (const perm of additionalPermissions) {
  try {
    db.prepare(`
      INSERT INTO permission (code, name, description, category, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(perm.code, perm.name, perm.description, perm.category);
    
    console.log(`✓ Added: ${perm.code} (${perm.name})`);
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      console.log(`⊘ Already exists: ${perm.code}`);
    } else {
      console.error(`✗ Error adding ${perm.code}:`, error.message);
    }
  }
}

console.log('\n✅ Done! 18 additional permissions processed.');
db.close();
