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


## تشخيص وإصلاح مشكلة دفعة الرواتب

- [x] فحص بيانات attendance_events
- [x] فحص بيانات worker_daily_finance
- [x] التحقق من عمل المحرك التلقائي
- [x] إصلاح calculateAndSaveDailyFinance لحفظ في الأعمدة الجديدة
- [x] إعادة حساب البيانات بنجاح
- [x] إضافة التحقق من تسجيل الدخول في صفحة إنشاء دفعة رواتب
- [x] إضافة redirect تلقائي لصفحة تسجيل الدخول
- [ ] إعادة بناء صفحة إنشاء دفعة رواتب من الصفر بشكل بسيط
- [ ] اختبار الصفحة الجديدة والتأكد من عملها


## ميزة الملاحظات النصية لدفعات الرواتب

- [x] إضافة backend procedures (addBatchNote, getBatchNotes)
- [x] تحديث واجهة تفاصيل الدفعة لعرض الملاحظات
- [x] إضافة نموذج لإضافة ملاحظة جديدة
- [x] اختبار الميزة بالكامل


## فحص شامل للنظام - الأخطاء المكتشفة

### أخطاء Backend (server/)
- [x] حذف بقايا دوال الورديات من server/db.ts (السطور 372-418)
- [x] إضافة دالة getFullDayOverrideStatus المفقودة في server/db.ts
- [x] إضافة دالة updateFullDayOverride المفقودة في server/db.ts
- [x] حذف مراجع updateGroupSchedule من server/routers.ts
- [x] حذف مراجع saveWeeklySchedules من server/routers.ts
- [ ] إصلاح type لـ allBatches في server/db.ts (السطر 1939)
- [ ] إصلاح خطأ Property 'name' في server/db.ts (السطر 5014)

### أخطاء Frontend (client/)
- [ ] إصلاح ProtectedRoute في App.tsx (السطور 193, 197)
- [ ] إصلاح PayrollBatches.tsx - إضافة items parameter
- [ ] إصلاح AdvancedPayrollPage.tsx - إضافة items parameter
- [ ] إصلاح PayrollBatchCreate.tsx - إضافة items parameter
- [ ] إصلاح PayrollBatchCreateSimple.tsx - استبدال id بـ batchId (تم)

### فحص الجداول والواجهات
- [ ] التحقق من ربط جميع الجداول بالواجهات
- [ ] فحص العلاقات بين الجداول (Foreign Keys)
- [ ] التأكد من عدم وجود جداول غير مستخدمة

### اختبار نهائي
- [ ] اختبار النظام بالكامل
- [ ] حفظ checkpoint نهائي


## حذف الورديات وإصلاح دفعات الرواتب
- [ ] البحث عن جميع المراجع للورديات في الواجهات
- [ ] حذف جميع المراجع للورديات من Groups.tsx
- [ ] حذف جميع المراجع للورديات من App.tsx
- [ ] إصلاح PayrollBatches.tsx - تمرير items بشكل صحيح
- [ ] إصلاح PayrollBatchCreate.tsx - تمرير items بشكل صحيح
- [ ] إصلاح AdvancedPayrollPage.tsx - تمرير items بشكل صحيح
- [ ] إصلاح PayrollBatchCreateSimple.tsx - استبدال id بـ batchId
- [ ] إصلاح ProtectedRoute في App.tsx
- [ ] إصلاح type لـ allBatches في server/db.ts
- [ ] إصلاح خطأ Property 'name' في server/db.ts
- [ ] فحص شامل للنظام
- [ ] حفظ checkpoint نهائي
