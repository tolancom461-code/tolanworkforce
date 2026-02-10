import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Use tsx to run TypeScript
import { execSync } from 'child_process';
const result = execSync('cd /home/ubuntu/tolanworkforce && npx tsx -e "import * as db from \'./server/db\'; db.getAllWorkers().then(w => { console.log(JSON.stringify(w.slice(0,3).map(x => ({id: x.id, code: x.code})))); process.exit(0); })"', { encoding: 'utf-8' });
console.log(result);
