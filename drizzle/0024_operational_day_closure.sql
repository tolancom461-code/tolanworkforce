-- Operational day closure workflow
-- Apply manually in TiDB before deploying code that uses these tables.

CREATE TABLE IF NOT EXISTS `operational_days` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_date` date NOT NULL,
  `status` enum('open','closed') NOT NULL DEFAULT 'open',
  `revision` int NOT NULL DEFAULT 0,
  `closed_by` int NULL,
  `closed_at` timestamp NULL DEFAULT NULL,
  `reopened_by` int NULL,
  `reopened_at` timestamp NULL DEFAULT NULL,
  `reopen_reason` varchar(500) NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_operational_days_work_date` (`work_date`),
  KEY `idx_operational_days_status_date` (`status`, `work_date`),
  CONSTRAINT `operational_days_closed_by_fk`
    FOREIGN KEY (`closed_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `operational_days_reopened_by_fk`
    FOREIGN KEY (`reopened_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `operational_day_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_date` date NOT NULL,
  `event_type` enum('closed','reopened','assignment_changed') NOT NULL,
  `revision` int NOT NULL DEFAULT 0,
  `worker_id` int NULL,
  `actor_user_id` int NULL,
  `before_values` json NULL,
  `after_values` json NULL,
  `note` varchar(500) NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_operational_day_events_date_revision` (`work_date`, `revision`),
  KEY `idx_operational_day_events_worker` (`worker_id`),
  KEY `idx_operational_day_events_actor` (`actor_user_id`),
  CONSTRAINT `operational_day_events_worker_fk`
    FOREIGN KEY (`worker_id`) REFERENCES `workers`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `operational_day_events_actor_fk`
    FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
);
