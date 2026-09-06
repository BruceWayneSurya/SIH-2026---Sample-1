-- Idempotent initial schema: adopt compatible existing SQLite tables without deleting data.
CREATE TABLE IF NOT EXISTS `chapters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_no` integer NOT NULL,
	`subject_slug` text NOT NULL,
	`subject_name` text NOT NULL,
	`num` integer NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`summary` text,
	`outcome_ids` text DEFAULT '[]' NOT NULL,
	`diksha_code` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `chapters_class_subject_slug` ON `chapters` (`class_no`,`subject_slug`,`slug`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `chapters_lookup` ON `chapters` (`class_no`,`subject_slug`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `mcq_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`chapter_id` integer NOT NULL,
	`answers` text DEFAULT '[]' NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`duration_sec` integer DEFAULT 0 NOT NULL,
	`xp_earned` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `mcq_attempts_user` ON `mcq_attempts` (`user_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `mcq_attempts_chapter` ON `mcq_attempts` (`chapter_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `mcq_questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chapter_id` integer NOT NULL,
	`qtext` text NOT NULL,
	`options` text NOT NULL,
	`correct_index` integer NOT NULL,
	`explanation` text DEFAULT '' NOT NULL,
	`is_pyq` integer DEFAULT false NOT NULL,
	`pyq_tag` text,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `mcq_chapter` ON `mcq_questions` (`chapter_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `note_votes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`note_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `note_votes_note_user` ON `note_votes` (`note_id`,`user_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `note_votes_user` ON `note_votes` (`user_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chapter_id` integer NOT NULL,
	`title` text NOT NULL,
	`content` text,
	`file_name` text,
	`file_url` text,
	`file_type` text DEFAULT 'text' NOT NULL,
	`author_id` integer,
	`author_name` text NOT NULL,
	`faculty_verified` integer DEFAULT false NOT NULL,
	`verified_by_name` text,
	`rewarded` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `notes_chapter` ON `notes` (`chapter_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `subjective_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`chapter_id` integer NOT NULL,
	`answers` text DEFAULT '{}' NOT NULL,
	`xp_earned` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `subj_attempts_user` ON `subjective_attempts` (`user_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `subjective_questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chapter_id` integer NOT NULL,
	`qtext` text NOT NULL,
	`marks` integer NOT NULL,
	`rubric` text DEFAULT '[]' NOT NULL,
	`model_answer` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `subj_chapter` ON `subjective_questions` (`chapter_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`handle` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'student' NOT NULL,
	`class_name` integer,
	`state` text,
	`school` text,
	`subject_specialization` text,
	`institution_id` text,
	`is_guest` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `users_handle_unique` ON `users` (`handle`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `videos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chapter_id` integer NOT NULL,
	`title` text NOT NULL,
	`kind` text DEFAULT 'mp4' NOT NULL,
	`video_url` text NOT NULL,
	`duration_sec` integer DEFAULT 0 NOT NULL,
	`file_size_mb` real,
	`markers` text DEFAULT '[]' NOT NULL,
	`slides_url` text,
	`slides_title` text,
	`uploaded_by_id` integer,
	`uploaded_by_name` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `videos_chapter` ON `videos` (`chapter_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `xp_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`ref_type` text,
	`ref_id` integer,
	`note` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `xp_user` ON `xp_events` (`user_id`);