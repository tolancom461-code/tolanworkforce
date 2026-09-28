-- استثناء مجموعة من إلزام تعيين موقع التشغيل قبل إغلاق اليوم التشغيلي.
-- القيمة الافتراضية 0 تحفظ السلوك الحالي لجميع المجموعات الموجودة.
ALTER TABLE `groups`
  ADD COLUMN `is_operational_assignment_exempt` tinyint NOT NULL DEFAULT 0
  AFTER `is_flexible_schedule`;
