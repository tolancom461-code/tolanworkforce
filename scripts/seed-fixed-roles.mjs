import mysql from "mysql2/promise";

// الأدوار الستة الثابتة
const FIXED_ROLES = [
  {
    code: "guard",
    name: "الحارس",
    description: "حارس الأمن - صلاحيات محدودة للحضور والانصراف",
    level: 1,
    isActive: true,
  },
  {
    code: "supervisor",
    name: "المشرف",
    description: "مشرف - إدارة المجموعات والعمال",
    level: 2,
    isActive: true,
  },
  {
    code: "accountant",
    name: "المحاسب المالي والمراجع",
    description: "محاسب مالي ومراجع - مراجعة واعتماد الرواتب",
    level: 3,
    isActive: true,
  },
  {
    code: "hr_admin",
    name: "الشؤون الإدارية",
    description: "مسؤول الشؤون الإدارية - إدارة الموارد البشرية والحضور",
    level: 4,
    isActive: true,
  },
  {
    code: "financial_manager",
    name: "المدير المالي",
    description: "المدير المالي - مراجعة نهائية للرواتب والتقارير المالية",
    level: 5,
    isActive: true,
  },
  {
    code: "general_manager",
    name: "المدير العام",
    description: "المدير العام - صلاحيات كاملة على النظام",
    level: 6,
    isActive: true,
  },
];

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  console.log("🚀 بدء إضافة الأدوار الستة الثابتة...\n");

  for (const role of FIXED_ROLES) {
    try {
      // التحقق من وجود الدور
      const [existing] = await connection.execute(
        "SELECT id FROM roles WHERE code = ?",
        [role.code]
      );

      if (existing.length > 0) {
        console.log(`⚠️  الدور "${role.name}" موجود بالفعل (${role.code})`);
        // تحديث isActive
        await connection.execute(
          "UPDATE roles SET is_active = ?, name = ?, description = ?, level = ? WHERE code = ?",
          [role.isActive, role.name, role.description, role.level, role.code]
        );
      } else {
        // إضافة الدور الجديد
        await connection.execute(
          "INSERT INTO roles (code, name, description, level, is_active) VALUES (?, ?, ?, ?, ?)",
          [role.code, role.name, role.description, role.level, role.isActive]
        );
        console.log(`✅ تم إضافة الدور "${role.name}" (${role.code})`);
      }
    } catch (error) {
      console.error(`❌ خطأ في إضافة الدور "${role.name}":`, error.message);
    }
  }

  console.log("\n✅ تم الانتهاء من إضافة الأدوار الستة الثابتة!");

  await connection.end();
}

main().catch((error) => {
  console.error("❌ خطأ في تنفيذ السكريبت:", error);
  process.exit(1);
});
