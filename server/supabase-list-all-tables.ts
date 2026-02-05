import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * دالة للحصول على جميع الجداول من Supabase
 * باستخدام information_schema
 */
export async function getAllTables() {
  try {
    // محاولة الحصول على الجداول من information_schema
    const { data, error } = await supabase
      .from("information_schema.tables")
      .select("table_name, table_schema")
      .eq("table_schema", "public");

    if (error) {
      console.log("❌ لا يمكن الوصول إلى information_schema");
      console.log("سأحاول طريقة بديلة...\n");
      
      // طريقة بديلة: محاولة الاتصال بالجداول المعروفة
      return await getAllTablesAlternative();
    }

    return data;
  } catch (error) {
    console.error("خطأ:", error);
    return await getAllTablesAlternative();
  }
}

/**
 * طريقة بديلة: محاولة الاتصال بجداول معروفة
 */
async function getAllTablesAlternative() {
  const commonTables = [
    "users",
    "employees",
    "attendance",
    "payroll",
    "departments",
    "leaves",
    "shifts",
    "groups",
    "daily_finance",
    "cost_centers",
    "employees_groups",
    "payroll_batches",
    "attendance_logs",
    "leave_requests",
    "shift_assignments",
    "salary_components",
    "deductions",
    "allowances",
    "employee_documents",
    "employee_contacts",
    "employee_bank_info",
    "department_heads",
    "shift_templates",
    "holiday_calendar",
    "overtime_records",
    "advance_salary",
    "loan_records",
    "employee_skills",
    "training_records",
    "performance_reviews",
  ];

  const tables: Record<string, { count: number; columns: string[] }> = {};

  for (const table of commonTables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select("*", { count: "exact" })
        .limit(1);

      if (!error) {
        tables[table] = {
          count: count || 0,
          columns: data && data.length > 0 ? Object.keys(data[0]) : [],
        };
      }
    } catch (e) {
      // تجاهل الأخطاء
    }
  }

  return tables;
}

// تشغيل الدالة
getAllTables().then((tables) => {
  console.log("📊 جميع الجداول الموجودة في Supabase:\n");
  
  if (Array.isArray(tables)) {
    tables.forEach((t: any) => {
      console.log(`- ${t.table_name} (schema: ${t.table_schema})`);
    });
  } else {
    Object.entries(tables).forEach(([name, info]: [string, any]) => {
      console.log(`✅ ${name}`);
      console.log(`   - الصفوف: ${info.count}`);
      if (info.columns.length > 0) {
        console.log(`   - الأعمدة: ${info.columns.join(", ")}`);
      }
      console.log();
    });
  }
});
