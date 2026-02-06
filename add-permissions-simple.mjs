import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const additionalPermissions = [
  // HR (4 permissions)
  { code: 'export_workers', name: 'Export Workers', description: 'Export workers list to Excel', category: 'HR' },
  { code: 'view_worker_details', name: 'View Worker Details', description: 'View specific worker details', category: 'HR' },
  { code: 'export_groups', name: 'Export Groups', description: 'Export groups list to Excel', category: 'HR' },
  { code: 'export_cost_centers', name: 'Export Cost Centers', description: 'Export cost centers list to Excel', category: 'HR' },
  
  // Attendance (5 permissions)
  { code: 'export_attendance_log', name: 'Export Attendance Log', description: 'Export attendance log to Excel', category: 'Attendance' },
  { code: 'view_worker_card', name: 'View Worker Card', description: 'View worker card with QR Code', category: 'Attendance' },
  { code: 'print_worker_card', name: 'Print Worker Card', description: 'Print worker card', category: 'Attendance' },
  { code: 'approve_attendance_adjustment', name: 'Approve Attendance Adjustment', description: 'Approve attendance record adjustment', category: 'Attendance' },
  { code: 'reject_attendance_adjustment', name: 'Reject Attendance Adjustment', description: 'Reject attendance record adjustment', category: 'Attendance' },
  
  // Operational Flags (2 permissions)
  { code: 'view_flag_details', name: 'View Flag Details', description: 'View specific operational flag details', category: 'Operational Flags' },
  { code: 'export_flags', name: 'Export Flags', description: 'Export operational flags to Excel', category: 'Operational Flags' },
  
  // Finance (5 permissions)
  { code: 'view_payroll_batch_details', name: 'View Payroll Batch Details', description: 'View specific payroll batch details', category: 'Finance' },
  { code: 'cancel_payroll_batch', name: 'Cancel Payroll Batch', description: 'Cancel payroll batch', category: 'Finance' },
  { code: 'reject_payroll_batch', name: 'Reject Payroll Batch', description: 'Reject payroll batch', category: 'Finance' },
  { code: 'export_payroll_batch', name: 'Export Payroll Batch', description: 'Export payroll batch to Excel', category: 'Finance' },
  { code: 'view_finance_entry_history', name: 'View Finance Entry History', description: 'View deductions/additions history for worker', category: 'Finance' },
  
  // System (2 permissions)
  { code: 'view_user_activity_log', name: 'View User Activity Log', description: 'View user activity and login log', category: 'System' },
  { code: 'export_audit_log', name: 'Export Audit Log', description: 'Export audit and review log', category: 'System' },
];

console.log('Adding 18 additional permissions...\n');

for (const perm of additionalPermissions) {
  const { data, error } = await supabase
    .from('permissions')
    .insert({
      code: perm.code,
      name: perm.name,
      description: perm.description,
      created_at: new Date().toISOString(),
    });
  
  if (error) {
    if (error.code === '23505') { // Unique violation
      console.log(`⊘ Already exists: ${perm.code}`);
    } else {
      console.error(`✗ Error adding ${perm.code}:`, error.message);
    }
  } else {
    console.log(`✓ Added: ${perm.code} (${perm.name})`);
  }
}

console.log('\n✅ Done! 18 additional permissions processed.');
