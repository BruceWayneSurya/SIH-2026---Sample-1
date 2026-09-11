CREATE TABLE IF NOT EXISTS `chapter_progress` (
	`user_id` integer NOT NULL,
	`chapter_id` integer NOT NULL,
	`first_touched_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`user_id`, `chapter_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `chapter_progress_user` ON `chapter_progress` (`user_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `competency_scores` (
	`user_id` integer NOT NULL,
	`scope` text NOT NULL,
	`dimension` text NOT NULL,
	`score` real DEFAULT 0 NOT NULL,
	`data_points` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`user_id`, `scope`, `dimension`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `competency_user` ON `competency_scores` (`user_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `daily_activity` (
	`user_id` integer NOT NULL,
	`activity_date` text NOT NULL,
	`quizzes` integer DEFAULT 0 NOT NULL,
	`subjective` integer DEFAULT 0 NOT NULL,
	`ai_sessions` integer DEFAULT 0 NOT NULL,
	`drills` integer DEFAULT 0 NOT NULL,
	`drills_correct` integer DEFAULT 0 NOT NULL,
	`xp_earned` integer DEFAULT 0 NOT NULL,
	`minutes_spent` integer DEFAULT 0 NOT NULL,
	`subjects` text DEFAULT '{}' NOT NULL,
	PRIMARY KEY(`user_id`, `activity_date`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `daily_activity_user_date` ON `daily_activity` (`user_id`,`activity_date`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `user_analytics` (
	`user_id` integer PRIMARY KEY NOT NULL,
	`current_streak` integer DEFAULT 0 NOT NULL,
	`longest_streak` integer DEFAULT 0 NOT NULL,
	`last_active_date` text,
	`total_active_days` integer DEFAULT 0 NOT NULL,
	`total_quizzes` integer DEFAULT 0 NOT NULL,
	`total_subjective` integer DEFAULT 0 NOT NULL,
	`total_ai_sessions` integer DEFAULT 0 NOT NULL,
	`total_drills` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `user_analytics_streak` ON `user_analytics` (`current_streak`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `weekly_scores` (
	`user_id` integer NOT NULL,
	`week_start` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`correct_sum` integer DEFAULT 0 NOT NULL,
	`total_sum` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`user_id`, `week_start`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `weekly_scores_user` ON `weekly_scores` (`user_id`);