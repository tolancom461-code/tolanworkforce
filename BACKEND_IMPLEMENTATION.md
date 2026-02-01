# Backend Implementation Guide - TolanWorkforce

## 📋 نظرة عامة

هذا الدليل يوضح كيفية تطبيق الـ PostgreSQL Functions والـ Triggers والـ RLS Policies على نظام إدارة القوى العاملة.

> **ملاحظة مهمة:** المشروع الحالي يستخدم MySQL (عبر Supabase)، لكن الـ SQL Files المرفقة مكتوبة لـ PostgreSQL. يتطلب تحويل بعض الأوامر لـ MySQL.

---

## 🔧 الملفات المرفقة

### 1. **functions.sql** - PostgreSQL Functions
يحتوي على 3 functions رئيسية:

#### `calculate_daily_payroll(p_worker_id, p_work_date)`
حساب الراتب اليومي للعامل:
- يحسب الساعات المطلوبة والفعلية
- يحسب التأخر والمغادرة المبكرة
- يتعامل مع البصمات الناقصة تلقائياً
- يرجع الحالة (PENDING_REVIEW أو COMPLETED)

**المخرجات:**
```
worker_id, work_date, scheduled_hours, actual_hours, 
late_minutes, early_departure_minutes, daily_rate, 
calculated_pay, is_auto_completed, status
```

#### `calculate_group_payroll(p_group_id, p_work_date)`
حساب ملخص الرواتب للمجموعة:
- عدد الموظفين الكلي
- عدد الموظفين بمشاكل
- إجمالي الساعات والرواتب
- متوسط الراتب اليومي

#### `detect_missing_punches(p_worker_id, p_work_date)`
كشف البصمات الناقصة:
- التحقق من وجود check-in و check-out
- تحديد نوع المشكلة (NO_PUNCH, MISSING_CHECK_IN, MISSING_CHECK_OUT)
- إرجاع حالة الحاجة للمراجعة

---

### 2. **triggers.sql** - PostgreSQL Triggers
يحتوي على 4 triggers رئيسية:

#### `trg_auto_complete_punches`
معالج تلقائي للبصمات الناقصة:
- عند إدراج بصمة جديدة
- إذا كان هناك check-in بدون check-out
- يُدرج check-out تلقائي في وقت نهاية الوردية
- يُعلّم البصمة بـ `is_automatic = TRUE`

#### `trg_update_last_attendance`
تحديث آخر حضور للعامل:
- عند كل بصمة جديدة
- يحدّث حقل `last_attendance_at` في جدول workers

#### `trg_audit_payroll_changes`
تسجيل جميع التغييرات:
- يسجل جميع INSERT/UPDATE/DELETE على جداول الرواتب
- يحفظ القيم القديمة والجديدة
- يسجل من قام بالتغيير والوقت

#### `trg_validate_schedule`
التحقق من صحة الجدول الزمني:
- التأكد من أن start_time < end_time
- التأكد من أن required_hours > 0
- التأكد من أن day_of_week بين 0-6

---

### 3. **rls.sql** - Row Level Security Policies
سياسات الأمان على مستوى الصفوف:

#### Policies المطبقة:
- **attendance_events**: فقط الـ admins يمكنهم الوصول
- **worker_daily_finance**: فقط الـ admins والـ payroll managers
- **payroll_batches**: فقط الـ admins
- **group_schedules**: الجميع يمكنهم القراءة، فقط الـ admins يمكنهم التعديل

#### Views المُنشأة:
- **vw_daily_payroll_summary**: ملخص الرواتب اليومية (Admin Only)
- **vw_group_payroll_summary**: ملخص رواتب المجموعة (Admin Only)

---

### 4. **prototype_technicians.sql** - نموذج أولي
مثال عملي كامل لمجموعة الفنيين:

#### البيانات المُنشأة:
1. **مجموعة الفنيين** (TECH-001)
   - الراتب اليومي: 500 ريال
   - ساعات العمل: 8 ساعات

2. **جدول زمني ديناميكي:**
   - الخميس والجمعة: 6:00 صباحاً - 2:00 ظهراً (8 ساعات)
   - السبت إلى الأربعاء: 1:00 ظهراً - 8:00 مساءً (7 ساعات)

3. **5 عمال نموذجيين** مع بيانات حقيقية

4. **سجلات حضور متنوعة:**
   - حضور كامل
   - بصمة ناقصة (check-out)
   - بصمة ناقصة (check-in)
   - تأخر
   - مغادرة مبكرة

5. **استعلامات التحقق:**
   - عرض جدول المجموعة
   - عرض قائمة العمال
   - عرض سجلات الحضور
   - حساب الراتب اليومي
   - ملخص رواتب المجموعة
   - كشف البصمات الناقصة

---

## 🚀 خطوات التطبيق

### الخطوة 1: تحويل الـ SQL من PostgreSQL إلى MySQL

بما أن المشروع يستخدم MySQL، يجب تحويل الـ SQL:

**الفروقات الرئيسية:**
```
PostgreSQL → MySQL

EXTRACT(DOW FROM date) → DAYOFWEEK(date) - 1
EXTRACT(EPOCH FROM interval) → TIMESTAMPDIFF(SECOND, ...)
TIMESTAMP(date, time) → CONCAT(date, ' ', time)
GREATEST(0, value) → IF(value > 0, value, 0)
row_to_json() → JSON_OBJECT()
```

### الخطوة 2: إنشاء Migration File

```bash
# إنشاء ملف migration جديد
pnpm drizzle-kit generate mysql --name add_payroll_functions

# تطبيق الـ Migration
pnpm db:push
```

### الخطوة 3: تطبيق الـ SQL على Supabase

1. اذهب إلى [Supabase Dashboard](https://app.supabase.com)
2. اختر المشروع
3. اذهب إلى **SQL Editor**
4. انسخ محتوى `functions.sql`
5. اضغط **Run**

كرر العملية لـ `triggers.sql` و `rls.sql`

### الخطوة 4: تطبيق النموذج الأولي

```bash
# تطبيق بيانات النموذج الأولي
pnpm db:push < drizzle/prototype_technicians.sql
```

---

## 📊 مثال عملي: حساب الراتب اليومي

### البيانات المدخلة:
- العامل: أحمد محمد علي (ID: 1)
- التاريخ: 2024-01-25 (خميس)
- الجدول الزمني: 6:00 - 14:00 (8 ساعات)
- الراتب اليومي: 500 ريال

### البصمات:
- Check-in: 06:15 (متأخر 15 دقيقة)
- Check-out: 14:00 (في الوقت)

### الحساب:
```
الساعات الفعلية = 14:00 - 06:15 = 7.75 ساعة
الراتب المحسوب = (7.75 / 8) × 500 = 484.375 ريال
التأخر = 15 دقيقة
الحالة = COMPLETED (بصمات كاملة)
```

### الاستعلام:
```sql
SELECT * FROM calculate_daily_payroll(1, '2024-01-25');
```

### المخرجات:
```
worker_id: 1
work_date: 2024-01-25
scheduled_hours: 8.00
actual_hours: 7.75
late_minutes: 15
early_departure_minutes: 0
daily_rate: 500.00
calculated_pay: 484.38
is_auto_completed: FALSE
status: COMPLETED
```

---

## 🔐 أمثلة على RLS Policies

### مثال 1: السماح للـ Admin فقط بقراءة الرواتب
```sql
CREATE POLICY "admin_read_payroll" ON payroll_batches
  FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');
```

### مثال 2: السماح للعامل برؤية بيانته فقط
```sql
CREATE POLICY "worker_read_own_attendance" ON attendance_events
  FOR SELECT
  USING (worker_id = auth.uid());
```

---

## 🧪 اختبار الـ Functions

### اختبار 1: حساب الراتب اليومي
```sql
SELECT * FROM calculate_daily_payroll(1, CURDATE());
```

### اختبار 2: ملخص رواتب المجموعة
```sql
SELECT * FROM calculate_group_payroll(1, CURDATE());
```

### اختبار 3: كشف البصمات الناقصة
```sql
SELECT * FROM detect_missing_punches(1, CURDATE());
```

### اختبار 4: عرض الـ Views
```sql
SELECT * FROM vw_daily_payroll_summary WHERE work_date = CURDATE();
SELECT * FROM vw_group_payroll_summary WHERE work_date = CURDATE();
```

---

## 📈 الفوائد المتوقعة

### 1. **الأداء**
- جميع الحسابات تتم في قاعدة البيانات (أسرع)
- تقليل نقل البيانات بين الخادم والقاعدة
- استعلامات محسّنة مع indexes

### 2. **الأمان**
- RLS يضمن عدم وصول المستخدمين لبيانات غير مصرح لهم
- Triggers تسجل جميع التغييرات (Audit Trail)
- Validation يمنع البيانات غير الصحيحة

### 3. **الموثوقية**
- معالجة تلقائية للبصمات الناقصة
- عدم فقدان البيانات (Double Payment Protection)
- تسجيل شامل لجميع العمليات

### 4. **سهولة الاستخدام**
- Views توفر بيانات جاهزة للعرض
- Functions تبسط الحسابات المعقدة
- Triggers تعمل بشكل تلقائي بدون تدخل يدوي

---

## ⚠️ ملاحظات مهمة

### 1. **التوافقية**
- الـ SQL المرفقة لـ PostgreSQL
- تحتاج تحويل لـ MySQL/Supabase
- اختبر جيداً قبل التطبيق على الإنتاج

### 2. **الأداء**
- أضف indexes على الأعمدة المستخدمة في WHERE
- استخدم EXPLAIN لتحليل الاستعلامات
- راقب سجلات الخادم للأخطاء

### 3. **الأمان**
- تأكد من تفعيل RLS على جميع الجداول الحساسة
- استخدم JWT tokens للمصادقة
- لا تخزن كلمات المرور بشكل مباشر

### 4. **النسخ الاحتياطية**
- قم بعمل نسخة احتياطية قبل تطبيق التغييرات
- اختبر على بيئة التطوير أولاً
- احتفظ بسجل التغييرات (Git)

---

## 🔗 المراجع والموارد

- [PostgreSQL Functions Documentation](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [PostgreSQL Triggers Documentation](https://www.postgresql.org/docs/current/sql-createtrigger.html)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [MySQL vs PostgreSQL Syntax](https://www.postgresql.org/docs/current/sql-syntax.html)

---

## 📞 الدعم والمساعدة

إذا واجهت أي مشاكل:

1. تحقق من سجلات الخطأ في Supabase Dashboard
2. استخدم SQL Editor لاختبار الـ Queries
3. تأكد من صحة الـ SQL Syntax
4. اختبر على بيانات نموذجية أولاً

---

**آخر تحديث:** 2024-02-01
**الإصدار:** 1.0
**الحالة:** جاهز للتطبيق
