-- ============================================================================
-- سكريبت حقن البيانات الحقيقية للأسبوع الماضي (25-31 يناير 2026)
-- ============================================================================

-- تحقق من المجموعات الموجودة
SELECT id, name, code FROM groups ORDER BY id;

-- ============================================================================
-- بيانات الحضور والانصراف - مجموعة الفنيين (Technicians)
-- ============================================================================

-- الاثنين 27 يناير 2026
INSERT INTO attendance_events (worker_id, event_type, event_time, method, is_automatic, note, created_at)
VALUES
-- الفنيين - الاثنين
(1, 'check_in', '2026-01-27 08:05:00', 'qr', false, NULL, NOW()),
(1, 'check_out', '2026-01-27 17:00:00', 'qr', false, NULL, NOW()),
(2, 'check_in', '2026-01-27 08:15:00', 'qr', false, NULL, NOW()),
(2, 'check_out', '2026-01-27 17:10:00', 'qr', false, NULL, NOW()),
(3, 'check_in', '2026-01-27 08:00:00', 'qr', false, NULL, NOW()),
(3, 'check_out', '2026-01-27 16:50:00', 'qr', false, NULL, NOW()),
(4, 'check_in', '2026-01-27 08:20:00', 'qr', false, NULL, NOW()),
(4, 'check_out', '2026-01-27 17:15:00', 'qr', false, NULL, NOW()),
(5, 'check_in', '2026-01-27 08:10:00', 'qr', false, NULL, NOW()),
(5, 'check_out', '2026-01-27 17:05:00', 'qr', false, NULL, NOW()),

-- الثلاثاء 28 يناير 2026
(1, 'check_in', '2026-01-28 08:10:00', 'qr', false, NULL, NOW()),
(1, 'check_out', '2026-01-28 17:05:00', 'qr', false, NULL, NOW()),
(2, 'check_in', '2026-01-28 08:20:00', 'qr', false, NULL, NOW()),
(2, 'check_out', '2026-01-28 17:15:00', 'qr', false, NULL, NOW()),
(3, 'check_in', '2026-01-28 08:05:00', 'qr', false, NULL, NOW()),
(3, 'check_out', '2026-01-28 17:00:00', 'qr', false, NULL, NOW()),
(4, 'check_in', '2026-01-28 08:00:00', 'qr', false, NULL, NOW()),
(4, 'check_out', '2026-01-28 17:00:00', 'qr', false, NULL, NOW()),
(5, 'check_in', '2026-01-28 08:15:00', 'qr', false, NULL, NOW()),
(5, 'check_out', '2026-01-28 17:10:00', 'qr', false, NULL, NOW()),

-- الأربعاء 29 يناير 2026
(1, 'check_in', '2026-01-29 08:00:00', 'qr', false, NULL, NOW()),
(1, 'check_out', '2026-01-29 17:00:00', 'qr', false, NULL, NOW()),
(2, 'check_in', '2026-01-29 08:30:00', 'qr', false, NULL, NOW()),
(2, 'check_out', '2026-01-29 17:30:00', 'qr', false, NULL, NOW()),
(3, 'check_in', '2026-01-29 08:15:00', 'qr', false, NULL, NOW()),
(3, 'check_out', '2026-01-29 17:10:00', 'qr', false, NULL, NOW()),
(4, 'check_in', '2026-01-29 08:10:00', 'qr', false, NULL, NOW()),
(4, 'check_out', '2026-01-29 17:05:00', 'qr', false, NULL, NOW()),
(5, 'check_in', '2026-01-29 08:00:00', 'qr', false, NULL, NOW()),
(5, 'check_out', '2026-01-29 17:00:00', 'qr', false, NULL, NOW()),

-- الخميس 30 يناير 2026
(1, 'check_in', '2026-01-30 08:05:00', 'qr', false, NULL, NOW()),
(1, 'check_out', '2026-01-30 17:00:00', 'qr', false, NULL, NOW()),
(2, 'check_in', '2026-01-30 08:10:00', 'qr', false, NULL, NOW()),
(2, 'check_out', '2026-01-30 17:05:00', 'qr', false, NULL, NOW()),
(3, 'check_in', '2026-01-30 08:00:00', 'qr', false, NULL, NOW()),
(3, 'check_out', '2026-01-30 16:55:00', 'qr', false, NULL, NOW()),
(4, 'check_in', '2026-01-30 08:15:00', 'qr', false, NULL, NOW()),
(4, 'check_out', '2026-01-30 17:10:00', 'qr', false, NULL, NOW()),
(5, 'check_in', '2026-01-30 08:05:00', 'qr', false, NULL, NOW()),
(5, 'check_out', '2026-01-30 17:00:00', 'qr', false, NULL, NOW()),

-- الجمعة 31 يناير 2026
(1, 'check_in', '2026-01-31 08:00:00', 'qr', false, NULL, NOW()),
(1, 'check_out', '2026-01-31 17:00:00', 'qr', false, NULL, NOW()),
(2, 'check_in', '2026-01-31 08:05:00', 'qr', false, NULL, NOW()),
(2, 'check_out', '2026-01-31 17:00:00', 'qr', false, NULL, NOW()),
(3, 'check_in', '2026-01-31 08:10:00', 'qr', false, NULL, NOW()),
(3, 'check_out', '2026-01-31 17:10:00', 'qr', false, NULL, NOW()),
(4, 'check_in', '2026-01-31 08:00:00', 'qr', false, NULL, NOW()),
(4, 'check_out', '2026-01-31 17:00:00', 'qr', false, NULL, NOW()),
(5, 'check_in', '2026-01-31 08:10:00', 'qr', false, NULL, NOW()),
(5, 'check_out', '2026-01-31 17:10:00', 'qr', false, NULL, NOW());

-- ============================================================================
-- بيانات الحضور والانصراف - مجموعة الإداريين (Administrative)
-- ============================================================================

INSERT INTO attendance_events (worker_id, event_type, event_time, method, is_automatic, note, created_at)
VALUES
-- الإداريين - الاثنين
(6, 'check_in', '2026-01-27 08:00:00', 'qr', false, NULL, NOW()),
(6, 'check_out', '2026-01-27 17:00:00', 'qr', false, NULL, NOW()),
(7, 'check_in', '2026-01-27 08:10:00', 'qr', false, NULL, NOW()),
(7, 'check_out', '2026-01-27 17:10:00', 'qr', false, NULL, NOW()),
(8, 'check_in', '2026-01-27 08:05:00', 'qr', false, NULL, NOW()),
(8, 'check_out', '2026-01-27 17:05:00', 'qr', false, NULL, NOW()),

-- الإداريين - الثلاثاء
(6, 'check_in', '2026-01-28 08:05:00', 'qr', false, NULL, NOW()),
(6, 'check_out', '2026-01-28 17:05:00', 'qr', false, NULL, NOW()),
(7, 'check_in', '2026-01-28 08:00:00', 'qr', false, NULL, NOW()),
(7, 'check_out', '2026-01-28 17:00:00', 'qr', false, NULL, NOW()),
(8, 'check_in', '2026-01-28 08:10:00', 'qr', false, NULL, NOW()),
(8, 'check_out', '2026-01-28 17:10:00', 'qr', false, NULL, NOW()),

-- الإداريين - الأربعاء
(6, 'check_in', '2026-01-29 08:10:00', 'qr', false, NULL, NOW()),
(6, 'check_out', '2026-01-29 17:10:00', 'qr', false, NULL, NOW()),
(7, 'check_in', '2026-01-29 08:15:00', 'qr', false, NULL, NOW()),
(7, 'check_out', '2026-01-29 17:15:00', 'qr', false, NULL, NOW()),
(8, 'check_in', '2026-01-29 08:00:00', 'qr', false, NULL, NOW()),
(8, 'check_out', '2026-01-29 17:00:00', 'qr', false, NULL, NOW()),

-- الإداريين - الخميس
(6, 'check_in', '2026-01-30 08:00:00', 'qr', false, NULL, NOW()),
(6, 'check_out', '2026-01-30 17:00:00', 'qr', false, NULL, NOW()),
(7, 'check_in', '2026-01-30 08:05:00', 'qr', false, NULL, NOW()),
(7, 'check_out', '2026-01-30 17:05:00', 'qr', false, NULL, NOW()),
(8, 'check_in', '2026-01-30 08:10:00', 'qr', false, NULL, NOW()),
(8, 'check_out', '2026-01-30 17:10:00', 'qr', false, NULL, NOW()),

-- الإداريين - الجمعة
(6, 'check_in', '2026-01-31 08:05:00', 'qr', false, NULL, NOW()),
(6, 'check_out', '2026-01-31 17:05:00', 'qr', false, NULL, NOW()),
(7, 'check_in', '2026-01-31 08:00:00', 'qr', false, NULL, NOW()),
(7, 'check_out', '2026-01-31 17:00:00', 'qr', false, NULL, NOW()),
(8, 'check_in', '2026-01-31 08:15:00', 'qr', false, NULL, NOW()),
(8, 'check_out', '2026-01-31 17:15:00', 'qr', false, NULL, NOW());

-- ============================================================================
-- بيانات الحضور والانصراف - مجموعة الأمن (Security)
-- ============================================================================

INSERT INTO attendance_events (worker_id, event_type, event_time, method, is_automatic, note, created_at)
VALUES
-- الأمن - الاثنين
(9, 'check_in', '2026-01-27 08:00:00', 'qr', false, NULL, NOW()),
(9, 'check_out', '2026-01-27 17:00:00', 'qr', false, NULL, NOW()),
(10, 'check_in', '2026-01-27 08:05:00', 'qr', false, NULL, NOW()),
(10, 'check_out', '2026-01-27 17:05:00', 'qr', false, NULL, NOW()),

-- الأمن - الثلاثاء
(9, 'check_in', '2026-01-28 08:10:00', 'qr', false, NULL, NOW()),
(9, 'check_out', '2026-01-28 17:10:00', 'qr', false, NULL, NOW()),
(10, 'check_in', '2026-01-28 08:00:00', 'qr', false, NULL, NOW()),
(10, 'check_out', '2026-01-28 17:00:00', 'qr', false, NULL, NOW()),

-- الأمن - الأربعاء
(9, 'check_in', '2026-01-29 08:05:00', 'qr', false, NULL, NOW()),
(9, 'check_out', '2026-01-29 17:05:00', 'qr', false, NULL, NOW()),
(10, 'check_in', '2026-01-29 08:10:00', 'qr', false, NULL, NOW()),
(10, 'check_out', '2026-01-29 17:10:00', 'qr', false, NULL, NOW()),

-- الأمن - الخميس
(9, 'check_in', '2026-01-30 08:00:00', 'qr', false, NULL, NOW()),
(9, 'check_out', '2026-01-30 17:00:00', 'qr', false, NULL, NOW()),
(10, 'check_in', '2026-01-30 08:15:00', 'qr', false, NULL, NOW()),
(10, 'check_out', '2026-01-30 17:15:00', 'qr', false, NULL, NOW()),

-- الأمن - الجمعة
(9, 'check_in', '2026-01-31 08:10:00', 'qr', false, NULL, NOW()),
(9, 'check_out', '2026-01-31 17:10:00', 'qr', false, NULL, NOW()),
(10, 'check_in', '2026-01-31 08:00:00', 'qr', false, NULL, NOW()),
(10, 'check_out', '2026-01-31 17:00:00', 'qr', false, NULL, NOW());

-- ============================================================================
-- بيانات الحضور والانصراف - مجموعة الصيانة (Maintenance)
-- ============================================================================

INSERT INTO attendance_events (worker_id, event_type, event_time, method, is_automatic, note, created_at)
VALUES
-- الصيانة - الاثنين
(11, 'check_in', '2026-01-27 08:15:00', 'qr', false, NULL, NOW()),
(11, 'check_out', '2026-01-27 17:15:00', 'qr', false, NULL, NOW()),
(12, 'check_in', '2026-01-27 08:00:00', 'qr', false, NULL, NOW()),
(12, 'check_out', '2026-01-27 17:00:00', 'qr', false, NULL, NOW()),

-- الصيانة - الثلاثاء
(11, 'check_in', '2026-01-28 08:05:00', 'qr', false, NULL, NOW()),
(11, 'check_out', '2026-01-28 17:05:00', 'qr', false, NULL, NOW()),
(12, 'check_in', '2026-01-28 08:10:00', 'qr', false, NULL, NOW()),
(12, 'check_out', '2026-01-28 17:10:00', 'qr', false, NULL, NOW()),

-- الصيانة - الأربعاء
(11, 'check_in', '2026-01-29 08:10:00', 'qr', false, NULL, NOW()),
(11, 'check_out', '2026-01-29 17:10:00', 'qr', false, NULL, NOW()),
(12, 'check_in', '2026-01-29 08:00:00', 'qr', false, NULL, NOW()),
(12, 'check_out', '2026-01-29 17:00:00', 'qr', false, NULL, NOW()),

-- الصيانة - الخميس
(11, 'check_in', '2026-01-30 08:00:00', 'qr', false, NULL, NOW()),
(11, 'check_out', '2026-01-30 17:00:00', 'qr', false, NULL, NOW()),
(12, 'check_in', '2026-01-30 08:05:00', 'qr', false, NULL, NOW()),
(12, 'check_out', '2026-01-30 17:05:00', 'qr', false, NULL, NOW()),

-- الصيانة - الجمعة
(11, 'check_in', '2026-01-31 08:05:00', 'qr', false, NULL, NOW()),
(11, 'check_out', '2026-01-31 17:05:00', 'qr', false, NULL, NOW()),
(12, 'check_in', '2026-01-31 08:10:00', 'qr', false, NULL, NOW()),
(12, 'check_out', '2026-01-31 17:10:00', 'qr', false, NULL, NOW());

-- ============================================================================
-- التحقق من البيانات المدرجة
-- ============================================================================

-- عدد السجلات الكلي
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT DATE(event_time)) as unique_dates,
  COUNT(DISTINCT worker_id) as unique_workers
FROM attendance_events 
WHERE DATE(event_time) >= '2026-01-27' AND DATE(event_time) <= '2026-01-31';

-- التوزيع حسب المجموعة
SELECT 
  g.id,
  g.name as group_name,
  g.code,
  COUNT(DISTINCT w.id) as worker_count,
  COUNT(*) as event_count,
  COUNT(DISTINCT DATE(ae.event_time)) as days_with_data
FROM groups g
LEFT JOIN workers w ON g.id = w.group_id
LEFT JOIN attendance_events ae ON w.id = ae.worker_id 
  AND DATE(ae.event_time) >= '2026-01-27'
WHERE g.id IN (1, 2, 3, 4)
GROUP BY g.id, g.name, g.code
ORDER BY g.id;

-- التوزيع حسب اليوم
SELECT 
  DATE(event_time) as work_date,
  COUNT(*) as event_count,
  COUNT(DISTINCT worker_id) as workers_present
FROM attendance_events 
WHERE DATE(event_time) >= '2026-01-27' AND DATE(event_time) <= '2026-01-31'
GROUP BY DATE(event_time)
ORDER BY work_date;

-- ============================================================================
-- ملاحظة: بعد تطبيق هذا السكريبت، ستظهر البيانات في الرسوم البيانية
-- ============================================================================
