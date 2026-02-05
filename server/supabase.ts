import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client للاتصال بقاعدة البيانات الخارجية
 * يستخدم Service Key للوصول الكامل من الـ Backend
 */
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase credentials in environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * دالة للتحقق من الاتصال بـ Supabase
 */
export async function testSupabaseConnection() {
  try {
    const { data, error, count } = await supabase
      .from("users")
      .select("id", { count: "exact" })
      .limit(1);

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    return { success: true, message: "✅ تم الاتصال بـ Supabase بنجاح", count };
  } catch (error) {
    return {
      success: false,
      message: `❌ فشل الاتصال بـ Supabase: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * دالة للحصول على قائمة الجداول المعروفة
 */
export async function getTablesList() {
  try {
    const knownTables = [
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
    ];

    const tables: Record<string, { count: number; columns: string[] }> = {};

    for (const table of knownTables) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select("*", { count: "exact" })
          .limit(1);

        if (!error && data) {
          tables[table] = {
            count: count || 0,
            columns: Object.keys(data[0] || {}),
          };
        }
      } catch (e) {
        // تجاهل الأخطاء للجداول غير الموجودة
      }
    }

    return tables;
  } catch (error) {
    throw new Error(
      `Failed to get tables: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * دالة للحصول على جميع الجداول الموجودة (بحث شامل)
 */
export async function getAllTables() {
  try {
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
  } catch (error) {
    throw new Error(
      `Failed to get all tables: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
