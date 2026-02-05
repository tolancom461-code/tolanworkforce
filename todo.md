# TolanWorkforce - نظام إدارة القوى العاملة

## المرحلة 1: نظام المصادقة المحلي ✅ مكتملة

- [x] نظام مصادقة محلي (Local Authentication) بدلاً من Manus OAuth
- [x] تسجيل الدخول باستخدام اسم المستخدم وكلمة المرور
- [x] تشفير كلمات المرور باستخدام bcryptjs
- [x] إنشاء JWT tokens للمصادقة
- [x] تخزين التوكن في sessionStorage (يُمسح عند إغلاق التاب)
- [x] إضافة Authorization Header إلى جميع طلبات tRPC
- [x] تحديث Backend للتعرف على Bearer tokens
- [x] صفحة تسجيل دخول (LandingPage) بتصميم احترافي
- [x] صفحة Dashboard مع Sidebar Navigation
- [x] نظام المستخدمين مع جدول users في قاعدة البيانات
- [x] مستخدم admin تجريبي (admin / ADMIN1)

## المرحلة 2: Cleanup والتنظيف الشامل ✅ مكتملة

- [x] حذف أي كود زائد أو محاولات فاشلة
- [x] تنظيف الـ imports والمكتبات غير المستخدمة
- [x] توحيد منطق المصادقة (Bearer Token + OAuth fallback)
- [x] إضافة تعليقات واضحة في server/routers.ts و server/_core/sdk.ts
- [x] اختبار واجهات المتصفح والـ Sidebar Navigation
- [x] استبدال bcrypt بـ bcryptjs لـ Node.js v22 compatibility
- [x] إضافة Page1.tsx و Page2.tsx
- [x] تحديث App.tsx مع التعليقات الواضحة
- [x] إصلاح مشاكل useAuth() و localStorage
- [x] اختبار كامل لـ Sidebar Navigation والتنقل بين الصفحات

## المرحلة 3: بناء المميزات الأساسية (قادمة)

- [ ] صفحة إدارة الموظفين (Employees Management)
- [ ] صفحة إدارة الأقسام (Departments Management)
- [ ] صفحة إدارة الرواتب (Salaries Management)
- [ ] نظام الأدوار والصلاحيات (Roles & Permissions)
- [ ] نظام الإجازات (Leave Management)

## الأخطاء المصححة

- [x] مشكلة 404 في الـ endpoint `/api/trpc/auth.localLogin` - تم إنشاء الـ endpoint
- [x] مشكلة عدم التعرف على Bearer tokens - تم تحديث `authenticateRequest` في sdk.ts
- [x] مشكلة عدم حفظ التوكن بشكل صحيح - تم استخدام sessionStorage
- [x] مشكلة عدم إضافة Authorization header - تم تحديث main.tsx
- [x] مشكلة bcrypt مع Node.js v22 - تم استبدالها بـ bcryptjs
- [x] مشكلة useAuth() يكتب null إلى localStorage - تم إصلاحها
- [x] مشكلة الـ routing في DashboardLayout - تم تصحيح الـ paths

## ملاحظات تقنية

### نظام المصادقة
- **طريقة المصادقة**: Bearer Token + JWT (Local) مع OAuth fallback
- **تخزين التوكن**: sessionStorage على الـ Frontend
- **إرسال التوكن**: Authorization header (Bearer <token>)
- **مدة صلاحية التوكن**: 15 دقيقة
- **تشفير كلمة المرور**: bcryptjs (Node.js v22 compatible)

### المكتبات المستخدمة
- bcryptjs@3.0.3 - تشفير كلمة المرور
- jsonwebtoken@9.0.3 - إنشاء والتحقق من JWT tokens
- jose@6.1.0 - التحقق من JWT في Backend

### الملفات الرئيسية
- `server/routers.ts` - تعريف الـ tRPC procedures مع localLogin
- `server/_core/sdk.ts` - منطق المصادقة (Bearer Token + OAuth)
- `server/db.ts` - دوال قاعدة البيانات
- `client/src/pages/LandingPage.tsx` - صفحة تسجيل الدخول
- `client/src/components/DashboardLayout.tsx` - Sidebar Navigation
- `client/src/pages/Page1.tsx` و `Page2.tsx` - صفحات المحتوى
- `client/src/App.tsx` - Routing والـ Layout الرئيسي

### الأمان
- كلمات المرور مشفرة باستخدام bcryptjs مع salt 10
- JWT tokens موقعة باستخدام HS256
- Authorization header يُتحقق منه على الـ backend
- CORS مفعل للسماح بالطلبات من الـ frontend

## الخطوات التالية

1. **بناء صفحة إدارة الموظفين** - جدول مع خيارات الإضافة والتعديل والحذف
2. **إضافة نظام الأدوار والصلاحيات** - admin, manager, employee
3. **بناء صفحات الأقسام والرواتب** - إدارة البيانات الأساسية
4. **إضافة نظام الإجازات** - طلب وموافقة على الإجازات
5. **اختبار شامل للنظام** - vitest unit tests + integration tests

## حالة الـ Deployment

✅ **النظام جاهز للـ Deployment**
- الكود نظيف ومنظم
- جميع المكتبات متوافقة مع Node.js v22
- نظام المصادقة مستقل تماماً
- واجهات المتصفح تعمل بشكل صحيح
- Sidebar Navigation يعمل بسلاسة
- جميع الـ routes محمية بالمصادقة


## المرحلة 3: إصلاح الاتصال بـ Supabase ✅ مكتملة

- [x] تشخيص مشكلة الاتصال بـ PostgreSQL (port 5432 مغلق)
- [x] تحويل الاتصال من postgres-js إلى Supabase REST API
- [x] إعادة بناء جدول users في Supabase
- [x] تحديث schema.ts ليطابق أعمدة الجدول الفعلية
- [x] تحويل دوال قاعدة البيانات لاستخدام REST API
- [x] إصلاح مشاكل bcrypt hash
- [x] اختبار نظام تسجيل الدخول بنجاح

## المرحلة 4: بناء واجهات إدارة الموارد البشرية (جاري التطوير)

### صفحة إدارة الموظفين (Employees Management)
- [ ] إنشاء جدول يعرض قائمة الموظفين
- [ ] إضافة خيار إضافة موظف جديد (Add Employee)
- [ ] إضافة خيار تعديل بيانات الموظف (Edit Employee)
- [ ] إضافة خيار حذف موظف (Delete Employee)
- [ ] إضافة search و filter للموظفين
- [ ] إضافة pagination للجدول

### صفحة الحضور والغياب (Attendance Management)
- [ ] إنشاء جدول يعرض سجل الحضور والغياب
- [ ] إضافة خيار تسجيل الحضور (Check-in)
- [ ] إضافة خيار تسجيل الانصراف (Check-out)
- [ ] إضافة خيار تعديل سجل الحضور (Edit Attendance)
- [ ] إضافة تقارير الحضور الشهرية
- [ ] إضافة نظام الورديات (Shift System)

### صفحة إدارة الرواتب (Payroll Management)
- [ ] إنشاء جدول يعرض الرواتب
- [ ] إضافة خيار حساب الرواتب (Calculate Payroll)
- [ ] إضافة خيار إنشاء دفعة رواتب (Create Payroll Batch)
- [ ] إضافة خيار تعديل الراتب (Edit Salary)
- [ ] إضافة تقارير الرواتب
- [ ] إضافة نظام الخصومات والإضافات

### صفحة إدارة الأقسام (Departments Management)
- [ ] إنشاء جدول يعرض الأقسام
- [ ] إضافة خيار إضافة قسم جديد (Add Department)
- [ ] إضافة خيار تعديل القسم (Edit Department)
- [ ] إضافة خيار حذف قسم (Delete Department)

### صفحة إدارة الإجازات (Leave Management)
- [ ] إنشاء جدول يعرض طلبات الإجازات
- [ ] إضافة خيار طلب إجازة (Request Leave)
- [ ] إضافة خيار الموافقة على الإجازة (Approve Leave)
- [ ] إضافة خيار رفض الإجازة (Reject Leave)
- [ ] إضافة نظام أنواع الإجازات (Leave Types)


## المرحلة 4: إعادة توصيل الواجهات بـ Supabase (جاري التطوير)

- [ ] إعادة توصيل صفحة الموظفين (Workers) بـ Supabase
  - [ ] إنشاء دالة في server/db.ts لجلب الموظفين من جدول workers
  - [ ] إنشاء tRPC procedure للحصول على قائمة الموظفين
  - [ ] تحديث صفحة Workers.tsx لعرض البيانات من Supabase
  - [ ] إضافة خيارات CRUD (إضافة/تعديل/حذف)
  
- [ ] إعادة توصيل صفحة الحضور (Attendance) بـ Supabase
  - [ ] إنشاء دالة في server/db.ts لجلب بيانات الحضور من جدول attendance_events
  - [ ] إنشاء tRPC procedure للحصول على سجل الحضور
  - [ ] تحديث صفحة Attendance.tsx لعرض البيانات من Supabase
  
- [ ] تحديث Dashboard بأرقام حقيقية
  - [ ] جلب عدد الموظفين من جدول workers
  - [ ] جلب إحصائيات الحضور من جدول attendance_events
  - [ ] جلب معلومات الرواتب من جداول الرواتب
  
- [ ] إصلاح القائمة الجانبية (Sidebar)
  - [ ] استبدال Page 1 و Page 2 بـ Employees و Attendance و Payroll و Settings
  - [ ] ربط كل عنصر بالصفحة المناسبة
  - [ ] إضافة أيقونات لكل عنصر
  
- [ ] اختبار شامل
  - [ ] التحقق من أن جميع الصفحات تعرض البيانات بشكل صحيح
  - [ ] التحقق من أن الروابط تعمل بشكل صحيح
  - [ ] التحقق من أن البيانات تُحدّث بشكل فوري
