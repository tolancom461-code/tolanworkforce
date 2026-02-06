import { getDb, calculateAndSaveDailyFinance } from './server/db.js';
import { attendanceEvents } from './drizzle/schema.js';
import { eq } from 'drizzle-orm';

async function testBackfill() {
  console.log('🚀 Starting backfill test...');
  
  try {
    const db = await getDb();
    if (!db) {
      console.error('❌ Database not available');
      return;
    }

    // Get all check_out events
    const checkOutEvents = await db
      .select()
      .from(attendanceEvents)
      .where(eq(attendanceEvents.eventType, 'check_out'))
      .orderBy(attendanceEvents.eventTime);

    console.log(`📊 Found ${checkOutEvents.length} check_out events`);

    let processed = 0;
    let errors = 0;

    for (const event of checkOutEvents) {
      console.log(`\n🔄 Processing event ${event.id}:`);
      console.log(`   Worker ID: ${event.workerId}`);
      console.log(`   Check-out time: ${event.eventTime}`);
      
      try {
        await calculateAndSaveDailyFinance(event.workerId, new Date(event.eventTime));
        processed++;
        console.log(`   ✅ Success!`);
      } catch (error) {
        console.error(`   ❌ Error:`, error.message);
        errors++;
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   Total: ${checkOutEvents.length}`);
    console.log(`   Processed: ${processed}`);
    console.log(`   Errors: ${errors}`);
    
  } catch (error) {
    console.error('❌ Backfill failed:', error);
  }
  
  process.exit(0);
}

testBackfill();
