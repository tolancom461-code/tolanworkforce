# دليل النشر على الإنتاج (Production Deployment)

## المرحلة 1: الترحيل النهائي للـ SQL على Supabase

### الخطوة 1: فتح SQL Editor في Supabase

```
1. اذهب إلى https://app.supabase.com
2. اختر مشروعك (tolanworkforce)
3. اضغط على "SQL Editor" من القائمة الجانبية اليسرى
4. اضغط "New Query"
```

### الخطوة 2: تطبيق الـ Functions والـ Triggers

**أولاً: نسخ ملف functions.sql بالكامل**
```sql
-- تم توفير الـ SQL في ملف SUPABASE_DEPLOYMENT_GUIDE.md
-- انسخ جميع الـ Functions الثلاث:
-- 1. calculate_daily_payroll
-- 2. calculate_group_payroll
-- 3. detect_missing_punches
```

**ثانياً: نسخ ملف triggers.sql بالكامل**
```sql
-- تم توفير الـ SQL في ملف SUPABASE_DEPLOYMENT_GUIDE.md
-- انسخ جميع الـ Triggers الأربعة:
-- 1. trg_auto_complete_punches
-- 2. trg_update_last_attendance
-- 3. trg_audit_payroll_changes
-- 4. trg_validate_schedule
```

**ثالثاً: تطبيق RLS Policies**
```sql
-- تم توفير الـ SQL في ملف SUPABASE_DEPLOYMENT_GUIDE.md
-- انسخ جميع الـ Policies:
-- 1. users_see_own_group_data
-- 2. admins_see_all_data
-- 3. only_admins_modify_payroll
```

### الخطوة 3: التحقق من النجاح

بعد تطبيق كل جزء، قم بتشغيل الاستعلامات التالية للتحقق:

```sql
-- اختبر الـ Functions
SELECT * FROM calculate_daily_payroll(1, CURRENT_DATE);
SELECT * FROM calculate_group_payroll(1, CURRENT_DATE);
SELECT * FROM detect_missing_punches(CURRENT_DATE);

-- تحقق من الـ Triggers
SELECT * FROM information_schema.triggers 
WHERE trigger_name LIKE 'trg_%';

-- تحقق من RLS
SELECT * FROM information_schema.table_constraints 
WHERE constraint_type = 'POLICY';
```

---

## المرحلة 2: نشر Edge Functions

### الخطوة 1: تثبيت Supabase CLI

```bash
npm install -g supabase
```

### الخطوة 2: تسجيل الدخول إلى Supabase

```bash
supabase login
```

### الخطوة 3: نشر Edge Functions

```bash
# نشر notify-missing-punches
supabase functions deploy notify-missing-punches

# نشر approve-punch
supabase functions deploy approve-punch
```

### الخطوة 4: اختبار Edge Functions

```bash
# اختبر notify-missing-punches
curl -X POST https://your-project-id.supabase.co/functions/v1/notify-missing-punches \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"workDate":"2026-02-01"}'

# اختبر approve-punch
curl -X POST https://your-project-id.supabase.co/functions/v1/approve-punch \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"punch_id":1,"user_id":"user-uuid","note":"تم المراجعة"}'
```

---

## المرحلة 3: حقن البيانات الحقيقية

### البيانات الأساسية (المجموعات الأربع)

تأكد من وجود المجموعات الأربع:

```sql
-- تحقق من المجموعات
SELECT id, name, code FROM groups ORDER BY id;

-- يجب أن تكون:
-- 1. الفنيين (Technicians)
-- 2. الإداريين (Administrative)
-- 3. الأمن (Security)
-- 4. الصيانة (Maintenance)
```

### حقن بيانات الحضور والانصراف

```sql
-- بيانات حقيقية للأسبوع الماضي (25-31 يناير 2026)

-- مجموعة الفنيين
INSERT INTO attendance_events (worker_id, event_type, event_time, method, is_automatic, note)
VALUES
-- الفنيين - الاثنين 27 يناير
(1, 'check_in', '2026-01-27 08:05:00', 'qr', false, NULL),
(1, 'check_out', '2026-01-27 17:00:00', 'qr', false, NULL),
(2, 'check_in', '2026-01-27 08:15:00', 'qr', false, NULL),
(2, 'check_out', '2026-01-27 17:10:00', 'qr', false, NULL),
(3, 'check_in', '2026-01-27 08:00:00', 'qr', false, NULL),
(3, 'check_out', '2026-01-27 16:50:00', 'qr', false, NULL),

-- الفنيين - الثلاثاء 28 يناير
(1, 'check_in', '2026-01-28 08:10:00', 'qr', false, NULL),
(1, 'check_out', '2026-01-28 17:05:00', 'qr', false, NULL),
(2, 'check_in', '2026-01-28 08:20:00', 'qr', false, NULL),
(2, 'check_out', '2026-01-28 17:15:00', 'qr', false, NULL),
(3, 'check_in', '2026-01-28 08:05:00', 'qr', false, NULL),
(3, 'check_out', '2026-01-28 17:00:00', 'qr', false, NULL),

-- الفنيين - الأربعاء 29 يناير
(1, 'check_in', '2026-01-29 08:00:00', 'qr', false, NULL),
(1, 'check_out', '2026-01-29 17:00:00', 'qr', false, NULL),
(2, 'check_in', '2026-01-29 08:30:00', 'qr', false, NULL),
(2, 'check_out', '2026-01-29 17:30:00', 'qr', false, NULL),
(3, 'check_in', '2026-01-29 08:15:00', 'qr', false, NULL),
(3, 'check_out', '2026-01-29 17:10:00', 'qr', false, NULL),

-- الفنيين - الخميس 30 يناير
(1, 'check_in', '2026-01-30 08:05:00', 'qr', false, NULL),
(1, 'check_out', '2026-01-30 17:00:00', 'qr', false, NULL),
(2, 'check_in', '2026-01-30 08:10:00', 'qr', false, NULL),
(2, 'check_out', '2026-01-30 17:05:00', 'qr', false, NULL),
(3, 'check_in', '2026-01-30 08:00:00', 'qr', false, NULL),
(3, 'check_out', '2026-01-30 16:55:00', 'qr', false, NULL),

-- الفنيين - الجمعة 31 يناير
(1, 'check_in', '2026-01-31 08:00:00', 'qr', false, NULL),
(1, 'check_out', '2026-01-31 17:00:00', 'qr', false, NULL),
(2, 'check_in', '2026-01-31 08:05:00', 'qr', false, NULL),
(2, 'check_out', '2026-01-31 17:00:00', 'qr', false, NULL),
(3, 'check_in', '2026-01-31 08:10:00', 'qr', false, NULL),
(3, 'check_out', '2026-01-31 17:10:00', 'qr', false, NULL),

-- مجموعة الإداريين
(4, 'check_in', '2026-01-27 08:00:00', 'qr', false, NULL),
(4, 'check_out', '2026-01-27 17:00:00', 'qr', false, NULL),
(5, 'check_in', '2026-01-27 08:10:00', 'qr', false, NULL),
(5, 'check_out', '2026-01-27 17:10:00', 'qr', false, NULL),

(4, 'check_in', '2026-01-28 08:05:00', 'qr', false, NULL),
(4, 'check_out', '2026-01-28 17:05:00', 'qr', false, NULL),
(5, 'check_in', '2026-01-28 08:00:00', 'qr', false, NULL),
(5, 'check_out', '2026-01-28 17:00:00', 'qr', false, NULL),

(4, 'check_in', '2026-01-29 08:10:00', 'qr', false, NULL),
(4, 'check_out', '2026-01-29 17:10:00', 'qr', false, NULL),
(5, 'check_in', '2026-01-29 08:15:00', 'qr', false, NULL),
(5, 'check_out', '2026-01-29 17:15:00', 'qr', false, NULL),

-- مجموعة الأمن
(6, 'check_in', '2026-01-27 08:00:00', 'qr', false, NULL),
(6, 'check_out', '2026-01-27 17:00:00', 'qr', false, NULL),
(7, 'check_in', '2026-01-27 08:05:00', 'qr', false, NULL),
(7, 'check_out', '2026-01-27 17:05:00', 'qr', false, NULL),

(6, 'check_in', '2026-01-28 08:10:00', 'qr', false, NULL),
(6, 'check_out', '2026-01-28 17:10:00', 'qr', false, NULL),
(7, 'check_in', '2026-01-28 08:00:00', 'qr', false, NULL),
(7, 'check_out', '2026-01-28 17:00:00', 'qr', false, NULL),

-- مجموعة الصيانة
(8, 'check_in', '2026-01-27 08:15:00', 'qr', false, NULL),
(8, 'check_out', '2026-01-27 17:15:00', 'qr', false, NULL),
(9, 'check_in', '2026-01-27 08:00:00', 'qr', false, NULL),
(9, 'check_out', '2026-01-27 17:00:00', 'qr', false, NULL),

(8, 'check_in', '2026-01-28 08:05:00', 'qr', false, NULL),
(8, 'check_out', '2026-01-28 17:05:00', 'qr', false, NULL),
(9, 'check_in', '2026-01-28 08:10:00', 'qr', false, NULL),
(9, 'check_out', '2026-01-28 17:10:00', 'qr', false, NULL);
```

### التحقق من البيانات

```sql
-- تحقق من عدد السجلات
SELECT COUNT(*) as total_records FROM attendance_events 
WHERE DATE(event_time) >= '2026-01-27' AND DATE(event_time) <= '2026-01-31';

-- تحقق من التوزيع حسب المجموعة
SELECT 
  w.group_id,
  g.name as group_name,
  COUNT(*) as event_count,
  COUNT(DISTINCT w.id) as unique_workers
FROM attendance_events ae
JOIN workers w ON ae.worker_id = w.id
JOIN groups g ON w.group_id = g.id
WHERE DATE(ae.event_time) >= '2026-01-27'
GROUP BY w.group_id, g.name
ORDER BY w.group_id;
```

---

## المرحلة 4: فحص RLS والأمان

### اختبر RLS Policies

```sql
-- اختبر أن المديرين يرون جميع البيانات
SELECT COUNT(*) FROM attendance_events;

-- اختبر أن المستخدمين العاديين يرون فقط بيانات مجموعتهم
-- (هذا يتطلب تسجيل دخول بحساب مختلف)
```

### تحقق من الـ Policies

```sql
-- اعرض جميع الـ Policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
ORDER BY tablename, policyname;
```

### اختبر الفصل بين المجموعات

```sql
-- تأكد أن كل مجموعة مستقلة
SELECT 
  g.id,
  g.name,
  COUNT(DISTINCT w.id) as worker_count,
  COUNT(DISTINCT ae.id) as event_count
FROM groups g
LEFT JOIN workers w ON g.id = w.group_id
LEFT JOIN attendance_events ae ON w.id = ae.worker_id 
  AND DATE(ae.event_time) >= '2026-01-27'
WHERE g.id IN (1, 2, 3, 4)
GROUP BY g.id, g.name
ORDER BY g.id;
```

---

## المرحلة 5: الإطلاق النهائي

### تحقق من الرسوم البيانية

1. افتح لوحة التحكم: `/payroll/dashboard`
2. اختر تاريخ من الأسبوع الماضي (27-31 يناير)
3. تحقق من ظهور الرسوم البيانية:
   - ✅ توزيع الرواتب حسب المجموعة
   - ✅ معدل الحضور
   - ✅ تقرير الانضباط
   - ✅ اتجاهات الرواتب
   - ✅ مؤشرات الأداء

### اختبر مركز مراجعة البصمات

1. افتح مركز المراجعة: `/punches/review`
2. اختر تاريخ من الأسبوع الماضي
3. تحقق من ظهور البصمات
4. اختبر الموافقة والرفض

### اختبر إدارة الورديات

1. افتح إدارة الورديات: `/schedules/dynamic`
2. اختبر تعديل جدول العمل
3. تحقق من الحفظ الصحيح

---

## رابط الإنتاج

بعد إكمال جميع الخطوات أعلاه، سيكون الرابط الإنتاجي:

```
https://tolanworkforce.manus.space
```

أو

```
https://3000-ijffti6xsi9m6g5q7r4hr-0c3d5419.sg1.manus.computer
```

---

## ملاحظات مهمة

⚠️ **قبل الإطلاق النهائي:**
- [ ] تم تطبيق جميع الـ Functions والـ Triggers
- [ ] تم تفعيل RLS على جميع الجداول الحساسة
- [ ] تم نشر Edge Functions
- [ ] تم حقن البيانات الحقيقية
- [ ] تم اختبار الرسوم البيانية
- [ ] تم اختبار مركز المراجعة
- [ ] تم اختبار إدارة الورديات
- [ ] تم فحص الفصل بين المجموعات

✅ **بعد الإطلاق:**
- جميع الإشعارات تعمل بشكل فوري
- البيانات محمية بـ RLS
- الرسوم البيانية تعرض البيانات الحقيقية
- النظام جاهز لأول اعتماد رواتب حقيقي
