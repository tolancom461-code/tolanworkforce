# Supabase Setup Guide - TolanWorkforce

## 🎯 الهدف
تطبيق PostgreSQL Functions والـ Triggers والـ RLS Policies على قاعدة بيانات Supabase.

---

## 📋 المتطلبات

- حساب Supabase نشط
- رابط المشروع في Supabase
- مفاتيح API (API Keys)
- صلاحيات الوصول الكامل (Admin)

---

## 🚀 خطوات التطبيق

### الخطوة 1: الدخول إلى Supabase Dashboard

1. اذهب إلى [Supabase Dashboard](https://app.supabase.com)
2. اختر مشروع `tolanworkforce`
3. اذهب إلى **SQL Editor** من القائمة الجانبية

### الخطوة 2: تطبيق PostgreSQL Functions

1. انسخ محتوى ملف `drizzle/functions.sql`
2. الصق الكود في SQL Editor
3. اضغط **Run** (أو Ctrl+Enter)
4. تأكد من ظهور رسالة نجاح

**الـ Functions المُنشأة:**
- `calculate_daily_payroll(worker_id, work_date)`
- `calculate_group_payroll(group_id, work_date)`
- `detect_missing_punches(worker_id, work_date)`

### الخطوة 3: تطبيق Triggers

1. انسخ محتوى ملف `drizzle/triggers.sql`
2. الصق الكود في SQL Editor
3. اضغط **Run**
4. تأكد من عدم ظهور أخطاء

**الـ Triggers المُنشأة:**
- `trg_auto_complete_punches` - معالجة البصمات الناقصة
- `trg_update_last_attendance` - تحديث آخر حضور
- `trg_audit_payroll_changes` - تسجيل التغييرات

### الخطوة 4: تطبيق RLS Policies

1. انسخ محتوى ملف `drizzle/rls.sql`
2. الصق الكود في SQL Editor
3. اضغط **Run**
4. تأكد من النجاح

**السياسات المُطبقة:**
- `attendance_events` - فقط الـ admins
- `worker_daily_finance` - فقط الـ admins والـ payroll managers
- `payroll_batches` - فقط الـ admins
- `group_schedules` - قراءة للجميع، تعديل للـ admins

### الخطوة 5: تطبيق النموذج الأولي (اختياري)

1. انسخ محتوى ملف `drizzle/prototype_technicians.sql`
2. الصق الكود في SQL Editor
3. اضغط **Run**
4. سيتم إنشاء:
   - مجموعة الفنيين
   - جدول زمني ديناميكي
   - 5 عمال نموذجيين
   - سجلات حضور متنوعة

---

## ✅ التحقق من النجاح

### اختبار 1: التحقق من الـ Functions

```sql
-- اختبر حساب الراتب اليومي
SELECT * FROM calculate_daily_payroll(1, CURDATE());

-- اختبر ملخص رواتب المجموعة
SELECT * FROM calculate_group_payroll(1, CURDATE());

-- اختبر كشف البصمات الناقصة
SELECT * FROM detect_missing_punches(1, CURDATE());
```

### اختبار 2: التحقق من الـ Views

```sql
-- عرض ملخص الرواتب اليومية
SELECT * FROM vw_daily_payroll_summary WHERE work_date = CURDATE();

-- عرض ملخص رواتب المجموعة
SELECT * FROM vw_group_payroll_summary WHERE work_date = CURDATE();
```

### اختبر 3: التحقق من الـ RLS

```sql
-- تحقق من RLS على جدول attendance_events
SELECT * FROM information_schema.table_constraints 
WHERE table_name = 'attendance_events' AND constraint_type = 'POLICY';
```

---

## 🔍 استكشاف الأخطاء

### مشكلة: "Function already exists"

**الحل:** استخدم `DROP FUNCTION IF EXISTS` قبل الإنشاء

```sql
DROP FUNCTION IF EXISTS calculate_daily_payroll(INT, DATE);
```

### مشكلة: "Trigger already exists"

**الحل:** استخدم `DROP TRIGGER IF EXISTS` قبل الإنشاء

```sql
DROP TRIGGER IF EXISTS trg_auto_complete_punches ON attendance_events;
```

### مشكلة: "Permission denied"

**الحل:** تأكد من أنك تستخدم حساب Admin في Supabase

1. اذهب إلى **Settings** → **Database**
2. تأكد من استخدام `postgres` user أو admin user
3. تأكد من صلاحيات الوصول الكامل

### مشكلة: "RLS Policy not applied"

**الحل:** تأكد من تفعيل RLS على الجدول أولاً

```sql
-- تفعيل RLS
ALTER TABLE attendance_events ENABLE ROW LEVEL SECURITY;

-- ثم أضف السياسات
CREATE POLICY "admin_read" ON attendance_events
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
```

---

## 📊 مثال عملي كامل

### السيناريو:
- عامل: أحمد محمد (ID: 1)
- التاريخ: 2024-01-25 (خميس)
- الوردية: 6:00 - 14:00 (8 ساعات)
- الراتب: 500 ريال

### البصمات:
- Check-in: 06:15 (متأخر 15 دقيقة)
- Check-out: 14:00 (في الوقت)

### الاستعلام:

```sql
-- 1. إدراج البصمات
INSERT INTO attendance_events (worker_id, event_type, event_time, method)
VALUES 
  (1, 'check_in', '2024-01-25 06:15:00', 'qr_code'),
  (1, 'check_out', '2024-01-25 14:00:00', 'qr_code');

-- 2. حساب الراتب اليومي
SELECT * FROM calculate_daily_payroll(1, '2024-01-25');

-- 3. عرض النتيجة
-- worker_id: 1
-- work_date: 2024-01-25
-- scheduled_hours: 8.00
-- actual_hours: 7.75
-- late_minutes: 15
-- early_departure_minutes: 0
-- daily_rate: 500.00
-- calculated_pay: 484.38
-- is_auto_completed: FALSE
-- status: COMPLETED
```

---

## 🔐 أمثلة على RLS Policies

### السماح للـ Admin فقط:

```sql
CREATE POLICY "admin_only" ON payroll_batches
  FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');
```

### السماح للعامل برؤية بيانته:

```sql
CREATE POLICY "worker_own_data" ON attendance_events
  FOR SELECT
  USING (worker_id = auth.uid());
```

### السماح للـ Payroll Manager:

```sql
CREATE POLICY "payroll_manager" ON payroll_batches
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'admin' OR
    auth.jwt() ->> 'role' = 'payroll_manager'
  );
```

---

## 📈 الأداء والتحسينات

### إضافة Indexes للأداء الأفضل:

```sql
-- Indexes على attendance_events
CREATE INDEX idx_attendance_worker_date 
ON attendance_events(worker_id, DATE(event_time));

CREATE INDEX idx_attendance_event_type 
ON attendance_events(event_type);

-- Indexes على group_schedules
CREATE INDEX idx_group_schedules_group_day 
ON group_schedules(group_id, day_of_week);

-- Indexes على payroll_batches
CREATE INDEX idx_payroll_batches_status_date 
ON payroll_batches(status, period_start);
```

### مراقبة الأداء:

```sql
-- عرض استعلامات بطيئة
SELECT * FROM pg_stat_statements 
WHERE mean_exec_time > 1000 
ORDER BY mean_exec_time DESC;

-- عرض استخدام الـ Indexes
SELECT * FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;
```

---

## 🔄 التحديثات المستقبلية

### المرحلة 2: Edge Functions
- إرسال تنبيهات تلقائية للبصمات الناقصة
- حساب الرواتب تلقائياً يومياً

### المرحلة 3: Advanced Features
- دعم الإجازات والأيام الخاصة
- حساب المكافآت والحوافز
- تقارير متقدمة

### المرحلة 4: Integration
- ربط مع أنظمة الرواتب الخارجية
- تصدير البيانات إلى Excel/PDF
- API عام للتطبيقات الخارجية

---

## 📞 الدعم والمساعدة

### موارد مفيدة:
- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Functions](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [PostgreSQL Triggers](https://www.postgresql.org/docs/current/sql-createtrigger.html)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

### الاتصال بـ Supabase Support:
- اذهب إلى [Supabase Support](https://supabase.com/support)
- أو استخدم Discord Community

---

## ✨ ملاحظات مهمة

1. **النسخ الاحتياطية:** قم بعمل نسخة احتياطية قبل تطبيق التغييرات
2. **الاختبار:** اختبر على بيئة التطوير أولاً
3. **التوثيق:** احتفظ بسجل التغييرات
4. **الأمان:** لا تشارك مفاتيح API مع أحد
5. **المراقبة:** راقب سجلات الخادم للأخطاء

---

**آخر تحديث:** 2024-02-01
**الإصدار:** 1.0
**الحالة:** جاهز للتطبيق
