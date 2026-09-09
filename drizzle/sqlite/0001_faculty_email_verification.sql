-- Idempotent faculty email-verification schema. Databases created from an
-- earlier 0000 pick up the new `users` columns through
-- src/db/ensure-columns.ts, because SQLite has no ADD COLUMN IF NOT EXISTS.
CREATE TABLE IF NOT EXISTS `email_verifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`email` text NOT NULL,
	`code_hash` text NOT NULL,
	`purpose` text DEFAULT 'login' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`sends` integer DEFAULT 1 NOT NULL,
	`expires_at` integer NOT NULL,
	`last_sent_at` integer,
	`consumed_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `email_verifications_user` ON `email_verifications` (`user_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `email_verifications_email` ON `email_verifications` (`email`);
