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


## واجهة إدارة الورديات الأسبوعية (Weekly Shifts Management UI)

- [x] تصميم واجهة عرض أيام الأسبوع السبعة
- [x] إضافة حقول تعديل أوقات البداية والنهاية لكل يوم
- [x] إضافة حقل effectiveDate لتحديد تاريخ التطبيق
- [x] إضافة زر حفظ جماعي للتغييرات
- [x] إضافة دوال Backend لحفظ الورديات الأسبوعية
- [x] اختبار الواجهة مع بيانات حقيقية


## إصلاح خطأ updated_at في جدول groups

- [x] إضافة الأعمدة المفقودة إلى جدول groups
- [x] اختبار إنشاء مجموعة جديدة (تم إصلاح الأعمدة)


## إضافة عمود is_automatic لجدول attendance_events

- [x] تحديث schema.ts بإضافة حقل isAutomatic
- [x] إضافة عمود is_automatic إلى قاعدة البيانات
- [x] تحديث الدوال المتعلقة بالحضور (تلقائياً من schema)
- [x] اختبار النظام (لا توجد أخطاء)
