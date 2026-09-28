CREATE TABLE `classes` (
	`class_number` integer PRIMARY KEY NOT NULL,
	`course_code` text NOT NULL,
	`session_code` text NOT NULL,
	`schedule` text NOT NULL,
	FOREIGN KEY (`course_code`) REFERENCES `courses`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_code`) REFERENCES `sessions`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `course_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`summary` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`code` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`career` text NOT NULL,
	`eligibility` text NOT NULL,
	`name` text NOT NULL,
	`units` integer NOT NULL,
	`summary` text NOT NULL,
	`description` text NOT NULL,
	`prerequisites` text NOT NULL,
	`teaching_mode` text NOT NULL,
	`assessment` text NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `course_groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `enrolments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_number` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`class_number`) REFERENCES `classes`(`class_number`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enrolments_class_number_unique` ON `enrolments` (`class_number`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL
);
