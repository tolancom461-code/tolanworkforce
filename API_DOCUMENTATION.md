# 📚 توثيق API الكامل - نظام إدارة القوى العاملة TolanWorkforce

---

## 🔗 رابط الدخول للنظام الفعلي

```
https://3000-izmb94iqt368e6ngsm94l-1296fb29.sg1.manus.computer
```

### بيانات الدخول الافتراضية:

| اسم المستخدم | كلمة السر | الدور | الصلاحيات |
|-------------|---------|------|----------|
| **RADMAN** | admin123 | مسؤول النظام | جميع الصلاحيات (100%) |
| **admin1** | admin11 | مسؤول النظام | جميع الصلاحيات (100%) |

---

## 🏗️ معمارية API

النظام يستخدم **tRPC** (TypeScript RPC) مع **Express.js**

### Base URL:
```
https://3000-izmb94iqt368e6ngsm94l-1296fb29.sg1.manus.computer/api/trpc
```

### رؤوس الطلب (Headers):
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

---

## 🔐 المصادقة (Authentication)

### 1. تسجيل الدخول
```
POST /api/oauth/callback
```

**الرد:**
```json
{
  "user": {
    "id": 1,
    "username": "RADMAN",
    "role": "admin",
    "permissions": [...]
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. الحصول على معلومات المستخدم الحالي
```
GET /api/trpc/auth.me
```

**الرد:**
```json
{
  "id": 1,
  "username": "RADMAN",
  "email": "radman@tolanworkforce.com",
  "role": "admin",
  "permissions": [...]
}
```

### 3. تسجيل الخروج
```
POST /api/trpc/auth.logout
```

---

## 👥 إدارة المستخدمين (Users)

### 1. الحصول على قائمة المستخدمين
```
GET /api/trpc/users.list
```

**المعاملات:**
```json
{
  "page": 1,
  "limit": 10,
  "search": "RADMAN"
}
```

**الرد:**
```json
{
  "data": [
    {
      "id": 1,
      "username": "RADMAN",
      "email": "radman@tolanworkforce.com",
      "role": "admin",
      "status": "active"
    }
  ],
  "total": 7,
  "page": 1,
  "limit": 10
}
```

### 2. الحصول على مستخدم واحد
```
GET /api/trpc/users.get
```

**المعاملات:**
```json
{
  "userId": 1
}
```

### 3. إنشاء مستخدم جديد
```
POST /api/trpc/users.create
```

**المعاملات:**
```json
{
  "username": "newuser",
  "email": "newuser@tolanworkforce.com",
  "password": "SecurePassword123!",
  "role": "user"
}
```

**الرد:**
```json
{
  "id": 8,
  "username": "newuser",
  "email": "newuser@tolanworkforce.com",
  "role": "user",
  "createdAt": "2026-01-28T10:00:00Z"
}
```

### 4. تعديل مستخدم
```
PUT /api/trpc/users.update
```

**المعاملات:**
```json
{
  "userId": 1,
  "email": "newemail@tolanworkforce.com",
  "role": "admin"
}
```

### 5. حذف مستخدم
```
DELETE /api/trpc/users.delete
```

**المعاملات:**
```json
{
  "userId": 1
}
```

---

## 👨‍💼 إدارة العمال (Workers)

### 1. الحصول على قائمة العمال
```
GET /api/trpc/workers.list
```

**المعاملات:**
```json
{
  "page": 1,
  "limit": 20,
  "groupId": 1,
  "search": "أحمد"
}
```

**الرد:**
```json
{
  "data": [
    {
      "id": 1,
      "code": "W001",
      "name": "أحمد محمد",
      "email": "ahmed@example.com",
      "phone": "0501234567",
      "position": "مهندس",
      "groupId": 1,
      "salary": 5000,
      "status": "active"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20
}
```

### 2. الحصول على عامل واحد
```
GET /api/trpc/workers.get
```

**المعاملات:**
```json
{
  "workerId": 1
}
```

### 3. إنشاء عامل جديد
```
POST /api/trpc/workers.create
```

**المعاملات:**
```json
{
  "code": "W002",
  "name": "علي أحمد",
  "email": "ali@example.com",
  "phone": "0509876543",
  "position": "مهندس برمجيات",
  "groupId": 1,
  "salary": 6000,
  "startDate": "2026-01-01"
}
```

### 4. تعديل عامل
```
PUT /api/trpc/workers.update
```

**المعاملات:**
```json
{
  "workerId": 1,
  "salary": 6500,
  "position": "مهندس أول"
}
```

### 5. حذف عامل
```
DELETE /api/trpc/workers.delete
```

**المعاملات:**
```json
{
  "workerId": 1
}
```

---

## 📅 إدارة الحضور (Attendance)

### 1. الحصول على سجلات الحضور
```
GET /api/trpc/attendance.list
```

**المعاملات:**
```json
{
  "startDate": "2026-01-01",
  "endDate": "2026-01-31",
  "workerId": 1,
  "page": 1,
  "limit": 50
}
```

**الرد:**
```json
{
  "data": [
    {
      "id": 1,
      "workerId": 1,
      "date": "2026-01-28",
      "checkIn": "08:00:00",
      "checkOut": "17:00:00",
      "status": "present",
      "notes": ""
    }
  ],
  "total": 20,
  "page": 1,
  "limit": 50
}
```

### 2. تسجيل حضور
```
POST /api/trpc/attendance.checkIn
```

**المعاملات:**
```json
{
  "workerId": 1,
  "timestamp": "2026-01-28T08:00:00Z"
}
```

### 3. تسجيل انصراف
```
POST /api/trpc/attendance.checkOut
```

**المعاملات:**
```json
{
  "workerId": 1,
  "timestamp": "2026-01-28T17:00:00Z"
}
```

---

## 💰 إدارة الرواتب (Payroll)

### 1. الحصول على قائمة دفعات الرواتب
```
GET /api/trpc/payroll.list
```

**المعاملات:**
```json
{
  "page": 1,
  "limit": 10,
  "status": "draft"
}
```

**الرد:**
```json
{
  "data": [
    {
      "id": 1,
      "batchNumber": "PAY-2026-01",
      "periodStart": "2026-01-01",
      "periodEnd": "2026-01-31",
      "totalAmount": 150000,
      "status": "draft",
      "createdAt": "2026-01-28T10:00:00Z"
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 10
}
```

### 2. إنشاء دفعة رواتب جديدة
```
POST /api/trpc/payroll.create
```

**المعاملات:**
```json
{
  "periodStart": "2026-01-01",
  "periodEnd": "2026-01-31",
  "groupId": 1
}
```

### 3. إضافة عامل إلى دفعة الرواتب
```
POST /api/trpc/payroll.addWorker
```

**المعاملات:**
```json
{
  "batchId": 1,
  "workerId": 1,
  "baseSalary": 5000,
  "bonuses": 500,
  "deductions": 200
}
```

### 4. الموافقة على دفعة الرواتب
```
POST /api/trpc/payroll.approve
```

**المعاملات:**
```json
{
  "batchId": 1
}
```

### 5. رفض دفعة الرواتب
```
POST /api/trpc/payroll.reject
```

**المعاملات:**
```json
{
  "batchId": 1,
  "reason": "بيانات غير صحيحة"
}
```

---

## 📊 التقارير (Reports)

### 1. تقرير الحضور
```
GET /api/trpc/reports.attendance
```

**المعاملات:**
```json
{
  "startDate": "2026-01-01",
  "endDate": "2026-01-31",
  "groupId": 1
}
```

### 2. تقرير الرواتب
```
GET /api/trpc/reports.payroll
```

**المعاملات:**
```json
{
  "periodStart": "2026-01-01",
  "periodEnd": "2026-01-31",
  "groupId": 1
}
```

### 3. تقرير الأداء
```
GET /api/trpc/reports.performance
```

---

## 🎯 الأدوار والصلاحيات (Roles & Permissions)

### الأدوار المتاحة:

| الدور | الوصف | الصلاحيات |
|------|-------|----------|
| **admin** | مسؤول النظام | جميع الصلاحيات |
| **user** | مستخدم عادي | صلاحيات محدودة |
| **hr_manager** | مدير الموارد البشرية | إدارة العمال والحضور |
| **accountant** | محاسب | إدارة الرواتب والمالية |
| **viewer** | مشاهد | عرض البيانات فقط |

### الصلاحيات المتاحة:

```
- USERS_VIEW
- USERS_CREATE
- USERS_UPDATE
- USERS_DELETE
- WORKERS_VIEW
- WORKERS_CREATE
- WORKERS_UPDATE
- WORKERS_DELETE
- ATTENDANCE_VIEW
- ATTENDANCE_CREATE
- ATTENDANCE_UPDATE
- PAYROLL_VIEW
- PAYROLL_CREATE
- PAYROLL_UPDATE
- PAYROLL_APPROVE
- REPORTS_VIEW
- SETTINGS_MANAGE
```

---

## ⚙️ إعدادات النظام (Settings)

### 1. الحصول على الإعدادات
```
GET /api/trpc/settings.get
```

### 2. تحديث الإعدادات
```
PUT /api/trpc/settings.update
```

**المعاملات:**
```json
{
  "companyName": "شركة الأمل",
  "timezone": "Asia/Riyadh",
  "currency": "SAR"
}
```

---

## 🔄 معالجة الأخطاء

جميع الأخطاء ترجع بصيغة موحدة:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "ليس لديك صلاحية لهذا الإجراء",
    "details": {}
  }
}
```

### رموز الأخطاء الشائعة:

| الكود | المعنى |
|------|--------|
| 400 | طلب غير صحيح |
| 401 | غير مصرح (بحاجة لتسجيل دخول) |
| 403 | ممنوع (بدون صلاحيات) |
| 404 | غير موجود |
| 500 | خطأ في الخادم |

---

## 📝 أمثلة الاستخدام

### مثال 1: تسجيل الدخول والحصول على المستخدمين

```bash
# 1. تسجيل الدخول
curl -X POST https://3000-izmb94iqt368e6ngsm94l-1296fb29.sg1.manus.computer/api/oauth/callback \
  -H "Content-Type: application/json" \
  -d '{
    "username": "RADMAN",
    "password": "admin123"
  }'

# 2. الحصول على قائمة المستخدمين
curl -X GET "https://3000-izmb94iqt368e6ngsm94l-1296fb29.sg1.manus.computer/api/trpc/users.list?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### مثال 2: إضافة عامل جديد

```bash
curl -X POST https://3000-izmb94iqt368e6ngsm94l-1296fb29.sg1.manus.computer/api/trpc/workers.create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "code": "W002",
    "name": "محمد علي",
    "email": "mohammad@example.com",
    "phone": "0501234567",
    "position": "مهندس",
    "groupId": 1,
    "salary": 5500
  }'
```

---

## 🚀 نصائح الأداء

1. **استخدم Pagination:** دائماً استخدم `page` و `limit` عند جلب البيانات الكبيرة
2. **التخزين المؤقت:** احفظ البيانات المتكررة محلياً
3. **معالجة الأخطاء:** تعامل مع جميع الأخطاء المحتملة
4. **الأمان:** لا تشارك tokens مع أحد

---

## 📞 الدعم الفني

للمساعدة والدعم الفني:
- البريد الإلكتروني: support@tolanworkforce.com
- الهاتف: +966 XX XXX XXXX
- الدعم 24/7 متاح

---

**تم إنشاء هذا التوثيق في:** 28 يناير 2026  
**الإصدار:** 1.0.0  
**الحالة:** ✅ جاهز للاستخدام
