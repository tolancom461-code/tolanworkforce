import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const DATABASE_URL = process.env.DATABASE_URL;

const testUsers = [
  { username: 'guard_user', fullName: 'حارس الأمن', role: 'guard', password: 'Tolan@123' },
  { username: 'supervisor_tolan', fullName: 'مشرف تولان', role: 'supervisor', password: 'Tolan@123' },
  { username: 'supervisor_malqa', fullName: 'مشرف الملقا', role: 'supervisor', password: 'Tolan@123' },
  { username: 'admin_affairs', fullName: 'الشؤون الإدارية', role: 'admin_affairs', password: 'Tolan@123' },
  { username: 'accountant', fullName: 'المحاسب المالي', role: 'accountant', password: 'Tolan@123' },
  { username: 'auditor', fullName: 'المراجع المالي', role: 'auditor', password: 'Tolan@123' },
  { username: 'finance_manager', fullName: 'المدير المالي', role: 'finance_manager', password: 'Tolan@123' },
  { username: 'executive', fullName: 'الإدارة العليا', role: 'executive', password: 'Tolan@123' },
];

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);
  
  // First, clean up old test users (keep id=1 owner, id=30004 admin)
  await conn.execute("DELETE FROM users WHERE id NOT IN (1, 30004) AND username LIKE 'test_%' OR username LIKE 'inactive_%' OR username LIKE 'admin_test_%'");
  console.log('Cleaned up old test users');
  
  // Create test users for each role
  for (const user of testUsers) {
    // Check if already exists
    const [existing] = await conn.execute('SELECT id FROM users WHERE username = ?', [user.username]);
    if (existing.length > 0) {
      // Update role
      await conn.execute('UPDATE users SET role = ?, full_name = ? WHERE username = ?', [user.role, user.fullName, user.username]);
      console.log(`Updated: ${user.username} → ${user.role}`);
    } else {
      const passwordHash = await bcrypt.hash(user.password, 10);
      await conn.execute(
        'INSERT INTO users (username, password_hash, full_name, role, is_active) VALUES (?, ?, ?, ?, ?)',
        [user.username, passwordHash, user.fullName, user.role, true]
      );
      console.log(`Created: ${user.username} → ${user.role}`);
    }
  }
  
  // Assign cost centers to supervisors
  // Get supervisor IDs
  const [supervisors] = await conn.execute("SELECT id, username FROM users WHERE username IN ('supervisor_tolan', 'supervisor_malqa')");
  const [costCenters] = await conn.execute("SELECT id, code FROM cost_centers");
  
  console.log('\nSupervisors:', supervisors);
  console.log('Cost Centers:', costCenters);
  
  for (const sup of supervisors) {
    // Clear existing assignments
    await conn.execute('DELETE FROM user_cost_centers WHERE user_id = ?', [sup.id]);
    
    if (sup.username === 'supervisor_tolan') {
      // Assign CC01 (تولان)
      const cc = costCenters.find(c => c.code === 'CC01');
      if (cc) {
        await conn.execute('INSERT INTO user_cost_centers (user_id, cost_center_id) VALUES (?, ?)', [sup.id, cc.id]);
        console.log(`Assigned ${sup.username} → CC01`);
      }
    } else if (sup.username === 'supervisor_malqa') {
      // Assign CC02 (الملقا)
      const cc = costCenters.find(c => c.code === 'CC02');
      if (cc) {
        await conn.execute('INSERT INTO user_cost_centers (user_id, cost_center_id) VALUES (?, ?)', [sup.id, cc.id]);
        console.log(`Assigned ${sup.username} → CC02`);
      }
    }
  }
  
  // Verify: Show all users
  const [allUsers] = await conn.execute('SELECT id, username, full_name, role FROM users ORDER BY id');
  console.log('\n=== All Users ===');
  console.table(allUsers);
  
  // Verify: Show cost center assignments
  const [assignments] = await conn.execute(`
    SELECT u.username, u.full_name, cc.code as cost_center_code, cc.name as cost_center_name
    FROM user_cost_centers ucc
    JOIN users u ON u.id = ucc.user_id
    JOIN cost_centers cc ON cc.id = ucc.cost_center_id
  `);
  console.log('\n=== Cost Center Assignments ===');
  console.table(assignments);
  
  await conn.end();
}

main().catch(console.error);
