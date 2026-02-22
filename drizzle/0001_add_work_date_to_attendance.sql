-- Migration: Add work_date field to attendance_events table
-- Date: 2026-02-22
-- Description: إضافة حقل work_date لتطبيق نظام اليوم الإداري (5 AM boundary)

-- Step 1: Add work_date column (nullable initially)
ALTER TABLE `attendance_events` 
ADD COLUMN `work_date` DATE NULL COMMENT 'تاريخ اليوم الإداري (5 AM boundary)';

-- Step 2: Add indexes for performance
CREATE INDEX `idx_attendance_work_date` ON `attendance_events` (`work_date`);
CREATE INDEX `idx_attendance_worker_work_date` ON `attendance_events` (`worker_id`, `work_date`);

-- Step 3: Backfill existing data will be done via TypeScript script
-- Run: npx tsx scripts/backfill-work-dates.ts

-- Step 4: After backfill verification, make work_date NOT NULL
-- ALTER TABLE `attendance_events` MODIFY COLUMN `work_date` DATE NOT NULL;
