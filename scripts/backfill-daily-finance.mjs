#!/usr/bin/env node
/**
 * Backfill Daily Finance
 * 
 * هذا السكريبت يمر على جميع بصمات check_out الموجودة في attendance_events
 * ويحسب الرواتب اليومية لها في worker_daily_finance
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { attendanceEvents, workers, groups } from '../drizzle/schema.js';
import { eq, and, isNull } from 'drizzle-orm';

const DATABASE_URL = process.env.SUPABASE_DB_URL;

if (!DATABASE_URL) {
  console.error('❌ SUPABASE_DB_URL environment variable is not set');
  process.exit(1);
}

async function backfillDailyFinance() {
  console.log('🚀 Starting backfill process...\n');

  // Create database connection
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);

  try {
    // Get all check_out events
    const checkOutEvents = await db
      .select()
      .from(attendanceEvents)
      .where(eq(attendanceEvents.eventType, 'check_out'))
      .orderBy(attendanceEvents.eventTime);

    console.log(`📊 Found ${checkOutEvents.length} check_out events\n`);

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    for (const event of checkOutEvents) {
      try {
        // Get worker info
        const worker = await db
          .select()
          .from(workers)
          .where(eq(workers.id, event.workerId))
          .limit(1);

        if (!worker || worker.length === 0) {
          console.log(`⚠️  Worker ${event.workerId} not found - skipping`);
          skipped++;
          continue;
        }

        // Get group info
        const group = await db
          .select()
          .from(groups)
          .where(eq(groups.id, worker[0].groupId))
          .limit(1);

        if (!group || group.length === 0) {
          console.log(`⚠️  Group ${worker[0].groupId} not found - skipping`);
          skipped++;
          continue;
        }

        // Calculate daily finance using the same logic as calculateAndSaveDailyFinance
        const { calculateAndSaveDailyFinance } = await import('../server/db.js');
        
        await calculateAndSaveDailyFinance(event.workerId, new Date(event.eventTime));
        
        processed++;
        console.log(`✅ Processed: Worker ${event.workerId} - ${new Date(event.eventTime).toLocaleDateString('ar-SA')}`);
        
      } catch (error) {
        errors++;
        console.error(`❌ Error processing event ${event.id}:`, error.message);
      }
    }

    console.log(`\n📈 Backfill Summary:`);
    console.log(`   ✅ Processed: ${processed}`);
    console.log(`   ⚠️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📊 Total: ${checkOutEvents.length}\n`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

// Run the backfill
backfillDailyFinance()
  .then(() => {
    console.log('✅ Backfill completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  });
