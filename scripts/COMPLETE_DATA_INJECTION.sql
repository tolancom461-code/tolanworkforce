-- ============================================
-- Complete Data Injection Script
-- نظام إدارة القوى العاملة - حقن البيانات الكاملة
-- ============================================
-- التاريخ: 2 فبراير 2026
-- البيانات: 106 سجل حضور واقعي للأسبوع الماضي (27-31 يناير)
-- ============================================

-- تنظيف البيانات القديمة (اختياري)
-- DELETE FROM attendance_events;
-- DELETE FROM workers;
-- DELETE FROM groups;
-- DELETE FROM group_schedules;

-- ============================================
-- 1. إدراج المجموعات الأربع
-- ============================================

INSERT INTO groups (name, description, is_active, created_at) VALUES
('الفنيين', 'فريق الفنيين والصيانة', true, NOW()),
('الإداريين', 'فريق الإدارة والموارد البشرية', true, NOW()),
('الأمن', 'فريق الأمن والحماية', true, NOW()),
('الصيانة', 'فريق الصيانة والنظافة', true, NOW());

-- ============================================
-- 2. إدراج جداول المجموعات
-- ============================================

INSERT INTO group_schedules (group_id, day_of_week, start_time, end_time, required_hours, is_active, created_at) VALUES
-- الفنيين: 8:00 AM - 4:00 PM (8 ساعات)
((SELECT id FROM groups WHERE name = 'الفنيين'), 1, '08:00:00', '16:00:00', 8, true, NOW()),
((SELECT id FROM groups WHERE name = 'الفنيين'), 2, '08:00:00', '16:00:00', 8, true, NOW()),
((SELECT id FROM groups WHERE name = 'الفنيين'), 3, '08:00:00', '16:00:00', 8, true, NOW()),
((SELECT id FROM groups WHERE name = 'الفنيين'), 4, '08:00:00', '16:00:00', 8, true, NOW()),
((SELECT id FROM groups WHERE name = 'الفنيين'), 5, '08:00:00', '16:00:00', 8, true, NOW()),

-- الإداريين: 9:00 AM - 5:00 PM (8 ساعات)
((SELECT id FROM groups WHERE name = 'الإداريين'), 1, '09:00:00', '17:00:00', 8, true, NOW()),
((SELECT id FROM groups WHERE name = 'الإداريين'), 2, '09:00:00', '17:00:00', 8, true, NOW()),
((SELECT id FROM groups WHERE name = 'الإداريين'), 3, '09:00:00', '17:00:00', 8, true, NOW()),
((SELECT id FROM groups WHERE name = 'الإداريين'), 4, '09:00:00', '17:00:00', 8, true, NOW()),

-- الأمن: 6:00 AM - 2:00 PM (8 ساعات)
((SELECT id FROM groups WHERE name = 'الأمن'), 1, '06:00:00', '14:00:00', 8, true, NOW()),
((SELECT id FROM groups WHERE name = 'الأمن'), 2, '06:00:00', '14:00:00', 8, true, NOW()),
((SELECT id FROM groups WHERE name = 'الأمن'), 3, '06:00:00', '14:00:00', 8, true, NOW()),
((SELECT id FROM groups WHERE name = 'الأمن'), 4, '06:00:00', '14:00:00', 8, true, NOW()),

-- الصيانة: 7:00 AM - 3:00 PM (8 ساعات)
((SELECT id FROM groups WHERE name = 'الصيانة'), 1, '07:00:00', '15:00:00', 8, true, NOW()),
((SELECT id FROM groups WHERE name = 'الصيانة'), 2, '07:00:00', '15:00:00', 8, true, NOW()),
((SELECT id FROM groups WHERE name = 'الصيانة'), 3, '07:00:00', '15:00:00', 8, true, NOW()),
((SELECT id FROM groups WHERE name = 'الصيانة'), 4, '07:00:00', '15:00:00', 8, true, NOW());

-- ============================================
-- 3. إدراج الموظفين
-- ============================================

-- الفنيين (5 موظفين)
INSERT INTO workers (group_id, name, code, base_salary, is_active, created_at) VALUES
((SELECT id FROM groups WHERE name = 'الفنيين'), 'أحمد محمد علي', 'FN-001', 3000, true, NOW()),
((SELECT id FROM groups WHERE name = 'الفنيين'), 'محمود حسن سالم', 'FN-002', 3200, true, NOW()),
((SELECT id FROM groups WHERE name = 'الفنيين'), 'علي إبراهيم خالد', 'FN-003', 3100, true, NOW()),
((SELECT id FROM groups WHERE name = 'الفنيين'), 'سارة عبدالله محمد', 'FN-004', 3000, true, NOW()),
((SELECT id FROM groups WHERE name = 'الفنيين'), 'فاطمة أحمد علي', 'FN-005', 2900, true, NOW()),

-- الإداريين (3 موظفين)
((SELECT id FROM groups WHERE name = 'الإداريين'), 'نور الدين محمود', 'AD-001', 4000, true, NOW()),
((SELECT id FROM groups WHERE name = 'الإداريين'), 'ليلى حسن محمد', 'AD-002', 3800, true, NOW()),
((SELECT id FROM groups WHERE name = 'الإداريين'), 'خالد عبدالرحمن', 'AD-003', 3900, true, NOW()),

-- الأمن (2 موظف)
((SELECT id FROM groups WHERE name = 'الأمن'), 'عمر سالم حسن', 'SEC-001', 2500, true, NOW()),
((SELECT id FROM groups WHERE name = 'الأمن'), 'يوسف محمد علي', 'SEC-002', 2600, true, NOW()),

-- الصيانة (2 موظف)
((SELECT id FROM groups WHERE name = 'الصيانة'), 'حسام الدين أحمد', 'MAINT-001', 2700, true, NOW()),
((SELECT id FROM groups WHERE name = 'الصيانة'), 'محمد عبدالعزيز', 'MAINT-002', 2800, true, NOW());

-- ============================================
-- 4. إدراج أحداث الحضور والانصراف (106 سجل)
-- ============================================

-- الفنيين: 5 موظفين × 5 أيام × 2 حدث = 50 حدث
-- يوم الاثنين 27 يناير
INSERT INTO attendance_events (worker_id, event_type, event_time, method, is_automatic, needs_review, created_at) VALUES
((SELECT id FROM workers WHERE code = 'FN-001'), 'check_in', '2026-01-27 08:05:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-001'), 'check_out', '2026-01-27 16:10:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-002'), 'check_in', '2026-01-27 08:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-002'), 'check_out', '2026-01-27 16:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-003'), 'check_in', '2026-01-27 08:15:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-003'), 'check_out', '2026-01-27 16:20:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-004'), 'check_in', '2026-01-27 08:10:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-004'), 'check_out', '2026-01-27 16:05:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-005'), 'check_in', '2026-01-27 08:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-005'), 'check_out', '2026-01-27 16:00:00', 'qr', false, false, NOW()),

-- يوم الثلاثاء 28 يناير
((SELECT id FROM workers WHERE code = 'FN-001'), 'check_in', '2026-01-28 08:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-001'), 'check_out', '2026-01-28 16:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-002'), 'check_in', '2026-01-28 08:05:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-002'), 'check_out', '2026-01-28 16:05:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-003'), 'check_in', '2026-01-28 08:10:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-003'), 'check_out', '2026-01-28 16:10:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-004'), 'check_in', '2026-01-28 08:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-004'), 'check_out', '2026-01-28 16:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-005'), 'check_in', '2026-01-28 08:15:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-005'), 'check_out', '2026-01-28 16:15:00', 'qr', false, false, NOW()),

-- يوم الأربعاء 29 يناير
((SELECT id FROM workers WHERE code = 'FN-001'), 'check_in', '2026-01-29 08:10:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-001'), 'check_out', '2026-01-29 16:10:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-002'), 'check_in', '2026-01-29 08:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-002'), 'check_out', '2026-01-29 16:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-003'), 'check_in', '2026-01-29 08:05:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-003'), 'check_out', '2026-01-29 16:05:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-004'), 'check_in', '2026-01-29 08:15:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-004'), 'check_out', '2026-01-29 16:15:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-005'), 'check_in', '2026-01-29 08:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-005'), 'check_out', '2026-01-29 16:00:00', 'qr', false, false, NOW()),

-- يوم الخميس 30 يناير
((SELECT id FROM workers WHERE code = 'FN-001'), 'check_in', '2026-01-30 08:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-001'), 'check_out', '2026-01-30 16:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-002'), 'check_in', '2026-01-30 08:10:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-002'), 'check_out', '2026-01-30 16:10:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-003'), 'check_in', '2026-01-30 08:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-003'), 'check_out', '2026-01-30 16:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-004'), 'check_in', '2026-01-30 08:05:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-004'), 'check_out', '2026-01-30 16:05:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-005'), 'check_in', '2026-01-30 08:10:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-005'), 'check_out', '2026-01-30 16:10:00', 'qr', false, false, NOW()),

-- يوم الجمعة 31 يناير
((SELECT id FROM workers WHERE code = 'FN-001'), 'check_in', '2026-01-31 08:05:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-001'), 'check_out', '2026-01-31 16:05:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-002'), 'check_in', '2026-01-31 08:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-002'), 'check_out', '2026-01-31 16:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-003'), 'check_in', '2026-01-31 08:10:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-003'), 'check_out', '2026-01-31 16:10:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-004'), 'check_in', '2026-01-31 08:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-004'), 'check_out', '2026-01-31 16:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-005'), 'check_in', '2026-01-31 08:15:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'FN-005'), 'check_out', '2026-01-31 16:15:00', 'qr', false, false, NOW());

-- الإداريين: 3 موظفين × 4 أيام × 2 حدث = 24 حدث
-- يوم الاثنين 27 يناير
INSERT INTO attendance_events (worker_id, event_type, event_time, method, is_automatic, needs_review, created_at) VALUES
((SELECT id FROM workers WHERE code = 'AD-001'), 'check_in', '2026-01-27 09:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'AD-001'), 'check_out', '2026-01-27 17:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'AD-002'), 'check_in', '2026-01-27 09:05:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'AD-002'), 'check_out', '2026-01-27 17:05:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'AD-003'), 'check_in', '2026-01-27 09:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'AD-003'), 'check_out', '2026-01-27 17:00:00', 'qr', false, false, NOW()),

-- يوم الثلاثاء 28 يناير
((SELECT id FROM workers WHERE code = 'AD-001'), 'check_in', '2026-01-28 09:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'AD-001'), 'check_out', '2026-01-28 17:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'AD-002'), 'check_in', '2026-01-28 09:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'AD-002'), 'check_out', '2026-01-28 17:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'AD-003'), 'check_in', '2026-01-28 09:05:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'AD-003'), 'check_out', '2026-01-28 17:05:00', 'qr', false, false, NOW()),

-- يوم الأربعاء 29 يناير
((SELECT id FROM workers WHERE code = 'AD-001'), 'check_in', '2026-01-29 09:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'AD-001'), 'check_out', '2026-01-29 17:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'AD-002'), 'check_in', '2026-01-29 09:05:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'AD-002'), 'check_out', '2026-01-29 17:05:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'AD-003'), 'check_in', '2026-01-29 09:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'AD-003'), 'check_out', '2026-01-29 17:00:00', 'qr', false, false, NOW()),

-- يوم الخميس 30 يناير
((SELECT id FROM workers WHERE code = 'AD-001'), 'check_in', '2026-01-30 09:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'AD-001'), 'check_out', '2026-01-30 17:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'AD-002'), 'check_in', '2026-01-30 09:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'AD-002'), 'check_out', '2026-01-30 17:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'AD-003'), 'check_in', '2026-01-30 09:05:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'AD-003'), 'check_out', '2026-01-30 17:05:00', 'qr', false, false, NOW());

-- الأمن: 2 موظف × 4 أيام × 2 حدث = 16 حدث
INSERT INTO attendance_events (worker_id, event_type, event_time, method, is_automatic, needs_review, created_at) VALUES
-- يوم الاثنين 27 يناير
((SELECT id FROM workers WHERE code = 'SEC-001'), 'check_in', '2026-01-27 06:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'SEC-001'), 'check_out', '2026-01-27 14:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'SEC-002'), 'check_in', '2026-01-27 06:05:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'SEC-002'), 'check_out', '2026-01-27 14:05:00', 'qr', false, false, NOW()),

-- يوم الثلاثاء 28 يناير
((SELECT id FROM workers WHERE code = 'SEC-001'), 'check_in', '2026-01-28 06:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'SEC-001'), 'check_out', '2026-01-28 14:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'SEC-002'), 'check_in', '2026-01-28 06:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'SEC-002'), 'check_out', '2026-01-28 14:00:00', 'qr', false, false, NOW()),

-- يوم الأربعاء 29 يناير
((SELECT id FROM workers WHERE code = 'SEC-001'), 'check_in', '2026-01-29 06:05:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'SEC-001'), 'check_out', '2026-01-29 14:05:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'SEC-002'), 'check_in', '2026-01-29 06:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'SEC-002'), 'check_out', '2026-01-29 14:00:00', 'qr', false, false, NOW()),

-- يوم الخميس 30 يناير
((SELECT id FROM workers WHERE code = 'SEC-001'), 'check_in', '2026-01-30 06:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'SEC-001'), 'check_out', '2026-01-30 14:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'SEC-002'), 'check_in', '2026-01-30 06:05:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'SEC-002'), 'check_out', '2026-01-30 14:05:00', 'qr', false, false, NOW());

-- الصيانة: 2 موظف × 4 أيام × 2 حدث = 16 حدث
INSERT INTO attendance_events (worker_id, event_type, event_time, method, is_automatic, needs_review, created_at) VALUES
-- يوم الاثنين 27 يناير
((SELECT id FROM workers WHERE code = 'MAINT-001'), 'check_in', '2026-01-27 07:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'MAINT-001'), 'check_out', '2026-01-27 15:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'MAINT-002'), 'check_in', '2026-01-27 07:05:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'MAINT-002'), 'check_out', '2026-01-27 15:05:00', 'qr', false, false, NOW()),

-- يوم الثلاثاء 28 يناير
((SELECT id FROM workers WHERE code = 'MAINT-001'), 'check_in', '2026-01-28 07:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'MAINT-001'), 'check_out', '2026-01-28 15:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'MAINT-002'), 'check_in', '2026-01-28 07:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'MAINT-002'), 'check_out', '2026-01-28 15:00:00', 'qr', false, false, NOW()),

-- يوم الأربعاء 29 يناير
((SELECT id FROM workers WHERE code = 'MAINT-001'), 'check_in', '2026-01-29 07:05:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'MAINT-001'), 'check_out', '2026-01-29 15:05:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'MAINT-002'), 'check_in', '2026-01-29 07:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'MAINT-002'), 'check_out', '2026-01-29 15:00:00', 'qr', false, false, NOW()),

-- يوم الخميس 30 يناير
((SELECT id FROM workers WHERE code = 'MAINT-001'), 'check_in', '2026-01-30 07:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'MAINT-001'), 'check_out', '2026-01-30 15:00:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'MAINT-002'), 'check_in', '2026-01-30 07:05:00', 'qr', false, false, NOW()),
((SELECT id FROM workers WHERE code = 'MAINT-002'), 'check_out', '2026-01-30 15:05:00', 'qr', false, false, NOW());

-- ============================================
-- 5. التحقق من البيانات المُدرجة
-- ============================================

SELECT 'Groups Count' as metric, COUNT(*) as value FROM groups
UNION ALL
SELECT 'Workers Count', COUNT(*) FROM workers
UNION ALL
SELECT 'Group Schedules Count', COUNT(*) FROM group_schedules
UNION ALL
SELECT 'Attendance Events Count', COUNT(*) FROM attendance_events;

-- ============================================
-- 6. ملخص البيانات المُدرجة
-- ============================================

-- عرض الموظفين حسب المجموعة
SELECT g.name as 'Group', COUNT(w.id) as 'Worker Count', SUM(w.base_salary) as 'Total Salary'
FROM groups g
LEFT JOIN workers w ON g.id = w.group_id
GROUP BY g.id, g.name;

-- عرض أحداث الحضور حسب اليوم
SELECT DATE(event_time) as 'Date', COUNT(*) as 'Event Count'
FROM attendance_events
GROUP BY DATE(event_time)
ORDER BY DATE(event_time);

-- ============================================
-- ملاحظات مهمة:
-- ============================================
-- 1. تم إدراج 106 سجل حضور واقعي
-- 2. البيانات تغطي الأسبوع الماضي (27-31 يناير)
-- 3. جميع الموظفين حاضرين بانتظام
-- 4. الأوقات واقعية وتتبع جداول المجموعات
-- 5. جميع الأحداث بدون علامات تلقائية (is_automatic = false)
-- ============================================
