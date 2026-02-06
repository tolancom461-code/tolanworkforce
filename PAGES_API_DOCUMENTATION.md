# 📖 توثيق API لصفحات البرنامج - TolanWorkforce

---

## 📑 فهرس الصفحات

1. [لوحة التحكم الرئيسية](#لوحة-التحكم-الرئيسية)
2. [إدارة المستخدمين](#إدارة-المستخدمين)
3. [إدارة الأدوار والصلاحيات](#إدارة-الأدوار-والصلاحيات)
4. [إدارة العمال](#إدارة-العمال)
5. [الحضور والانصراف](#الحضور-والانصراف)
6. [إدارة الرواتب](#إدارة-الرواتب)
7. [التقارير](#التقارير)
8. [الإعدادات](#الإعدادات)

---

## 1️⃣ لوحة التحكم الرئيسية

### صفحة: Dashboard.tsx

**الرابط:**
```
GET /dashboard
```

**API Endpoints المستخدمة:**

#### الحصول على إحصائيات لوحة التحكم
```
GET /api/trpc/dashboard.stats
```

**الرد:**
```json
{
  "totalUsers": 7,
  "totalWorkers": 150,
  "totalGroups": 5,
  "totalCostCenters": 10,
  "attendanceToday": {
    "present": 145,
    "absent": 5,
    "late": 3
  },
  "pendingPayroll": 2,
  "activePermissions": 38
}
```

#### الحصول على الأنشطة الأخيرة
```
GET /api/trpc/dashboard.recentActivity
```

**المعاملات:**
```json
{
  "limit": 10
}
```

**الرد:**
```json
{
  "activities": [
    {
      "id": 1,
      "type": "worker_created",
      "description": "تم إضافة عامل جديد",
      "timestamp": "2026-01-28T10:00:00Z",
      "user": "RADMAN"
    }
  ]
}
```

---

### صفحة: ExecutiveDashboard.tsx

**الرابط:**
```
GET /executive-dashboard
```

**API Endpoints المستخدمة:**

#### الحصول على تقرير تنفيذي
```
GET /api/trpc/dashboard.executive
```

**الرد:**
```json
{
  "kpis": {
    "attendanceRate": 96.7,
    "payrollAccuracy": 99.5,
    "systemUptime": 99.9
  },
  "charts": {
    "attendanceTrend": [...],
    "payrollDistribution": [...]
  }
}
```

---

## 2️⃣ إدارة المستخدمين

### صفحة: Users.tsx

**الرابط:**
```
GET /settings/users
```

**API Endpoints المستخدمة:**

#### الحصول على قائمة المستخدمين
```
GET /api/trpc/users.list
```

**المعاملات:**
```json
{
  "page": 1,
  "limit": 10,
  "search": "",
  "sortBy": "username",
  "sortOrder": "asc"
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
      "status": "active",
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ],
  "total": 7,
  "page": 1,
  "hasMore": false
}
```

#### إنشاء مستخدم جديد
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
  "status": "active"
}
```

#### تعديل مستخدم
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

#### حذف مستخدم
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

### صفحة: Profile.tsx

**الرابط:**
```
GET /profile
```

**API Endpoints المستخدمة:**

#### الحصول على ملف المستخدم الشخصي
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
  "createdAt": "2026-01-01T00:00:00Z",
  "lastLogin": "2026-01-28T10:00:00Z"
}
```

#### تحديث ملف المستخدم
```
PUT /api/trpc/profile.update
```

**المعاملات:**
```json
{
  "email": "newemail@tolanworkforce.com",
  "phone": "0501234567"
}
```

---

## 3️⃣ إدارة الأدوار والصلاحيات

### صفحة: Roles.tsx

**الرابط:**
```
GET /settings/roles
```

**API Endpoints المستخدمة:**

#### الحصول على قائمة الأدوار
```
GET /api/trpc/roles.list
```

**المعاملات:**
```json
{
  "page": 1,
  "limit": 10
}
```

**الرد:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "مسؤول النظام",
      "code": "admin",
      "description": "مسؤول النظام الكامل",
      "level": 100,
      "permissionCount": 59,
      "userCount": 2
    }
  ],
  "total": 10
}
```

#### إنشاء دور جديد
```
POST /api/trpc/roles.create
```

**المعاملات:**
```json
{
  "name": "مدير المشروع",
  "code": "project_manager",
  "description": "مدير المشروع",
  "level": 50
}
```

#### تعديل دور
```
PUT /api/trpc/roles.update
```

**المعاملات:**
```json
{
  "roleId": 1,
  "name": "مسؤول النظام الرئيسي",
  "description": "مسؤول النظام الكامل والرئيسي"
}
```

#### حذف دور
```
DELETE /api/trpc/roles.delete
```

**المعاملات:**
```json
{
  "roleId": 1
}
```

---

### صفحة: RolePermissions.tsx

**الرابط:**
```
GET /settings/role-permissions
```

**API Endpoints المستخدمة:**

#### الحصول على صلاحيات دور
```
GET /api/trpc/rolePermissions.get
```

**المعاملات:**
```json
{
  "roleId": 1
}
```

**الرد:**
```json
{
  "roleId": 1,
  "roleName": "مسؤول النظام",
  "permissions": [
    {
      "id": 1,
      "code": "USERS_VIEW",
      "name": "عرض المستخدمين",
      "category": "users",
      "enabled": true
    }
  ]
}
```

#### تحديث صلاحيات دور
```
PUT /api/trpc/rolePermissions.update
```

**المعاملات:**
```json
{
  "roleId": 1,
  "permissions": [
    {
      "permissionId": 1,
      "enabled": true
    }
  ]
}
```

---

### صفحة: PermissionsManagement.tsx

**الرابط:**
```
GET /settings/permissions-management
```

**API Endpoints المستخدمة:**

#### الحصول على قائمة الصلاحيات
```
GET /api/trpc/permissions.list
```

**المعاملات:**
```json
{
  "page": 1,
  "limit": 20,
  "category": "users"
}
```

**الرد:**
```json
{
  "data": [
    {
      "id": 1,
      "code": "USERS_VIEW",
      "name": "عرض المستخدمين",
      "description": "السماح بعرض قائمة المستخدمين",
      "category": "users",
      "rolesCount": 5
    }
  ],
  "total": 59
}
```

---

## 4️⃣ إدارة العمال

### صفحة: Workers.tsx

**الرابط:**
```
GET /workers
```

**API Endpoints المستخدمة:**

#### الحصول على قائمة العمال
```
GET /api/trpc/workers.list
```

**المعاملات:**
```json
{
  "page": 1,
  "limit": 20,
  "search": "",
  "groupId": null,
  "status": "active",
  "sortBy": "name",
  "sortOrder": "asc"
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
      "groupName": "المجموعة الأولى",
      "salary": 5000,
      "status": "active",
      "startDate": "2025-01-01"
    }
  ],
  "total": 150,
  "page": 1
}
```

#### إنشاء عامل جديد
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

#### تعديل عامل
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

#### حذف عامل
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

### صفحة: WorkerDetails.tsx

**الرابط:**
```
GET /workers/:id
```

**API Endpoints المستخدمة:**

#### الحصول على تفاصيل عامل
```
GET /api/trpc/workers.get
```

**المعاملات:**
```json
{
  "workerId": 1
}
```

**الرد:**
```json
{
  "id": 1,
  "code": "W001",
  "name": "أحمد محمد",
  "email": "ahmed@example.com",
  "phone": "0501234567",
  "position": "مهندس",
  "groupId": 1,
  "salary": 5000,
  "status": "active",
  "startDate": "2025-01-01",
  "attendanceStats": {
    "totalDays": 20,
    "presentDays": 19,
    "absentDays": 1,
    "lateDays": 0
  }
}
```

---

### صفحة: Groups.tsx

**الرابط:**
```
GET /settings/groups
```

**API Endpoints المستخدمة:**

#### الحصول على قائمة المجموعات
```
GET /api/trpc/groups.list
```

**المعاملات:**
```json
{
  "page": 1,
  "limit": 10
}
```

**الرد:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "المجموعة الأولى",
      "description": "فريق التطوير",
      "workerCount": 50,
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 5
}
```

#### إنشاء مجموعة جديدة
```
POST /api/trpc/groups.create
```

**المعاملات:**
```json
{
  "name": "فريق المبيعات",
  "description": "فريق المبيعات والتسويق"
}
```

---

## 5️⃣ الحضور والانصراف

### صفحة: AttendanceLog.tsx

**الرابط:**
```
GET /attendance/log
```

**API Endpoints المستخدمة:**

#### الحصول على سجل الحضور
```
GET /api/trpc/attendance.list
```

**المعاملات:**
```json
{
  "startDate": "2026-01-01",
  "endDate": "2026-01-31",
  "workerId": null,
  "groupId": null,
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
      "workerName": "أحمد محمد",
      "date": "2026-01-28",
      "checkIn": "08:00:00",
      "checkOut": "17:00:00",
      "status": "present",
      "duration": "9:00",
      "notes": ""
    }
  ],
  "total": 100,
  "page": 1
}
```

#### تسجيل حضور يدوي
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

#### تسجيل انصراف يدوي
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

### صفحة: AttendanceScanner.tsx

**الرابط:**
```
GET /attendance/scanner
```

**API Endpoints المستخدمة:**

#### البحث عن عامل بـ QR Code
```
GET /api/trpc/workers.getByCode
```

**المعاملات:**
```json
{
  "code": "W001"
}
```

**الرد:**
```json
{
  "id": 1,
  "code": "W001",
  "name": "أحمد محمد",
  "position": "مهندس"
}
```

#### تسجيل الحضور من الماسح الضوئي
```
POST /api/trpc/attendance.scanCheckIn
```

**المعاملات:**
```json
{
  "workerCode": "W001",
  "timestamp": "2026-01-28T08:00:00Z"
}
```

---

### صفحة: AttendanceReports.tsx

**الرابط:**
```
GET /reports/attendance
```

**API Endpoints المستخدمة:**

#### الحصول على تقرير الحضور
```
GET /api/trpc/reports.attendance
```

**المعاملات:**
```json
{
  "startDate": "2026-01-01",
  "endDate": "2026-01-31",
  "groupId": null,
  "format": "json"
}
```

**الرد:**
```json
{
  "summary": {
    "totalWorkers": 150,
    "presentDays": 2850,
    "absentDays": 150,
    "lateDays": 75,
    "attendanceRate": 95.0
  },
  "details": [...]
}
```

---

## 6️⃣ إدارة الرواتب

### صفحة: PayrollBatches.tsx

**الرابط:**
```
GET /payroll/batches
```

**API Endpoints المستخدمة:**

#### الحصول على قائمة دفعات الرواتب
```
GET /api/trpc/payroll.list
```

**المعاملات:**
```json
{
  "page": 1,
  "limit": 10,
  "status": "all",
  "sortBy": "createdAt",
  "sortOrder": "desc"
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
      "totalAmount": 750000,
      "workerCount": 150,
      "status": "draft",
      "createdAt": "2026-01-28T10:00:00Z",
      "createdBy": "RADMAN"
    }
  ],
  "total": 5
}
```

---

### صفحة: PayrollBatchCreate.tsx

**الرابط:**
```
GET /payroll/create
```

**API Endpoints المستخدمة:**

#### إنشاء دفعة رواتب جديدة
```
POST /api/trpc/payroll.create
```

**المعاملات:**
```json
{
  "periodStart": "2026-01-01",
  "periodEnd": "2026-01-31",
  "groupId": null
}
```

**الرد:**
```json
{
  "id": 1,
  "batchNumber": "PAY-2026-01",
  "status": "draft"
}
```

---

### صفحة: PayrollBatchDetails.tsx

**الرابط:**
```
GET /payroll/batches/:id
```

**API Endpoints المستخدمة:**

#### الحصول على تفاصيل دفعة الرواتب
```
GET /api/trpc/payroll.get
```

**المعاملات:**
```json
{
  "batchId": 1
}
```

**الرد:**
```json
{
  "id": 1,
  "batchNumber": "PAY-2026-01",
  "periodStart": "2026-01-01",
  "periodEnd": "2026-01-31",
  "totalAmount": 750000,
  "status": "draft",
  "items": [
    {
      "workerId": 1,
      "workerName": "أحمد محمد",
      "baseSalary": 5000,
      "bonuses": 500,
      "deductions": 200,
      "totalAmount": 5300
    }
  ]
}
```

#### إضافة عامل إلى دفعة الرواتب
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

#### الموافقة على دفعة الرواتب
```
POST /api/trpc/payroll.approve
```

**المعاملات:**
```json
{
  "batchId": 1
}
```

#### رفض دفعة الرواتب
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

### صفحة: PayrollReport.tsx

**الرابط:**
```
GET /reports/payroll
```

**API Endpoints المستخدمة:**

#### الحصول على تقرير الرواتب
```
GET /api/trpc/reports.payroll
```

**المعاملات:**
```json
{
  "periodStart": "2026-01-01",
  "periodEnd": "2026-01-31",
  "groupId": null,
  "format": "json"
}
```

---

## 7️⃣ التقارير

### صفحة: FinancialReports.tsx

**الرابط:**
```
GET /reports/financial
```

**API Endpoints المستخدمة:**

#### الحصول على التقارير المالية
```
GET /api/trpc/reports.financial
```

**المعاملات:**
```json
{
  "startDate": "2026-01-01",
  "endDate": "2026-01-31"
}
```

---

## 8️⃣ الإعدادات

### صفحة: CostCenters.tsx

**الرابط:**
```
GET /settings/cost-centers
```

**API Endpoints المستخدمة:**

#### الحصول على قائمة مراكز التكلفة
```
GET /api/trpc/costCenters.list
```

**المعاملات:**
```json
{
  "page": 1,
  "limit": 10
}
```

**الرد:**
```json
{
  "data": [
    {
      "id": 1,
      "code": "CC001",
      "name": "مركز التطوير",
      "description": "مركز تكلفة التطوير",
      "budget": 100000,
      "spent": 75000
    }
  ],
  "total": 10
}
```

---

### صفحة: WorkDays.tsx

**الرابط:**
```
GET /settings/work-days
```

**API Endpoints المستخدمة:**

#### الحصول على أيام العمل
```
GET /api/trpc/workDays.list
```

**الرد:**
```json
{
  "workDays": [
    {
      "day": "saturday",
      "dayName": "السبت",
      "startTime": "08:00",
      "endTime": "17:00"
    }
  ]
}
```

#### تحديث أيام العمل
```
PUT /api/trpc/workDays.update
```

**المعاملات:**
```json
{
  "workDays": [
    {
      "day": "saturday",
      "startTime": "08:00",
      "endTime": "17:00"
    }
  ]
}
```

---

## 🔒 ملاحظات الأمان

1. **جميع الـ endpoints محمية** بـ JWT authentication
2. **التحقق من الصلاحيات** يتم على كل طلب
3. **تسجيل جميع العمليات** في audit log
4. **معالجة الأخطاء** موحدة لجميع الـ endpoints

---

## 📊 معايير الأداء

- **وقت الاستجابة:** < 500ms
- **معدل الأخطاء:** < 0.1%
- **توفر الخدمة:** 99.9%

---

**تم إنشاء هذا التوثيق في:** 28 يناير 2026  
**الإصدار:** 1.0.0  
**الحالة:** ✅ جاهز للاستخدام
