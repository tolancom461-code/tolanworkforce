import { getDb } from './server/_core/db.ts';
import { users } from './drizzle/schema.ts';

async function main() {
  const db = await getDb();
  const result = await db.select({ id: users.id, username: users.username, fullName: users.fullName, role: users.role }).from(users);
  for (const u of result) {
    console.log(u.id, u.username, u.role);
  }
  process.exit(0);
}
main();
