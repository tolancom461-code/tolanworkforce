-- Operations phase 1: operational sites + daily operational group decisions.
-- Existing `restaurants` rows remain valid and default to type `restaurant`.

ALTER TABLE `restaurants`
  ADD COLUMN `cost_center_id` int NULL AFTER `name`,
  ADD COLUMN `site_type` enum('restaurant','site') NOT NULL DEFAULT 'restaurant' AFTER `cost_center_id`,
  ADD INDEX `idx_restaurants_cost_center` (`cost_center_id`),
  ADD CONSTRAINT `restaurants_cost_center_id_cost_centers_id_fk`
    FOREIGN KEY (`cost_center_id`) REFERENCES `cost_centers`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Best-effort migration for the current restaurant list: if a cost center whose name contains
-- "الملقا" exists, attach legacy restaurants to it. Otherwise they stay unlinked until edited.
UPDATE `restaurants`
SET `cost_center_id` = (
  SELECT `id` FROM `cost_centers`
  WHERE `name` LIKE '%الملقا%'
  ORDER BY `id`
  LIMIT 1
)
WHERE `cost_center_id` IS NULL;

ALTER TABLE `daily_work_assignments`
  ADD COLUMN `source_group_id` int NULL AFTER `restaurant_id`,
  ADD COLUMN `operational_group_id` int NULL AFTER `source_group_id`,
  ADD INDEX `idx_dwa_source_group_date` (`source_group_id`, `work_date`),
  ADD INDEX `idx_dwa_operational_group_date` (`operational_group_id`, `work_date`),
  ADD CONSTRAINT `daily_work_assignments_source_group_id_groups_id_fk`
    FOREIGN KEY (`source_group_id`) REFERENCES `groups`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `daily_work_assignments_operational_group_id_groups_id_fk`
    FOREIGN KEY (`operational_group_id`) REFERENCES `groups`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
