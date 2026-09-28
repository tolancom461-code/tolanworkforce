-- معلومات اليوم التشغيلي النهائية: استدعاء المجموعات، الاستدعاء الطارئ، وأوقات الإغلاق.
-- هذه البيانات معلومات تشغيلية فقط ولا تدخل في احتساب الحضور أو الرواتب.
-- يطبق هذا الملف يدوياً بعد 0025_operational_day_cost_center_scope.sql.

ALTER TABLE `operational_day_events`
  MODIFY COLUMN `event_type` enum(
    'closed',
    'reopened',
    'assignment_changed',
    'group_called',
    'emergency_called',
    'games_closed',
    'restaurants_closed'
  ) NOT NULL;

ALTER TABLE `operational_day_events`
  ADD COLUMN `event_key` varchar(100) NULL AFTER `event_type`,
  ADD COLUMN `group_id` int NULL AFTER `revision`,
  ADD COLUMN `event_at` datetime NULL AFTER `actor_user_id`;

ALTER TABLE `operational_day_events`
  ADD INDEX `idx_operational_day_events_group` (`group_id`),
  ADD INDEX `idx_operational_day_events_event_at` (`event_at`),
  ADD UNIQUE INDEX `uq_operational_day_events_final_record` (`work_date`, `cost_center_id`, `event_key`);

ALTER TABLE `operational_day_events`
  ADD CONSTRAINT `operational_day_events_group_id_fk`
  FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
