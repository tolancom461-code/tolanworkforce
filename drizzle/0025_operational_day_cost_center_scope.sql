-- Scope operational-day closure by (work_date + cost_center_id).
-- Apply manually and sequentially on the existing database.
-- Existing legacy rows with cost_center_id = NULL are intentionally preserved and ignored by the new scoped workflow.

ALTER TABLE `operational_days`
  ADD COLUMN `cost_center_id` int NULL AFTER `work_date`;

ALTER TABLE `operational_days`
  DROP INDEX `uq_operational_days_work_date`;

ALTER TABLE `operational_days`
  ADD UNIQUE INDEX `uq_operational_days_date_cost_center` (`work_date`, `cost_center_id`);

ALTER TABLE `operational_days`
  ADD INDEX `idx_operational_days_cost_center` (`cost_center_id`);

ALTER TABLE `operational_days`
  ADD INDEX `idx_operational_days_status_date_cost_center` (`status`, `work_date`, `cost_center_id`);

ALTER TABLE `operational_days`
  ADD CONSTRAINT `operational_days_cost_center_id_fk`
  FOREIGN KEY (`cost_center_id`) REFERENCES `cost_centers`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `operational_day_events`
  ADD COLUMN `cost_center_id` int NULL AFTER `work_date`;

ALTER TABLE `operational_day_events`
  ADD INDEX `idx_operational_day_events_cost_center` (`cost_center_id`);

ALTER TABLE `operational_day_events`
  ADD INDEX `idx_operational_day_events_date_cost_center_revision` (`work_date`, `cost_center_id`, `revision`);

ALTER TABLE `operational_day_events`
  ADD CONSTRAINT `operational_day_events_cost_center_id_fk`
  FOREIGN KEY (`cost_center_id`) REFERENCES `cost_centers`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
