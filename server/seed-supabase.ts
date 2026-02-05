import { createClient } from "@supabase/supabase-js";
import bcryptjs from "bcryptjs";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * إضافة مستخدم تجريبي في جدول users
 */
async function seedUsers() {
  console.log("🔄 جاري إضافة مستخدم تجريبي...\n");

  // تشفير كلمة المرور
  const passwordHash = await bcryptjs.hash("admin123", 10);

  const { data, error } = await supabase
    .from("users")
    .insert([
      {
        username: "admin",
        email: "admin@tolanworkforce.com",
        password_hash: passwordHash,
        full_name: "مدير النظام",
        role: "admin",
        is_active: true,
      },
      {
        username: "manager",
        email: "manager@tolanworkforce.com",
        password_hash: passwordHash,
        full_name: "مدير الموارد البشرية",
        role: "manager",
        is_active: true,
      },
    ])
    .select();

  if (error) {
    console.log("⚠️ قد يكون المستخدمون موجودين بالفعل:", error.message);
  } else {
    console.log("✅ تم إضافة المستخدمين بنجاح:");
    data?.forEach((user: any) => {
      console.log(`   - ${user.username} (${user.full_name})`);
    });
  }
  console.log();
}

/**
 * إضافة بيانات تجريبية للموظفين
 */
async function seedWorkers() {
  console.log("🔄 جاري إضافة بيانات تجريبية للموظفين...\n");

  const workers = [
    {
      employee_id: "W001",
      full_name: "أحمد محمد علي",
      email: "ahmed@example.com",
      phone: "0501234567",
      position: "مهندس برمجيات",
      department: "تطوير",
      salary: 5000,
      is_active: true,
    },
    {
      employee_id: "W002",
      full_name: "فاطمة خالد سالم",
      email: "fatima@example.com",
      phone: "0502345678",
      position: "محاسبة",
      department: "المالية",
      salary: 4000,
      is_active: true,
    },
    {
      employee_id: "W003",
      full_name: "محمود عبدالله حسن",
      email: "mahmoud@example.com",
      phone: "0503456789",
      position: "مسؤول موارد بشرية",
      department: "الموارد البشرية",
      salary: 4500,
      is_active: true,
    },
    {
      employee_id: "W004",
      full_name: "سارة يوسف إبراهيم",
      email: "sarah@example.com",
      phone: "0504567890",
      position: "مصممة جرافيك",
      department: "التسويق",
      salary: 3500,
      is_active: true,
    },
    {
      employee_id: "W005",
      full_name: "علي محمد أحمد",
      email: "ali@example.com",
      phone: "0505678901",
      position: "مندوب مبيعات",
      department: "المبيعات",
      salary: 3000,
      is_active: true,
    },
  ];

  const { data, error } = await supabase
    .from("workers")
    .insert(workers)
    .select();

  if (error) {
    console.log("⚠️ قد يكون الموظفون موجودين بالفعل:", error.message);
  } else {
    console.log("✅ تم إضافة الموظفين بنجاح:");
    data?.forEach((worker: any) => {
      console.log(`   - ${worker.employee_id}: ${worker.full_name}`);
    });
  }
  console.log();
}

/**
 * إضافة بيانات تجريبية للحضور
 */
async function seedAttendance() {
  console.log("🔄 جاري إضافة بيانات تجريبية للحضور...\n");

  const today = new Date().toISOString().split("T")[0];

  const attendanceRecords = [
    {
      employee_id: "W001",
      date: today,
      check_in_time: "08:00:00",
      check_out_time: "17:00:00",
      status: "present",
    },
    {
      employee_id: "W002",
      date: today,
      check_in_time: "08:15:00",
      check_out_time: "17:15:00",
      status: "present",
    },
    {
      employee_id: "W003",
      date: today,
      check_in_time: "08:00:00",
      check_out_time: "17:00:00",
      status: "present",
    },
    {
      employee_id: "W004",
      date: today,
      status: "absent",
    },
    {
      employee_id: "W005",
      date: today,
      check_in_time: "09:00:00",
      check_out_time: "17:30:00",
      status: "present",
    },
  ];

  const { data, error } = await supabase
    .from("attendance_events")
    .insert(attendanceRecords)
    .select();

  if (error) {
    console.log("⚠️ قد تكون سجلات الحضور موجودة بالفعل:", error.message);
  } else {
    console.log("✅ تم إضافة سجلات الحضور بنجاح:");
    data?.forEach((record: any) => {
      console.log(`   - ${record.employee_id}: ${record.status}`);
    });
  }
  console.log();
}

/**
 * تشغيل جميع الدوال
 */
async function main() {
  console.log("🚀 جاري تحضير بيانات Supabase...\n");
  console.log("=====================================\n");

  try {
    await seedUsers();
    await seedWorkers();
    await seedAttendance();

    console.log("=====================================");
    console.log("✅ تم تحضير جميع البيانات بنجاح!\n");
    console.log("📝 بيانات الدخول:");
    console.log("   اسم المستخدم: admin");
    console.log("   كلمة المرور: admin123");
    console.log("\n   أو");
    console.log("   اسم المستخدم: manager");
    console.log("   كلمة المرور: admin123\n");
  } catch (error) {
    console.error("❌ خطأ:", error);
  }
}

main();
