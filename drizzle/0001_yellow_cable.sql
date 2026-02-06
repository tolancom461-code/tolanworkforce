DROP TABLE `group_schedules`;--> statement-breakpoint
DROP TABLE `group_shifts`;--> statement-breakpoint
ALTER TABLE `groups` DROP COLUMN `work_minutes`;--> statement-breakpoint
ALTER TABLE `groups` DROP COLUMN `minute_cost`;--> statement-breakpoint
ALTER TABLE `groups` DROP COLUMN `late_penalty_rate`;--> statement-breakpoint
ALTER TABLE `groups` DROP COLUMN `early_leave_penalty_rate`;--> statement-breakpoint
ALTER TABLE `groups` DROP COLUMN `shift_start_time`;--> statement-breakpoint
ALTER TABLE `groups` DROP COLUMN `shift_end_time`;