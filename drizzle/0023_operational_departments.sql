-- Operational structure: flexible departments + linking sites to departments and cost centers.
-- This does not change payroll tables or payroll calculation logic.

CREATE TABLE `operational_departments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_operational_departments_name` (`name`)
);

ALTER TABLE `restaurants`
  ADD COLUMN `operational_department_id` int NULL AFTER `cost_center_id`,
  ADD INDEX `idx_restaurants_operational_department` (`operational_department_id`),
  ADD CONSTRAINT `restaurants_operational_department_id_fk`
    FOREIGN KEY (`operational_department_id`) REFERENCES `operational_departments`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
