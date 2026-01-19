import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Assigning ALL permissions to SUPER_ADMIN role...\n');

// Step 1: Get super_admin role ID
const { data: roles, error: roleError } = await supabase
  .from('roles')
  .select('id, name')
  .eq('name', 'super_admin')
  .single();

if (roleError || !roles) {
  console.error('✗ Error: Could not find SUPER_ADMIN role');
  process.exit(1);
}

console.log(`✓ Found SUPER_ADMIN role (ID: ${roles.id})`);

// Step 2: Get ALL permissions
const { data: allPermissions, error: permError } = await supabase
  .from('permissions')
  .select('id, code');

if (permError || !allPermissions) {
  console.error('✗ Error: Could not fetch permissions');
  process.exit(1);
}

console.log(`✓ Found ${allPermissions.length} permissions\n`);

// Step 3: Delete existing role_permissions for SUPER_ADMIN
const { error: deleteError } = await supabase
  .from('role_permissions')
  .delete()
  .eq('role_id', roles.id);

if (deleteError) {
  console.error('✗ Error deleting existing permissions:', deleteError.message);
} else {
  console.log('✓ Cleared existing SUPER_ADMIN permissions\n');
}

// Step 4: Insert ALL permissions for SUPER_ADMIN
let successCount = 0;
let errorCount = 0;

for (const perm of allPermissions) {
  const { error } = await supabase
    .from('role_permissions')
    .insert({
      role_id: roles.id,
      permission_id: perm.id,
    });
  
  if (error) {
    console.error(`✗ Error adding ${perm.code}:`, error.message);
    errorCount++;
  } else {
    console.log(`✓ Added: ${perm.code}`);
    successCount++;
  }
}

console.log(`\n✅ Done! ${successCount} permissions assigned to SUPER_ADMIN`);
if (errorCount > 0) {
  console.log(`⚠️  ${errorCount} errors occurred`);
}
