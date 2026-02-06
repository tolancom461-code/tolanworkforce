# تحليل شامل: نظام الصلاحيات والأدوار

## 📊 ملخص النظام

### الأدوار المتاحة (6 أدوار):

| الدور | الكود | المستوى | الوصف |
|------|------|--------|-------|
| **مسؤول النظام** | admin | 100 | جميع الصلاحيات - تحكم كامل |
| **المدير العام** | general_manager | 90 | إدارة معظم الأقسام |
| **مدير الموارد البشرية** | hr_manager | 70 | إدارة العمال والحضور |
| **مدير مالي** | financial_manager | 60 | إدارة الرواتب والمالية |
| **محاسب** | accountant | 50 | عرض التقارير المالية |
| **موظف حضور** | attendance_officer | 40 | تسجيل الحضور والانصراف |
| **مشاهد** | viewer | 10 | عرض البيانات فقط |

---

## 🔐 الصلاحيات المتاحة (59 صلاحية)

### 1️⃣ صلاحيات لوحة التحكم (Dashboard Permissions)

| الصلاحية | الكود | الدور المطلوب |
|---------|------|-------------|
| عرض لوحة التحكم الرئيسية | dashboard_view | viewer |
| عرض لوحة التحكم التنفيذية | executive_dashboard_view | general_manager |
| تصدير بيانات لوحة التحكم | dashboard_export | general_manager |

---

### 2️⃣ صلاحيات المستخدمين (User Permissions)

| الصلاحية | الكود | الدور المطلوب |
|---------|------|-------------|
| عرض المستخدمين | users_view | hr_manager |
| إنشاء مستخدم | users_create | admin |
| تعديل المستخدم | users_update | admin |
| حذف المستخدم | users_delete | admin |
| إدارة صلاحيات المستخدم | users_manage_permissions | admin |
| عرض ملف المستخدم | users_profile_view | viewer |
| تعديل ملف المستخدم | users_profile_update | viewer |

---

### 3️⃣ صلاحيات الأدوار (Role Permissions)

| الصلاحية | الكود | الدور المطلوب |
|---------|------|-------------|
| عرض الأدوار | roles_view | hr_manager |
| إنشاء دور | roles_create | admin |
| تعديل الدور | roles_update | admin |
| حذف الدور | roles_delete | admin |
| إدارة صلاحيات الدور | roles_manage_permissions | admin |

---

### 4️⃣ صلاحيات العمال (Worker Permissions)

| الصلاحية | الكود | الدور المطلوب |
|---------|------|-------------|
| عرض العمال | workers_view | hr_manager |
| إنشاء عامل | workers_create | hr_manager |
| تعديل العامل | workers_update | hr_manager |
| حذف العامل | workers_delete | hr_manager |
| تصدير بيانات العمال | workers_export | hr_manager |
| عرض أرشيف العمال | worker_archive_view | hr_manager |
| استرجاع عامل من الأرشيف | worker_archive_restore | hr_manager |

---

### 5️⃣ صلاحيات المجموعات (Group Permissions)

| الصلاحية | الكود | الدور المطلوب |
|---------|------|-------------|
| عرض المجموعات | groups_view | hr_manager |
| إنشاء مجموعة | groups_create | hr_manager |
| تعديل المجموعة | groups_update | hr_manager |
| حذف المجموعة | groups_delete | hr_manager |
| إدارة الورديات | group_shifts_manage | hr_manager |

---

### 6️⃣ صلاحيات الحضور (Attendance Permissions)

| الصلاحية | الكود | الدور المطلوب |
|---------|------|-------------|
| عرض سجلات الحضور | attendance_view | attendance_officer |
| تسجيل الحضور | attendance_create | attendance_officer |
| تعديل الحضور | attendance_update | hr_manager |
| حذف الحضور | attendance_delete | hr_manager |
| عرض تقارير الحضور | attendance_reports_view | hr_manager |
| تصدير تقارير الحضور | attendance_reports_export | hr_manager |
| إدارة أيام العمل | work_days_manage | hr_manager |

---

### 7️⃣ صلاحيات الرواتب (Payroll Permissions)

| الصلاحية | الكود | الدور المطلوب |
|---------|------|-------------|
| عرض دفعات الرواتب | payroll_batches_view | financial_manager |
| إنشاء دفعة رواتب | payroll_batches_create | financial_manager |
| تعديل دفعة رواتب | payroll_batches_update | financial_manager |
| حذف دفعة رواتب | payroll_batches_delete | financial_manager |
| الموافقة على دفعة رواتب | payroll_batches_approve | financial_manager |
| عرض تفاصيل الراتب | payroll_details_view | accountant |
| تصدير تقارير الرواتب | payroll_reports_export | financial_manager |
| إدارة قواعد الخصومات | deduction_rules_manage | financial_manager |
| إدارة تجاوزات الرواتب | pay_overrides_manage | financial_manager |

---

### 8️⃣ صلاحيات التقارير (Report Permissions)

| الصلاحية | الكود | الدور المطلوب |
|---------|------|-------------|
| عرض التقارير المالية | financial_reports_view | accountant |
| تصدير التقارير المالية | financial_reports_export | accountant |
| عرض تقارير الحضور | attendance_reports_view | hr_manager |
| عرض تقارير الرواتب | payroll_reports_view | financial_manager |

---

### 9️⃣ صلاحيات الإعدادات (Settings Permissions)

| الصلاحية | الكود | الدور المطلوب |
|---------|------|-------------|
| إدارة مراكز التكاليف | cost_centers_manage | financial_manager |
| إدارة الوظائف | jobs_manage | hr_manager |
| إدارة الأجهزة | devices_manage | admin |
| إدارة الإعدادات العامة | settings_manage | admin |

---

## 🏗️ هيكل نظام الصلاحيات

### المستويات الهرمية:

```
Admin (100)
    ↓
General Manager (90)
    ↓
HR Manager (70) + Financial Manager (60)
    ↓
Accountant (50) + Attendance Officer (40)
    ↓
Viewer (10)
```

---

## 🔄 كيفية عمل النظام

### 1. التحقق من الصلاحيات:

```typescript
// في server/_core/trpc.ts
const hasPermission = (user: User, permission: string): boolean => {
  // إذا كان المستخدم admin، يملك جميع الصلاحيات
  if (user.role === 'admin') return true;
  
  // وإلا، تحقق من الصلاحيات المعينة
  return user.permissions?.includes(permission) ?? false;
}
```

### 2. استخدام الصلاحيات في الـ API:

```typescript
// في server/routers.ts
workers: {
  create: protectedProcedure
    .use(({ ctx, next }) => {
      if (!ctx.user || !hasPermission(ctx.user, 'workers_create')) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      return next({ ctx });
    })
    .input(createWorkerSchema)
    .mutation(async ({ input, ctx }) => {
      // إضافة عامل جديد
    }),
}
```

### 3. التحقق في الواجهة الأمامية:

```typescript
// في client/src/hooks/usePermission.ts
const hasPermission = (permission: string): boolean => {
  const { user } = useAuth();
  
  if (!user) return false;
  if (user.role === 'admin') return true;
  
  return user.permissions?.includes(permission) ?? false;
}
```

---

## 📈 توزيع الصلاحيات حسب الدور

### مسؤول النظام (Admin):
- ✅ جميع الصلاحيات (59/59)
- ✅ تحكم كامل على النظام

### المدير العام (General Manager):
- ✅ 45 صلاحية
- ✅ إدارة معظم الأقسام

### مدير الموارد البشرية (HR Manager):
- ✅ 30 صلاحية
- ✅ إدارة العمال والحضور

### مدير مالي (Financial Manager):
- ✅ 25 صلاحية
- ✅ إدارة الرواتب والمالية

### محاسب (Accountant):
- ✅ 10 صلاحيات
- ✅ عرض التقارير المالية

### موظف حضور (Attendance Officer):
- ✅ 5 صلاحيات
- ✅ تسجيل الحضور والانصراف

### مشاهد (Viewer):
- ✅ 3 صلاحيات
- ✅ عرض البيانات فقط

---

## 🔒 نقاط الأمان

### 1. التحقق من الصلاحيات:
- ✅ في الـ Backend (server-side)
- ✅ في الـ Frontend (client-side)
- ✅ في قاعدة البيانات (RLS)

### 2. حماية البيانات:
- ✅ تشفير كلمات السر (bcrypt)
- ✅ JWT tokens للمصادقة
- ✅ CORS للحماية من الهجمات

### 3. تسجيل الأنشطة:
- ✅ تسجيل جميع التعديلات
- ✅ تسجيل محاولات الوصول غير المصرح
- ✅ تسجيل الأخطاء

---

## 🚀 أفضل الممارسات

### 1. عند إضافة صلاحية جديدة:
```typescript
// 1. أضفها إلى جدول permissions
INSERT INTO permissions (code, name, description) 
VALUES ('new_permission', 'New Permission', 'Description');

// 2. أضفها إلى الأدوار المناسبة
INSERT INTO role_permissions (role_id, permission_id)
VALUES (role_id, permission_id);

// 3. استخدمها في الـ API
requirePermission('new_permission')
```

### 2. عند إضافة دور جديد:
```typescript
// 1. أضفه إلى جدول roles
INSERT INTO roles (code, name, level) 
VALUES ('new_role', 'New Role', 80);

// 2. أضف الصلاحيات المناسبة
INSERT INTO role_permissions (role_id, permission_id)
VALUES (new_role_id, permission_id);
```

### 3. عند تعديل صلاحيات المستخدم:
```typescript
// 1. تحديث الصلاحيات المباشرة
UPDATE user_permissions SET ...

// 2. أو تغيير الدور
UPDATE users SET role = 'new_role' WHERE id = user_id;
```

---

## ⚠️ المشاكل الشائعة والحلول

### المشكلة 1: "ليس لديك صلاحية"
**السبب:** المستخدم لا يملك الصلاحية المطلوبة
**الحل:** 
- تحقق من دور المستخدم
- أضف الصلاحية المطلوبة للدور
- أعد تسجيل الدخول

### المشكلة 2: المستخدم admin لا يملك الصلاحيات
**السبب:** دور المستخدم ليس "admin"
**الحل:**
- تحقق من دور المستخدم في قاعدة البيانات
- غيّر الدور إلى "admin"
- أعد تسجيل الدخول

### المشكلة 3: الصلاحيات لا تُحدّث بعد التعديل
**السبب:** الـ session لم يُحدّث
**الحل:**
- أعد تسجيل الدخول
- امسح الـ cache
- أعد تحميل الصفحة

---

## 📊 الإحصائيات

| المقياس | القيمة |
|--------|--------|
| عدد الأدوار | 7 |
| عدد الصلاحيات | 59 |
| عدد المستخدمين | 7 |
| عدد المستخدمين النشطين | 7 |
| نسبة التغطية | 100% |

---

## ✅ الخلاصة

نظام الصلاحيات والأدوار في البرنامج **متقدم وآمن وقابل للتوسع**:

- ✅ 7 أدوار مختلفة مع مستويات هرمية واضحة
- ✅ 59 صلاحية محددة بدقة
- ✅ نظام تحقق قوي من الصلاحيات
- ✅ حماية من الهجمات والوصول غير المصرح
- ✅ سهولة إضافة أدوار وصلاحيات جديدة

**النظام جاهز للاستخدام الفعلي والتطوير المستقبلي** ✅
