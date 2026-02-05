import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * الحصول على تفاصيل الأعمدة من جدول معين
 */
async function inspectTable(tableName: string) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .limit(1);

    if (error) {
      console.log(`❌ ${tableName}: ${error.message}`);
      return;
    }

    if (!data || data.length === 0) {
      console.log(`⚠️ ${tableName}: جدول فارغ`);
      return;
    }

    const columns = Object.keys(data[0]);
    console.log(`✅ ${tableName}:`);
    console.log(`   الأعمدة: ${columns.join(", ")}`);
    console.log();
  } catch (error) {
    console.log(`❌ ${tableName}: ${error}`);
  }
}

/**
 * تشغيل الفحص
 */
async function main() {
  console.log("🔍 جاري فحص أعمدة الجداول...\n");

  const tables = [
    "users",
    "workers",
    "attendance_events",
    "payroll_batch_items",
    "groups",
    "deductions",
    "allowances",
  ];

  for (const table of tables) {
    await inspectTable(table);
  }
}

main();
