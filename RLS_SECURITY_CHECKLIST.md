# قائمة فحص الأمان و RLS (Row Level Security)

## المرحلة 1: التحقق من تفعيل RLS

### الخطوة 1: تفعيل RLS على الجداول الحساسة

```sql
-- تفعيل RLS على جدول الحضور والانصراف
ALTER TABLE attendance_events ENABLE ROW LEVEL SECURITY;

-- تفعيل RLS على جدول الرواتب
ALTER TABLE payroll_batches ENABLE ROW LEVEL SECURITY;

-- تفعيل RLS على جدول الموظفين
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

-- تفعيل RLS على جدول الجداول الزمنية
ALTER TABLE group_schedules ENABLE ROW LEVEL SECURITY;

-- تفعيل RLS على جدول المجموعات
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
```

### الخطوة 2: التحقق من تفعيل RLS

```sql
-- اعرض جميع الجداول التي فعلت عليها RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**النتيجة المتوقعة:** جميع الجداول الحساسة يجب أن تظهر `rowsecurity = true`

---

## المرحلة 2: إنشاء RLS Policies

### السياسة 1: المديرين يرون جميع البيانات

```sql
-- سياسة للمديرين على جدول الحضور
CREATE POLICY "admins_see_all_attendance"
ON attendance_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'admin'
  )
);

-- سياسة للمديرين على جدول الموظفين
CREATE POLICY "admins_see_all_workers"
ON workers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'admin'
  )
);

-- سياسة للمديرين على جدول الرواتب
CREATE POLICY "admins_see_all_payroll"
ON payroll_batches FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'admin'
  )
);
```

### السياسة 2: المشرفون يرون فقط مجموعتهم

```sql
-- سياسة للمشرفين على جدول الحضور
CREATE POLICY "supervisors_see_own_group_attendance"
ON attendance_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workers w
    WHERE w.id = attendance_events.worker_id
    AND w.group_id IN (
      SELECT group_id FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'supervisor'
    )
  )
);

-- سياسة للمشرفين على جدول الموظفين
CREATE POLICY "supervisors_see_own_group_workers"
ON workers FOR SELECT
USING (
  group_id IN (
    SELECT group_id FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'supervisor'
  )
);
```

### السياسة 3: الموظفون يرون فقط بيانات أنفسهم

```sql
-- سياسة للموظفين على جدول الحضور
CREATE POLICY "employees_see_own_attendance"
ON attendance_events FOR SELECT
USING (
  worker_id IN (
    SELECT id FROM workers w
    WHERE w.user_id = auth.uid()
  )
);

-- سياسة للموظفين على جدول الموظفين
CREATE POLICY "employees_see_own_profile"
ON workers FOR SELECT
USING (
  user_id = auth.uid()
);
```

### السياسة 4: فقط المديرين يمكنهم تعديل الرواتب

```sql
-- سياسة لتعديل الرواتب
CREATE POLICY "only_admins_modify_payroll"
ON payroll_batches FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'admin'
  )
);
```

---

## المرحلة 3: التحقق من الـ Policies

### عرض جميع الـ Policies

```sql
-- اعرض جميع الـ Policies المفعلة
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

### التحقق من الـ Policies على جدول معين

```sql
-- اعرض الـ Policies على جدول الحضور
SELECT 
  policyname,
  permissive,
  roles,
  qual
FROM pg_policies
WHERE tablename = 'attendance_events'
ORDER BY policyname;
```

---

## المرحلة 4: اختبار الفصل بين المجموعات

### اختبر أن المجموعات مستقلة

```sql
-- تحقق من أن الفنيين لا يرون بيانات الإداريين
SELECT 
  g.id,
  g.name,
  COUNT(DISTINCT w.id) as worker_count,
  COUNT(DISTINCT ae.id) as event_count
FROM groups g
LEFT JOIN workers w ON g.id = w.group_id
LEFT JOIN attendance_events ae ON w.id = ae.worker_id
WHERE g.id IN (1, 2, 3, 4)
GROUP BY g.id, g.name
ORDER BY g.id;

-- النتيجة المتوقعة:
-- id | name | worker_count | event_count
-- 1  | الفنيين | 5 | 50
-- 2  | الإداريين | 3 | 30
-- 3  | الأمن | 2 | 20
-- 4  | الصيانة | 2 | 20
```

### اختبر الفصل على مستوى المستخدم

```sql
-- محاكاة مستخدم من مجموعة الفنيين
-- (يجب أن يرى فقط بيانات مجموعته)

-- محاكاة مستخدم من مجموعة الإداريين
-- (يجب أن يرى فقط بيانات مجموعته)

-- محاكاة مدير
-- (يجب أن يرى جميع البيانات)
```

---

## المرحلة 5: فحص الأمان الشامل

### قائمة الفحص

- [ ] تم تفعيل RLS على جميع الجداول الحساسة
- [ ] تم إنشاء Policies للمديرين (رؤية كاملة)
- [ ] تم إنشاء Policies للمشرفين (رؤية المجموعة فقط)
- [ ] تم إنشاء Policies للموظفين (رؤية الملف الشخصي فقط)
- [ ] تم اختبار الفصل بين المجموعات
- [ ] تم التحقق من عدم تسرب البيانات
- [ ] تم تفعيل الإشعارات الفورية
- [ ] تم حقن البيانات الحقيقية
- [ ] تم اختبار الرسوم البيانية
- [ ] تم اختبار مركز المراجعة

### اختبار الأمان اليدوي

```bash
# اختبر بحساب مشرف من مجموعة الفنيين
curl -X GET "https://your-project.supabase.co/rest/v1/attendance_events" \
  -H "Authorization: Bearer supervisor-token" \
  -H "apikey: your-anon-key"

# يجب أن يرى فقط بيانات مجموعة الفنيين
```

---

## المرحلة 6: الإجراءات الأمنية الإضافية

### تفعيل SSL/TLS

```sql
-- تأكد من أن جميع الاتصالات مشفرة
-- في إعدادات Supabase:
-- Settings → Security → SSL/TLS
-- اختر "Enforce SSL"
```

### تفعيل 2FA للمديرين

```sql
-- في إعدادات Supabase Auth:
-- Authentication → Policies
-- فعل MFA للمديرين
```

### إنشاء نسخ احتياطية

```sql
-- تأكد من تفعيل النسخ الاحتياطية التلقائية
-- في إعدادات Supabase:
-- Database → Backups
-- اختر "Automatic backups enabled"
```

---

## المرحلة 7: المراقبة والتسجيل

### تفعيل Audit Logs

```sql
-- تحقق من تفعيل سجلات التدقيق
SELECT * FROM audit_logs ORDER BY changed_at DESC LIMIT 10;
```

### مراقبة الوصول غير المصرح

```sql
-- ابحث عن محاولات وصول مشبوهة
SELECT 
  user_id,
  COUNT(*) as attempt_count,
  MAX(created_at) as last_attempt
FROM audit_logs
WHERE action IN ('SELECT', 'UPDATE', 'DELETE')
GROUP BY user_id
HAVING COUNT(*) > 100
ORDER BY attempt_count DESC;
```

---

## المرحلة 8: التوثيق والتدريب

### توثيق الأدوار والصلاحيات

| الدور | الصلاحيات | الجداول المسموحة |
|------|---------|-----------------|
| **Admin** | رؤية/تعديل الكل | جميع الجداول |
| **Supervisor** | رؤية/تعديل المجموعة | مجموعتهم فقط |
| **Employee** | رؤية الملف الشخصي | ملفهم الشخصي فقط |

### تدريب المستخدمين

- شرح سياسات الأمان
- تعليم كيفية استخدام النظام بأمان
- توضيح ما يمكن ولا يمكن الوصول إليه

---

## الملاحظات الختامية

✅ **بعد إكمال جميع الفحوصات:**
- النظام آمن وجاهز للإنتاج
- البيانات محمية بـ RLS
- المجموعات مستقلة تماماً
- الإشعارات تعمل بشكل فوري
- الرسوم البيانية تعرض البيانات الصحيحة

⚠️ **تذكيرات مهمة:**
- راجع الأمان بانتظام
- حدّث الـ Policies عند إضافة أدوار جديدة
- راقب السجلات للكشف عن الأنشطة المريبة
- احتفظ بنسخ احتياطية منتظمة
