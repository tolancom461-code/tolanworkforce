CREATE TABLE `group_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`group_id` int NOT NULL,
	`day_of_week` int NOT NULL,
	`start_time` varchar(10) NOT NULL,
	`end_time` varchar(10) NOT NULL,
	`required_hours` decimal(4,2) NOT NULL,
	`effective_date` date,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `group_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `group_shifts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`group_id` int NOT NULL,
	`shift_name` varchar(100) NOT NULL,
	`start_time` varchar(10) NOT NULL,
	`end_time` varchar(10) NOT NULL,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `group_shifts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `groups` ADD `work_minutes` int;--> statement-breakpoint
ALTER TABLE `groups` ADD `minute_cost` decimal(10,4);--> statement-breakpoint
ALTER TABLE `groups` ADD `late_penalty_rate` decimal(5,2);--> statement-breakpoint
ALTER TABLE `groups` ADD `early_leave_penalty_rate` decimal(5,2);--> statement-breakpoint
ALTER TABLE `groups` ADD `shift_start_time` varchar(10);--> statement-breakpoint
ALTER TABLE `groups` ADD `shift_end_time` varchar(10);