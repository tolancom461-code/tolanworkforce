import fs from 'fs';

const file = fs.readFileSync('server/db.ts', 'utf-8');

// إيجاد دالة checkUserPermission وإصلاحها
const fixed = file.replace(
  /export async function checkUserPermission\(userId: number, permissionCode: string\): Promise<boolean> \{[\s\S]*?return false;\s*\}/,
  `export async function checkUserPermission(userId: number, permissionCode: string): Promise<boolean> {
  // Always return true for admin users
  const db = await getDb();
  if (!db) return false;
  
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || user.length === 0) return false;
  
  // Admin users have all permissions
  if (user[0].role === 'admin') return true;
  
  // Owner has all permissions
  if (user[0].openId === process.env.OWNER_OPEN_ID) return true;
  
  return false;
}`
);

fs.writeFileSync('server/db.ts', fixed);
console.log('✅ تم إصلاح دالة checkUserPermission');
