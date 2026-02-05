# TolanWorkforce - نظام إدارة القوى العاملة

## المميزات المنجزة

- [x] نظام مصادقة محلي (Local Authentication) بدلاً من Manus OAuth
- [x] تسجيل الدخول باستخدام اسم المستخدم وكلمة المرور
- [x] تشفير كلمات المرور باستخدام bcrypt
- [x] إنشاء JWT tokens للمصادقة
- [x] تخزين التوكن في sessionStorage (يُمسح عند إغلاق التاب)
- [x] إضافة Authorization Header إلى جميع طلبات tRPC
- [x] تحديث Backend للتعرف على Bearer tokens
- [x] صفحة تسجيل دخول (LandingPage) بتصميم احترافي
- [x] صفحة Dashboard مع Sidebar Navigation
- [x] نظام المستخدمين مع جدول users في قاعدة البيانات
- [x] مستخدم admin تجريبي (admin / ADMIN1)

## المميزات المخطط لها

- [ ] إنشاء صفحات الموظفين (Employees Management)
- [ ] إنشاء صفحات الأقسام (Departments Management)
- [ ] إنشاء صفحات الرواتب (Payroll Management)
- [ ] نظام الإجازات (Leave Management)
- [ ] نظام الحضور والغياب (Attendance System)
- [ ] تقارير وتحليلات (Reports & Analytics)
- [ ] إدارة المستخدمين والأدوار (User & Role Management)
- [ ] نظام الإشعارات (Notifications System)
- [ ] التكامل مع APIs خارجية (إن لزم الأمر)

## الأخطاء المصححة

- [x] مشكلة 404 في الـ endpoint `/api/trpc/auth.localLogin` - تم إنشاء الـ endpoint
- [x] مشكلة عدم التعرف على Bearer tokens - تم تحديث `authenticateRequest` في sdk.ts
- [x] مشكلة عدم حفظ التوكن بشكل صحيح - تم استخدام sessionStorage
- [x] مشكلة عدم إضافة Authorization header - تم تحديث main.tsx

## ملاحظات تقنية

### المصادقة (Authentication)
- النظام يدعم نوعين من المصادقة:
  1. **Local Auth**: باستخدام Bearer tokens في Authorization header
  2. **OAuth**: الطريقة الأصلية من Manus (محفوظة للتوافقية)

### تخزين البيانات
- التوكن يُخزن في `sessionStorage` وليس `localStorage`
- يُمسح تلقائياً عند إغلاق التاب
- آمن من XSS attacks لأنه لا يمكن الوصول إليه من JavaScript عبر cookies

### قاعدة البيانات
- جدول `users` يحتوي على:
  - `id`: معرف فريد
  - `username`: اسم المستخدم (فريد)
  - `passwordHash`: كلمة المرور المشفرة
  - `name`: الاسم الكامل
  - `role`: دور المستخدم (admin / user)
  - `openId`: معرف OAuth (اختياري)
  - وحقول أخرى...

### الأمان
- كلمات المرور مشفرة باستخدام bcrypt مع salt 10
- JWT tokens موقعة باستخدام HS256
- Authorization header يُتحقق منه على الـ backend
- CORS مفعل للسماح بالطلبات من الـ frontend

## الخطوات التالية

1. بناء واجهات المستخدم للمميزات الأساسية
2. إنشاء procedures في tRPC للعمليات الأساسية
3. تطبيق نظام الأدوار والصلاحيات (RBAC)
4. إضافة التحقق من الصلاحيات على الـ backend
5. اختبار النظام بشكل شامل
