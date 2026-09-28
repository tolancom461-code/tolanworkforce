-- صلاحيات مجموعات التشغيل داخل كل مركز تكلفة.
-- القيمة الافتراضية 1 تحفظ سلوك المستخدمين الحاليين: جميع مجموعات المركز المسموح.
ALTER TABLE `user_cost_centers`
  ADD COLUMN `all_groups` tinyint NOT NULL DEFAULT 1 AFTER `cost_center_id`;

CREATE TABLE `user_operation_groups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `group_id` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_operation_groups_user` (`user_id`),
  KEY `idx_user_operation_groups_group` (`group_id`),
  UNIQUE KEY `uq_user_operation_groups_user_group` (`user_id`, `group_id`),
  CONSTRAINT `user_operation_groups_user_id_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `user_operation_groups_group_id_fk`
    FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
);
