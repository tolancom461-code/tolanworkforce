# Database Schema Enhancements - TolanWorkforce

## 📚 نظرة عامة على التحسينات

هذا المستند يوضح جميع التحسينات التي تم إضافتها إلى نظام قاعدة البيانات لدعم:
- حسابات الرواتب المتقدمة
- معالجة البصمات الناقصة تلقائياً
- جداول زمنية ديناميكية
- أمان البيانات (RLS)
- تسجيل العمليات (Audit Trail)

---

## 🏗️ البنية الجديدة

### الجداول الموجودة (بدون تغيير)
```
✅ workers - بيانات العمال
✅ groups - بيانات المجموعات
✅ attendance_events - سجلات الحضور
✅ payroll_batches - دفعات الرواتب
✅ worker_daily_finance - الحسابات اليومية
✅ group_schedules - الجداول الزمنية (تم إضافتها مسبقاً)
```

### الـ Functions الجديدة

#### 1. `calculate_daily_payroll(worker_id, work_date)`
```sql
-- الاستخدام
SELECT * FROM calculate_daily_payroll(1, '2024-01-25');

-- المخرجات
{
  worker_id: 1,
  work_date: '2024-01-25',
  scheduled_hours: 8.00,
  actual_hours: 7.75,
  late_minutes: 15,
  early_departure_minutes: 0,
  daily_rate: 500.00,
  calculated_pay: 484.38,
  is_auto_completed: FALSE,
  status: 'COMPLETED'
}
```

**الميزات:**
- حساب الساعات الفعلية من البصمات
- مقارنة مع الجدول الزمني
- حساب التأخر والمغادرة المبكرة
- معالجة البصمات الناقصة
- إرجاع حالة المراجعة

#### 2. `calculate_group_payroll(group_id, work_date)`
```sql
-- الاستخدام
SELECT * FROM calculate_group_payroll(1, '2024-01-25');

-- المخرجات
{
  group_id: 1,
  work_date: '2024-01-25',
  total_employees: 5,
  employees_with_issues: 1,
  total_hours_worked: 39.5,
  total_scheduled_hours: 40.0,
  total_payroll: 2468.75,
  average_daily_pay: 493.75
}
```

**الميزات:**
- ملخص شامل لرواتب المجموعة
- عدد الموظفين بمشاكل
- إجمالي الساعات والرواتب
- متوسط الراتب اليومي

#### 3. `detect_missing_punches(worker_id, work_date)`
```sql
-- الاستخدام
SELECT * FROM detect_missing_punches(1, '2024-01-25');

-- المخرجات
{
  worker_id: 1,
  work_date: '2024-01-25',
  has_check_in: TRUE,
  has_check_out: FALSE,
  issue_type: 'MISSING_CHECK_OUT',
  needs_review: TRUE
}
```

**الميزات:**
- كشف البصمات الناقصة
- تحديد نوع المشكلة
- إرجاع حالة الحاجة للمراجعة

### الـ Triggers الجديدة

#### 1. `trg_auto_complete_punches`
**الحدث:** بعد إدراج بصمة جديدة
**الإجراء:** 
- التحقق من وجود check-in بدون check-out
- إدراج check-out تلقائي في وقت نهاية الوردية
- تعليم البصمة بـ `is_automatic = TRUE`

**مثال:**
```
الوقت الحالي: 15:00
آخر check-in: 06:00 (بدون check-out)
الوردية: 06:00 - 14:00
الإجراء: إدراج check-out تلقائي في 14:00
```

#### 2. `trg_update_last_attendance`
**الحدث:** بعد إدراج بصمة جديدة
**الإجراء:**
- تحديث حقل `last_attendance_at` في جدول workers
- يساعد في تتبع آخر حضور للعامل

#### 3. `trg_audit_payroll_changes`
**الحدث:** بعد أي تغيير على جداول الرواتب
**الإجراء:**
- تسجيل جميع INSERT/UPDATE/DELETE
- حفظ القيم القديمة والجديدة
- تسجيل من قام بالتغيير والوقت

#### 4. `trg_validate_schedule`
**الحدث:** قبل إدراج أو تحديث جدول زمني
**الإجراء:**
- التحقق من أن start_time < end_time
- التحقق من أن required_hours > 0
- التحقق من أن day_of_week بين 0-6

### الـ Views الجديدة

#### 1. `vw_daily_payroll_summary`
```sql
SELECT * FROM vw_daily_payroll_summary WHERE work_date = CURDATE();
```

**الأعمدة:**
- worker_id, full_name, code
- group_id, group_name
- work_date
- check_in_count, check_out_count
- first_check_in, last_check_out
- status (COMPLETE, MISSING_CHECK_IN, MISSING_CHECK_OUT)

#### 2. `vw_group_payroll_summary`
```sql
SELECT * FROM vw_group_payroll_summary WHERE work_date = CURDATE();
```

**الأعمدة:**
- group_id, group_code, group_name
- work_date
- total_employees
- employees_checked_in, employees_checked_out
- total_check_ins, total_check_outs

### سياسات RLS الجديدة

#### على جدول `attendance_events`
```
✅ SELECT: فقط الـ admins
✅ INSERT: فقط الـ admins
✅ UPDATE: فقط الـ admins
❌ DELETE: غير مسموح
```

#### على جدول `worker_daily_finance`
```
✅ SELECT: فقط الـ admins والـ payroll managers
✅ INSERT: فقط الـ admins
✅ UPDATE: فقط الـ admins
❌ DELETE: غير مسموح
```

#### على جدول `payroll_batches`
```
✅ SELECT: فقط الـ admins
✅ INSERT: فقط الـ admins
✅ UPDATE: فقط الـ admins
❌ DELETE: غير مسموح
```

#### على جدول `group_schedules`
```
✅ SELECT: الجميع
✅ INSERT: فقط الـ admins
✅ UPDATE: فقط الـ admins
❌ DELETE: غير مسموح
```

---

## 🔄 سير العمل الجديد

### 1. إدراج بصمة جديدة
```
العامل يقرأ QR Code
↓
إدراج attendance_event
↓
Trigger: trg_auto_complete_punches (تحقق من البصمات الناقصة)
↓
Trigger: trg_update_last_attendance (تحديث آخر حضور)
↓
Trigger: trg_audit_payroll_changes (تسجيل التغيير)
```

### 2. حساب الراتب اليومي
```
الاستعلام: calculate_daily_payroll(worker_id, date)
↓
البحث عن جدول المجموعة
↓
الحصول على البصمات
↓
معالجة البصمات الناقصة
↓
حساب الساعات والراتب
↓
إرجاع النتيجة
```

### 3. ملخص رواتب المجموعة
```
الاستعلام: calculate_group_payroll(group_id, date)
↓
الحصول على جميع العمال في المجموعة
↓
حساب الراتب لكل عامل
↓
تجميع النتائج
↓
إرجاع الملخص
```

---

## 📊 أمثلة عملية

### مثال 1: حساب الراتب مع تأخر

**البيانات:**
- العامل: أحمد (ID: 1)
- التاريخ: 2024-01-25 (خميس)
- الوردية: 6:00 - 14:00 (8 ساعات)
- الراتب: 500 ريال
- البصمات: 06:30 (متأخر 30 دقيقة), 14:00

**الحساب:**
```
الساعات الفعلية = 14:00 - 06:30 = 7.5 ساعة
الراتب = (7.5 / 8) × 500 = 468.75 ريال
التأخر = 30 دقيقة
```

### مثال 2: معالجة البصمة الناقصة

**السيناريو:**
- العامل: محمود (ID: 2)
- التاريخ: 2024-01-26 (جمعة)
- الوردية: 6:00 - 14:00
- البصمات: 06:00 (check-in فقط)

**الإجراء التلقائي:**
```
1. Trigger يكتشف عدم وجود check-out
2. يدرج check-out تلقائي في 14:00
3. يعلّم البصمة بـ is_automatic = TRUE
4. يرسل تنبيه للمدير للمراجعة
```

### مثال 3: ملخص المجموعة

**المجموعة:** الفنيين (5 عمال)
**التاريخ:** 2024-01-25

**النتيجة:**
```
إجمالي الموظفين: 5
موظفين بمشاكل: 1 (بصمة ناقصة)
إجمالي الساعات: 39.5 ساعة
الساعات المطلوبة: 40 ساعة
إجمالي الرواتب: 2468.75 ريال
متوسط الراتب: 493.75 ريال
```

---

## 🔐 أمثلة على الأمان

### السيناريو 1: عامل يحاول رؤية رواتب الآخرين
```
الطلب: SELECT * FROM payroll_batches
RLS Policy: فقط الـ admins
النتيجة: ❌ Access Denied
```

### السيناريو 2: مدير يحاول رؤية سجلات الحضور
```
الطلب: SELECT * FROM attendance_events
RLS Policy: فقط الـ admins
النتيجة: ❌ Access Denied (إلا إذا كان admin)
```

### السيناريو 3: Admin يحاول رؤية جميع البيانات
```
الطلب: SELECT * FROM payroll_batches
RLS Policy: فقط الـ admins
النتيجة: ✅ Access Granted
```

---

## 📈 الأداء والتحسينات

### Indexes المضافة
```sql
CREATE INDEX idx_attendance_worker_date 
ON attendance_events(worker_id, DATE(event_time));

CREATE INDEX idx_group_schedules_group_day 
ON group_schedules(group_id, day_of_week);

CREATE INDEX idx_payroll_worker_date 
ON payroll_batch_items(worker_id, batch_id);
```

### تحسينات الأداء المتوقعة
- استعلامات أسرع بـ 50-70%
- استهلاك ذاكرة أقل
- تقليل حمل الخادم

---

## ✅ قائمة التحقق

- [ ] تطبيق الـ Functions على Supabase
- [ ] تطبيق الـ Triggers على Supabase
- [ ] تطبيق الـ RLS Policies على Supabase
- [ ] تطبيق النموذج الأولي (اختياري)
- [ ] اختبار الـ Functions
- [ ] اختبار الـ Triggers
- [ ] اختبار الـ RLS Policies
- [ ] اختبار الأداء
- [ ] توثيق التغييرات
- [ ] إخطار الفريق

---

## 📞 الدعم والمساعدة

للمزيد من المعلومات:
- اقرأ `BACKEND_IMPLEMENTATION.md`
- اقرأ `SUPABASE_SETUP.md`
- راجع الملفات في `drizzle/` directory

---

**آخر تحديث:** 2024-02-01
**الإصدار:** 1.0
**الحالة:** جاهز للتطبيق
