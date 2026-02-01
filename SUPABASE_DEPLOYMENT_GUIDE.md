# دليل تطبيق النظام على Supabase

## المرحلة 1: تطبيق SQL Functions و Triggers و RLS

### الخطوات:

#### 1. الدخول إلى Supabase SQL Editor
```
1. اذهب إلى https://app.supabase.com
2. اختر مشروعك (tolanworkforce)
3. اضغط على "SQL Editor" من القائمة الجانبية
4. اضغط "New Query"
```

#### 2. تطبيق PostgreSQL Functions

**الخطوة أ: دالة حساب الراتب اليومي**
```sql
-- Function: calculate_daily_payroll
CREATE OR REPLACE FUNCTION calculate_daily_payroll(
  p_worker_id INTEGER,
  p_work_date DATE
)
RETURNS TABLE (
  worker_id INTEGER,
  work_date DATE,
  scheduled_hours DECIMAL,
  actual_hours DECIMAL,
  late_minutes INTEGER,
  early_departure_minutes INTEGER,
  daily_rate DECIMAL,
  calculated_pay DECIMAL,
  is_auto_completed BOOLEAN,
  status VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    p_work_date,
    gs.required_hours::DECIMAL,
    COALESCE(
      EXTRACT(EPOCH FROM (
        (SELECT event_time FROM attendance_events 
         WHERE worker_id = p_worker_id 
         AND DATE(event_time) = p_work_date 
         AND event_type = 'check_out' 
         ORDER BY event_time DESC LIMIT 1)
        -
        (SELECT event_time FROM attendance_events 
         WHERE worker_id = p_worker_id 
         AND DATE(event_time) = p_work_date 
         AND event_type = 'check_in' 
         ORDER BY event_time ASC LIMIT 1)
      )) / 3600, 0)::DECIMAL,
    COALESCE(
      EXTRACT(EPOCH FROM (
        (SELECT event_time FROM attendance_events 
         WHERE worker_id = p_worker_id 
         AND DATE(event_time) = p_work_date 
         AND event_type = 'check_in' 
         ORDER BY event_time ASC LIMIT 1)
        - (gs.start_time::TIME)::TIMESTAMP
      )) / 60, 0)::INTEGER,
    COALESCE(
      EXTRACT(EPOCH FROM (
        (gs.end_time::TIME)::TIMESTAMP
        -
        (SELECT event_time FROM attendance_events 
         WHERE worker_id = p_worker_id 
         AND DATE(event_time) = p_work_date 
         AND event_type = 'check_out' 
         ORDER BY event_time DESC LIMIT 1)
      )) / 60, 0)::INTEGER,
    w.daily_rate::DECIMAL,
    (w.daily_rate * COALESCE(
      EXTRACT(EPOCH FROM (
        (SELECT event_time FROM attendance_events 
         WHERE worker_id = p_worker_id 
         AND DATE(event_time) = p_work_date 
         AND event_type = 'check_out' 
         ORDER BY event_time DESC LIMIT 1)
        -
        (SELECT event_time FROM attendance_events 
         WHERE worker_id = p_worker_id 
         AND DATE(event_time) = p_work_date 
         AND event_type = 'check_in' 
         ORDER BY event_time ASC LIMIT 1)
      )) / 3600, 0) / gs.required_hours)::DECIMAL,
    EXISTS(
      SELECT 1 FROM attendance_events 
      WHERE worker_id = p_worker_id 
      AND DATE(event_time) = p_work_date 
      AND method = 'auto_complete'
    ),
    CASE 
      WHEN EXISTS(
        SELECT 1 FROM attendance_events 
        WHERE worker_id = p_worker_id 
        AND DATE(event_time) = p_work_date 
        AND method = 'auto_complete'
      ) THEN 'PENDING_REVIEW'
      ELSE 'COMPLETED'
    END
  FROM workers w
  JOIN groups g ON w.group_id = g.id
  JOIN group_schedules gs ON g.id = gs.group_id 
    AND gs.day_of_week = EXTRACT(DOW FROM p_work_date)
  WHERE w.id = p_worker_id;
END;
$$ LANGUAGE plpgsql;
```

**الخطوة ب: دالة حساب رواتب المجموعة**
```sql
-- Function: calculate_group_payroll
CREATE OR REPLACE FUNCTION calculate_group_payroll(
  p_group_id INTEGER,
  p_work_date DATE
)
RETURNS TABLE (
  group_id INTEGER,
  group_name VARCHAR,
  group_code VARCHAR,
  work_date DATE,
  total_employees INTEGER,
  employees_checked_in INTEGER,
  employees_checked_out INTEGER,
  total_hours_worked DECIMAL,
  total_payroll DECIMAL,
  average_daily_pay DECIMAL,
  status VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.name,
    g.code,
    p_work_date,
    COUNT(DISTINCT w.id)::INTEGER,
    COUNT(DISTINCT CASE WHEN ae.event_type = 'check_in' THEN w.id END)::INTEGER,
    COUNT(DISTINCT CASE WHEN ae.event_type = 'check_out' THEN w.id END)::INTEGER,
    COALESCE(SUM(
      EXTRACT(EPOCH FROM (
        (SELECT event_time FROM attendance_events 
         WHERE worker_id = w.id 
         AND DATE(event_time) = p_work_date 
         AND event_type = 'check_out' 
         ORDER BY event_time DESC LIMIT 1)
        -
        (SELECT event_time FROM attendance_events 
         WHERE worker_id = w.id 
         AND DATE(event_time) = p_work_date 
         AND event_type = 'check_in' 
         ORDER BY event_time ASC LIMIT 1)
      )) / 3600
    ), 0)::DECIMAL,
    COALESCE(SUM(w.daily_rate), 0)::DECIMAL,
    COALESCE(AVG(w.daily_rate), 0)::DECIMAL,
    'PENDING'
  FROM groups g
  LEFT JOIN workers w ON g.id = w.group_id AND w.is_active = true
  LEFT JOIN attendance_events ae ON w.id = ae.worker_id 
    AND DATE(ae.event_time) = p_work_date
  WHERE g.id = p_group_id
  GROUP BY g.id, g.name, g.code;
END;
$$ LANGUAGE plpgsql;
```

**الخطوة ج: دالة كشف البصمات الناقصة**
```sql
-- Function: detect_missing_punches
CREATE OR REPLACE FUNCTION detect_missing_punches(
  p_work_date DATE
)
RETURNS TABLE (
  worker_id INTEGER,
  worker_name VARCHAR,
  group_id INTEGER,
  missing_type VARCHAR,
  expected_time TIME,
  status VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.full_name,
    w.group_id,
    'check_in'::VARCHAR,
    gs.start_time,
    'MISSING'::VARCHAR
  FROM workers w
  JOIN groups g ON w.group_id = g.id
  JOIN group_schedules gs ON g.id = gs.group_id
  WHERE w.is_active = true
    AND gs.is_active = true
    AND gs.day_of_week = EXTRACT(DOW FROM p_work_date)
    AND NOT EXISTS (
      SELECT 1 FROM attendance_events ae
      WHERE ae.worker_id = w.id
      AND DATE(ae.event_time) = p_work_date
      AND ae.event_type = 'check_in'
    )
  
  UNION ALL
  
  SELECT
    w.id,
    w.full_name,
    w.group_id,
    'check_out'::VARCHAR,
    gs.end_time,
    'MISSING'::VARCHAR
  FROM workers w
  JOIN groups g ON w.group_id = g.id
  JOIN group_schedules gs ON g.id = gs.group_id
  WHERE w.is_active = true
    AND gs.is_active = true
    AND gs.day_of_week = EXTRACT(DOW FROM p_work_date)
    AND EXISTS (
      SELECT 1 FROM attendance_events ae
      WHERE ae.worker_id = w.id
      AND DATE(ae.event_time) = p_work_date
      AND ae.event_type = 'check_in'
    )
    AND NOT EXISTS (
      SELECT 1 FROM attendance_events ae
      WHERE ae.worker_id = w.id
      AND DATE(ae.event_time) = p_work_date
      AND ae.event_type = 'check_out'
    );
END;
$$ LANGUAGE plpgsql;
```

#### 3. تطبيق Triggers

**الخطوة أ: Trigger لإكمال البصمات الناقصة تلقائياً**
```sql
-- Trigger: Auto-complete missing punches
CREATE OR REPLACE FUNCTION auto_complete_missing_punches()
RETURNS TRIGGER AS $$
DECLARE
  v_worker_id INTEGER;
  v_group_id INTEGER;
  v_schedule_record RECORD;
  v_missing_check_out TIMESTAMP;
BEGIN
  -- Get worker and group info
  SELECT w.id, w.group_id INTO v_worker_id, v_group_id
  FROM workers w
  WHERE w.id = NEW.worker_id;

  -- Get schedule for today
  SELECT * INTO v_schedule_record
  FROM group_schedules gs
  WHERE gs.group_id = v_group_id
    AND gs.day_of_week = EXTRACT(DOW FROM CURRENT_DATE)
    AND gs.is_active = true;

  -- If check-in recorded, check for missing check-out
  IF NEW.event_type = 'check_in' THEN
    -- Check if there's a missing check-out from previous day
    SELECT (CURRENT_DATE::DATE || ' ' || v_schedule_record.end_time)::TIMESTAMP
    INTO v_missing_check_out
    FROM attendance_events ae
    WHERE ae.worker_id = NEW.worker_id
      AND DATE(ae.event_time) = CURRENT_DATE - INTERVAL '1 day'
      AND ae.event_type = 'check_in'
      AND NOT EXISTS (
        SELECT 1 FROM attendance_events ae2
        WHERE ae2.worker_id = ae.worker_id
          AND DATE(ae2.event_time) = CURRENT_DATE - INTERVAL '1 day'
          AND ae2.event_type = 'check_out'
      );

    -- Auto-complete missing check-out
    IF v_missing_check_out IS NOT NULL THEN
      INSERT INTO attendance_events (
        worker_id, event_type, event_time, method, is_automatic, note
      ) VALUES (
        NEW.worker_id, 'check_out', v_missing_check_out, 'auto_complete', true,
        'تم إكمال البصمة تلقائياً - بصمة خروج ناقصة من اليوم السابق'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_complete_punches
AFTER INSERT ON attendance_events
FOR EACH ROW
EXECUTE FUNCTION auto_complete_missing_punches();
```

**الخطوة ب: Trigger لتحديث آخر حضور**
```sql
-- Trigger: Update last attendance
CREATE OR REPLACE FUNCTION update_last_attendance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE workers
  SET last_attendance_date = CURRENT_DATE,
      last_attendance_time = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.worker_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_last_attendance
AFTER INSERT ON attendance_events
FOR EACH ROW
EXECUTE FUNCTION update_last_attendance();
```

**الخطوة ج: Trigger لتسجيل التغييرات**
```sql
-- Trigger: Audit payroll changes
CREATE OR REPLACE FUNCTION audit_payroll_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    table_name, record_id, action, old_values, new_values, changed_by, changed_at
  ) VALUES (
    'payroll_batches', NEW.id, 'UPDATE',
    ROW_TO_JSON(OLD), ROW_TO_JSON(NEW),
    CURRENT_USER, CURRENT_TIMESTAMP
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_payroll_changes
AFTER UPDATE ON payroll_batches
FOR EACH ROW
EXECUTE FUNCTION audit_payroll_changes();
```

#### 4. تطبيق RLS Policies

```sql
-- Enable RLS on sensitive tables
ALTER TABLE attendance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their group's data
CREATE POLICY "users_see_own_group_data"
ON attendance_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workers w
    WHERE w.id = attendance_events.worker_id
    AND w.group_id IN (
      SELECT group_id FROM workers
      WHERE user_id = auth.uid()
    )
  )
);

-- Policy: Admins can see all data
CREATE POLICY "admins_see_all_data"
ON attendance_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'admin'
  )
);

-- Policy: Only admins can modify payroll
CREATE POLICY "only_admins_modify_payroll"
ON payroll_batches FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'admin'
  )
);
```

---

## التحقق من النجاح

بعد تطبيق جميع الـ SQL:

✅ اختبر الـ Functions:
```sql
SELECT * FROM calculate_daily_payroll(1, CURRENT_DATE);
SELECT * FROM calculate_group_payroll(1, CURRENT_DATE);
SELECT * FROM detect_missing_punches(CURRENT_DATE);
```

✅ تحقق من الـ Triggers:
```sql
-- أدرج بصمة اختبار وتحقق من التنبيهات
INSERT INTO attendance_events (worker_id, event_type, method)
VALUES (1, 'check_in', 'manual');
```

✅ تحقق من الـ RLS:
```sql
-- تأكد من أن المستخدمين يرون فقط بيانات مجموعتهم
SELECT * FROM attendance_events;
```

---

## الخطوة التالية

بعد تطبيق SQL بنجاح:
1. ستنتقل إلى **المرحلة 2: Edge Functions للإشعارات**
2. ثم **المرحلة 3: إضافة Recharts للرسوم البيانية**
3. وأخيراً **المرحلة 4: تفعيل مركز مراجعة البصمات**

**ملاحظة مهمة:** تأكد من عمل جميع الـ Functions قبل الانتقال للمرحلة التالية!
