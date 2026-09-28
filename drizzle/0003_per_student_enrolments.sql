DROP INDEX `enrolments_class_number_unique`;--> statement-breakpoint
-- Existing rows predate sign-in and belonged to the only (postgraduate) demo student.
ALTER TABLE `enrolments` ADD `student_id` text NOT NULL DEFAULT 'pg-demo';--> statement-breakpoint
CREATE UNIQUE INDEX `enrolments_student_class_unique` ON `enrolments` (`student_id`,`class_number`);