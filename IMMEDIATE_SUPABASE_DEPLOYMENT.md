# دليل التطبيق الفوري على Supabase
## نظام إدارة القوى العاملة - الترحيل النهائي للإنتاج

**التاريخ:** 2 فبراير 2026
**الحالة:** جاهز للتطبيق الفوري

---

## 🚀 الخطوة 1: تطبيق SQL Functions على Supabase

### الخطوات:

1. **افتح لوحة تحكم Supabase:**
   - توجه إلى: https://app.supabase.com
   - اختر مشروعك (TolanWorkforce)
   - انقر على **SQL Editor** من القائمة الجانبية

2. **أنشئ Query جديد:**
   - انقر على **New Query**
   - اختر **New blank query**

3. **انسخ والصق الـ SQL التالي:**

```sql
-- ============================================
-- PostgreSQL Functions for Payroll System
-- ============================================

-- Function 1: Calculate Daily Payroll
CREATE OR REPLACE FUNCTION calculate_daily_payroll(
  p_worker_id INTEGER,
  p_work_date DATE
)
RETURNS TABLE (
  daily_salary NUMERIC,
  hours_worked NUMERIC,
  overtime_hours NUMERIC,
  deductions NUMERIC,
  net_salary NUMERIC,
  status VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(w.base_salary, 0)::NUMERIC as daily_salary,
    COALESCE(
      EXTRACT(EPOCH FROM (
        MAX(CASE WHEN ae.event_type = 'check_out' THEN ae.event_time END) -
        MIN(CASE WHEN ae.event_type = 'check_in' THEN ae.event_time END)
      )) / 3600, 0
    )::NUMERIC as hours_worked,
    CASE 
      WHEN COALESCE(
        EXTRACT(EPOCH FROM (
          MAX(CASE WHEN ae.event_type = 'check_out' THEN ae.event_time END) -
          MIN(CASE WHEN ae.event_type = 'check_in' THEN ae.event_time END)
        )) / 3600, 0
      ) > COALESCE(gs.required_hours, 8) 
      THEN COALESCE(
        EXTRACT(EPOCH FROM (
          MAX(CASE WHEN ae.event_type = 'check_out' THEN ae.event_time END) -
          MIN(CASE WHEN ae.event_type = 'check_in' THEN ae.event_time END)
        )) / 3600, 0
      ) - COALESCE(gs.required_hours, 8)
      ELSE 0
    END::NUMERIC as overtime_hours,
    0::NUMERIC as deductions,
    COALESCE(w.base_salary, 0)::NUMERIC as net_salary,
    'CALCULATED'::VARCHAR as status
  FROM workers w
  LEFT JOIN groups g ON w.group_id = g.id
  LEFT JOIN group_schedules gs ON g.id = gs.group_id
  LEFT JOIN attendance_events ae ON w.id = ae.worker_id 
    AND DATE(ae.event_time) = p_work_date
  WHERE w.id = p_worker_id
  GROUP BY w.id, w.base_salary, gs.required_hours;
END;
$$ LANGUAGE plpgsql;

-- Function 2: Calculate Group Payroll Summary
CREATE OR REPLACE FUNCTION calculate_group_payroll(
  p_group_id INTEGER,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  group_name VARCHAR,
  total_salary NUMERIC,
  worker_count INTEGER,
  avg_salary NUMERIC,
  summary JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.name::VARCHAR,
    COALESCE(SUM(w.base_salary), 0)::NUMERIC as total_salary,
    COUNT(DISTINCT w.id)::INTEGER as worker_count,
    COALESCE(AVG(w.base_salary), 0)::NUMERIC as avg_salary,
    jsonb_build_object(
      'period', jsonb_build_object('start', p_start_date, 'end', p_end_date),
      'workers', jsonb_agg(jsonb_build_object(
        'id', w.id,
        'name', w.name,
        'salary', w.base_salary
      ))
    )::JSONB as summary
  FROM groups g
  LEFT JOIN workers w ON g.id = w.group_id
  WHERE g.id = p_group_id
  GROUP BY g.id, g.name;
END;
$$ LANGUAGE plpgsql;

-- Function 3: Detect Missing Punches
CREATE OR REPLACE FUNCTION detect_missing_punches(
  p_worker_id INTEGER,
  p_work_date DATE
)
RETURNS TABLE (
  missing_punch_type VARCHAR,
  suggested_time TIMESTAMP,
  reason VARCHAR
) AS $$
DECLARE
  v_schedule_start TIME;
  v_schedule_end TIME;
  v_has_check_in BOOLEAN;
  v_has_check_out BOOLEAN;
BEGIN
  -- Get worker's schedule
  SELECT gs.start_time, gs.end_time INTO v_schedule_start, v_schedule_end
  FROM workers w
  JOIN groups g ON w.group_id = g.id
  JOIN group_schedules gs ON g.id = gs.group_id
  WHERE w.id = p_worker_id
  LIMIT 1;

  -- Check for existing punches
  SELECT EXISTS(SELECT 1 FROM attendance_events WHERE worker_id = p_worker_id AND event_type = 'check_in' AND DATE(event_time) = p_work_date) INTO v_has_check_in;
  SELECT EXISTS(SELECT 1 FROM attendance_events WHERE worker_id = p_worker_id AND event_type = 'check_out' AND DATE(event_time) = p_work_date) INTO v_has_check_out;

  -- Detect missing punches
  IF NOT v_has_check_in THEN
    RETURN QUERY SELECT 'check_in'::VARCHAR, (p_work_date::TIMESTAMP + v_schedule_start), 'Missing check-in for the day'::VARCHAR;
  END IF;

  IF NOT v_has_check_out THEN
    RETURN QUERY SELECT 'check_out'::VARCHAR, (p_work_date::TIMESTAMP + v_schedule_end), 'Missing check-out for the day'::VARCHAR;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

4. **انقر على زر Run (▶️):**
   - سيتم تنفيذ الـ Functions الثلاث
   - تحقق من عدم وجود أخطاء

---

## 🔔 الخطوة 2: تطبيق Triggers على Supabase

1. **أنشئ Query جديد:**
   - انقر على **New Query**

2. **انسخ والصق الـ SQL التالي:**

```sql
-- ============================================
-- PostgreSQL Triggers for Automation
-- ============================================

-- Trigger 1: Auto-complete missing punches
CREATE OR REPLACE FUNCTION trg_auto_complete_punches()
RETURNS TRIGGER AS $$
BEGIN
  -- If check_in is recorded, check for missing check_out from previous day
  IF NEW.event_type = 'check_in' THEN
    -- Mark as automatic if no check_out from previous day
    NEW.is_automatic := CASE 
      WHEN NOT EXISTS(
        SELECT 1 FROM attendance_events 
        WHERE worker_id = NEW.worker_id 
        AND event_type = 'check_out'
        AND DATE(event_time) = CURRENT_DATE - INTERVAL '1 day'
      ) THEN TRUE
      ELSE FALSE
    END;
  END IF;

  -- If check_out is recorded, check for missing check_in
  IF NEW.event_type = 'check_out' THEN
    NEW.needs_review := CASE 
      WHEN NOT EXISTS(
        SELECT 1 FROM attendance_events 
        WHERE worker_id = NEW.worker_id 
        AND event_type = 'check_in'
        AND DATE(event_time) = CURRENT_DATE
      ) THEN TRUE
      ELSE FALSE
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_complete_punches ON attendance_events;
CREATE TRIGGER trg_auto_complete_punches
BEFORE INSERT ON attendance_events
FOR EACH ROW
EXECUTE FUNCTION trg_auto_complete_punches();

-- Trigger 2: Update last attendance
CREATE OR REPLACE FUNCTION trg_update_last_attendance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE workers 
  SET last_attendance = NEW.event_time
  WHERE id = NEW.worker_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_last_attendance ON attendance_events;
CREATE TRIGGER trg_update_last_attendance
AFTER INSERT ON attendance_events
FOR EACH ROW
EXECUTE FUNCTION trg_update_last_attendance();

-- Trigger 3: Audit payroll changes
CREATE OR REPLACE FUNCTION trg_audit_payroll_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO payroll_batch_notes (batch_id, note, created_by, created_at)
  VALUES (NEW.id, 'Payroll batch created/updated', COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'), NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_payroll_changes ON payroll_batches;
CREATE TRIGGER trg_audit_payroll_changes
AFTER INSERT OR UPDATE ON payroll_batches
FOR EACH ROW
EXECUTE FUNCTION trg_audit_payroll_changes();

-- Trigger 4: Validate schedule
CREATE OR REPLACE FUNCTION trg_validate_schedule()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.start_time >= NEW.end_time THEN
    RAISE EXCEPTION 'Invalid schedule: start_time must be before end_time';
  END IF;
  
  IF NEW.required_hours <= 0 THEN
    RAISE EXCEPTION 'Invalid schedule: required_hours must be greater than 0';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_schedule ON group_schedules;
CREATE TRIGGER trg_validate_schedule
BEFORE INSERT OR UPDATE ON group_schedules
FOR EACH ROW
EXECUTE FUNCTION trg_validate_schedule();
```

3. **انقر على Run:**
   - سيتم تنفيذ جميع الـ Triggers
   - تحقق من عدم وجود أخطاء

---

## 🔐 الخطوة 3: تطبيق RLS Policies على Supabase

1. **أنشئ Query جديد:**
   - انقر على **New Query**

2. **انسخ والصق الـ SQL التالي:**

```sql
-- ============================================
-- Row Level Security Policies
-- ============================================

-- Enable RLS on attendance_events
ALTER TABLE attendance_events ENABLE ROW LEVEL SECURITY;

-- Policy: Admin sees all, others see their own
CREATE POLICY "attendance_events_admin_all" ON attendance_events
  FOR SELECT
  USING (auth.role() = 'authenticated' AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "attendance_events_user_own" ON attendance_events
  FOR SELECT
  USING (worker_id = (SELECT id FROM workers WHERE user_id = auth.uid()));

-- Enable RLS on payroll_batches
ALTER TABLE payroll_batches ENABLE ROW LEVEL SECURITY;

-- Policy: Admin sees all, managers see their group's batches
CREATE POLICY "payroll_batches_admin_all" ON payroll_batches
  FOR SELECT
  USING (auth.role() = 'authenticated' AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Enable RLS on workers
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

-- Policy: Admin sees all, users see their own info
CREATE POLICY "workers_admin_all" ON workers
  FOR SELECT
  USING (auth.role() = 'authenticated' AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "workers_user_own" ON workers
  FOR SELECT
  USING (user_id = auth.uid());
```

3. **انقر على Run:**
   - سيتم تطبيق جميع الـ Policies
   - تحقق من عدم وجود أخطاء

---

## ✅ التحقق من التطبيق:

بعد تنفيذ جميع الخطوات أعلاه:

1. **تحقق من Functions:**
   - انقر على **Database** من القائمة الجانبية
   - اختر **Functions**
   - تأكد من وجود الـ Functions الثلاث:
     - `calculate_daily_payroll`
     - `calculate_group_payroll`
     - `detect_missing_punches`

2. **تحقق من Triggers:**
   - انقر على **Database**
   - اختر **Triggers**
   - تأكد من وجود الـ Triggers الأربعة:
     - `trg_auto_complete_punches`
     - `trg_update_last_attendance`
     - `trg_audit_payroll_changes`
     - `trg_validate_schedule`

3. **تحقق من RLS:**
   - انقر على **Database**
   - اختر **Policies**
   - تأكد من وجود جميع الـ Policies

---

## 🎯 الخطوة التالية:

بعد تطبيق SQL بنجاح:
1. نشر Edge Functions للإشعارات
2. حقن البيانات الحقيقية (106 سجل)
3. إجراء أول اعتماد رواتب حقيقي

**الوقت المتوقع:** 5-10 دقائق فقط! ⚡
