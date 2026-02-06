# TolanWorkforce - قائمة المهام

## المحرك البرمجي (Programming Engine)

- [x] إنشاء Backend Logic للحساب التلقائي عند check_out
- [x] إنشاء calculateAndSaveDailyFinance function
- [x] ربط الحساب التلقائي بـ recordAttendance
- [x] التأكد من جاهزية الورديات الديناميكية (group_schedules)
- [x] إصلاح جميع أخطاء TypeScript
- [x] اختبار المنطق البرمجي
- [x] كتابة اختبارات vitest للحسابات (20 اختبار - جميعها نجحت)

## الورديات الديناميكية (Dynamic Schedules)

- [x] إضافة حقل effectiveDate إلى schema في جدول groupSchedules
- [x] تطبيق migration على قاعدة البيانات
- [x] تحديث دوال getGroupSchedules و updateGroupSchedule لدعم effectiveDate
- [x] تحديث واجهة DynamicSchedules لعرض وتعديل effectiveDate
- [x] اختبار الميزة
- [ ] منطق التطبيق التلقائي للورديات عند وصول effectiveDate

## نظام تسجيل الدخول المحلي (Local Authentication System)

- [x] تحديث schema لإضافة حقول username و password_hash
- [x] تثبيت مكتبة bcryptjs للتشفير
- [x] إضافة دالة localLogin في server/routers.ts
- [x] إنشاء صفحة LocalLogin.tsx
- [x] إضافة مستخدم admin افتراضي
- [x] اختبار تسجيل الدخول المحلي

## زر تسجيل الخروج (Logout Button)

- [x] إضافة زر تسجيل الخروج في DashboardLayout (القائمة الجانبية)
- [x] إضافة زر تسجيل الخروج في الصفحة الرئيسية (Header)
- [x] اختبار وظيفة تسجيل الخروج
