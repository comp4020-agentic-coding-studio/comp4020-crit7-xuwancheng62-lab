CREATE TABLE `students` (
	`id` text PRIMARY KEY NOT NULL,
	`career` text,
	`program` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
