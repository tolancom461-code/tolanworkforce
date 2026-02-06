-- ============================================
-- PostgreSQL Function & Trigger for Automatic Finance Calculation
-- يتم تشغيل هذا الـ Trigger تلقائياً عند إضافة check_out
-- ============================================

-- 1. إنشاء Function لحساب المالية اليومية
CREATE OR REPLACE FUNCTION calculate_daily_finance_on_checkout()
RETURNS TRIGGER AS $$
DECLARE
    v_worker_id INT;
    v_work_date DATE;
    v_check_in_time TIMESTAMP;
    v_check_out_time TIMESTAMP;
    v_daily_rate DECIMAL(10,2);
    v_group_id INT;
    v_shift_start_time VARCHAR(10);
    v_shift_end_time VARCHAR(10);
    v_work_minutes INT;
    v_minute_cost DECIMAL(10,4);
    v_late_penalty_rate DECIMAL(5,2);
    v_early_leave_penalty_rate DECIMAL(5,2);
    
    v_shift_start TIMESTAMP;
    v_shift_end TIMESTAMP;
    v_actual_start TIMESTAMP;
    v_actual_end TIMESTAMP;
    
    v_late_minutes INT := 0;
    v_early_leave_minutes INT := 0;
    v_worked_minutes INT := 0;
    v_financial_minutes INT := 0;
    
    v_base_salary DECIMAL(10,2);
    v_late_penalty DECIMAL(10,2) := 0;
    v_early_leave_penalty DECIMAL(10,2) := 0;
    v_net_salary DECIMAL(10,2);
BEGIN
    -- التحقق من أن الحدث هو check_out
    IF NEW.event_type != 'check_out' THEN
        RETURN NEW;
    END IF;
    
    v_worker_id := NEW.worker_id;
    v_work_date := DATE(NEW.event_time);
    v_check_out_time := NEW.event_time;
    
    -- الحصول على وقت check_in لنفس اليوم
    SELECT event_time INTO v_check_in_time
    FROM attendance_events
    WHERE worker_id = v_worker_id
      AND DATE(event_time) = v_work_date
      AND event_type = 'check_in'
    ORDER BY event_time DESC
    LIMIT 1;
    
    -- إذا لم يكن هناك check_in، لا نحسب شيئاً
    IF v_check_in_time IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- الحصول على بيانات العامل والمجموعة
    SELECT w.daily_rate, w.group_id, g.shift_start_time, g.shift_end_time,
           g.work_minutes, g.minute_cost, g.late_penalty_rate, g.early_leave_penalty_rate
    INTO v_daily_rate, v_group_id, v_shift_start_time, v_shift_end_time,
         v_work_minutes, v_minute_cost, v_late_penalty_rate, v_early_leave_penalty_rate
    FROM workers w
    LEFT JOIN `groups` g ON w.group_id = g.id
    WHERE w.id = v_worker_id;
    
    -- إذا لم تكن هناك بيانات كافية، نستخدم القيم الافتراضية
    IF v_daily_rate IS NULL THEN
        v_daily_rate := 0;
    END IF;
    
    IF v_shift_start_time IS NULL OR v_shift_end_time IS NULL THEN
        -- إذا لم تكن هناك أوقات وردية، نحسب الراتب الكامل
        v_base_salary := v_daily_rate;
        v_net_salary := v_base_salary;
    ELSE
        -- بناء أوقات الوردية الكاملة
        v_shift_start := (v_work_date || ' ' || v_shift_start_time)::TIMESTAMP;
        v_shift_end := (v_work_date || ' ' || v_shift_end_time)::TIMESTAMP;
        
        -- إذا كانت نهاية الوردية بعد منتصف الليل
        IF v_shift_end < v_shift_start THEN
            v_shift_end := v_shift_end + INTERVAL '1 day';
        END IF;
        
        -- الأوقات الفعلية (محدودة بأوقات الوردية)
        v_actual_start := GREATEST(v_check_in_time, v_shift_start);
        v_actual_end := LEAST(v_check_out_time, v_shift_end);
        
        -- حساب دقائق العمل الفعلية
        v_worked_minutes := EXTRACT(EPOCH FROM (v_check_out_time - v_check_in_time)) / 60;
        
        -- حساب دقائق العمل المالية (داخل الوردية فقط)
        IF v_actual_end > v_actual_start THEN
            v_financial_minutes := EXTRACT(EPOCH FROM (v_actual_end - v_actual_start)) / 60;
        ELSE
            v_financial_minutes := 0;
        END IF;
        
        -- حساب التأخير
        IF v_check_in_time > v_shift_start THEN
            v_late_minutes := EXTRACT(EPOCH FROM (v_check_in_time - v_shift_start)) / 60;
        END IF;
        
        -- حساب المغادرة المبكرة
        IF v_check_out_time < v_shift_end THEN
            v_early_leave_minutes := EXTRACT(EPOCH FROM (v_shift_end - v_check_out_time)) / 60;
        END IF;
        
        -- حساب الراتب الأساسي
        IF v_minute_cost IS NOT NULL AND v_minute_cost > 0 THEN
            v_base_salary := v_financial_minutes * v_minute_cost;
        ELSE
            v_base_salary := v_daily_rate;
        END IF;
        
        -- حساب غرامة التأخير
        IF v_late_penalty_rate IS NOT NULL AND v_late_penalty_rate > 0 THEN
            v_late_penalty := v_late_minutes * v_minute_cost * v_late_penalty_rate;
        END IF;
        
        -- حساب غرامة المغادرة المبكرة
        IF v_early_leave_penalty_rate IS NOT NULL AND v_early_leave_penalty_rate > 0 THEN
            v_early_leave_penalty := v_early_leave_minutes * v_minute_cost * v_early_leave_penalty_rate;
        END IF;
        
        -- حساب الراتب الصافي
        v_net_salary := v_base_salary - v_late_penalty - v_early_leave_penalty;
    END IF;
    
    -- إدراج أو تحديث السجل في worker_daily_finance
    INSERT INTO worker_daily_finance (
        worker_id, work_date, check_in_time, check_out_time,
        worked_minutes, financial_minutes, late_minutes, early_leave_minutes,
        base_salary, late_penalty, early_leave_penalty, net_salary,
        created_at, updated_at
    ) VALUES (
        v_worker_id, v_work_date, v_check_in_time, v_check_out_time,
        v_worked_minutes, v_financial_minutes, v_late_minutes, v_early_leave_minutes,
        v_base_salary, v_late_penalty, v_early_leave_penalty, v_net_salary,
        NOW(), NOW()
    )
    ON DUPLICATE KEY UPDATE
        check_out_time = v_check_out_time,
        worked_minutes = v_worked_minutes,
        financial_minutes = v_financial_minutes,
        late_minutes = v_late_minutes,
        early_leave_minutes = v_early_leave_minutes,
        base_salary = v_base_salary,
        late_penalty = v_late_penalty,
        early_leave_penalty = v_early_leave_penalty,
        net_salary = v_net_salary,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. إنشاء Trigger
DROP TRIGGER IF EXISTS trigger_calculate_daily_finance ON attendance_events;

CREATE TRIGGER trigger_calculate_daily_finance
AFTER INSERT ON attendance_events
FOR EACH ROW
EXECUTE FUNCTION calculate_daily_finance_on_checkout();

-- 3. تعليق توضيحي
COMMENT ON FUNCTION calculate_daily_finance_on_checkout() IS 'حساب المالية اليومية تلقائياً عند تسجيل الخروج';
COMMENT ON TRIGGER trigger_calculate_daily_finance ON attendance_events IS 'يتم تشغيل هذا الـ Trigger تلقائياً عند إضافة check_out';
