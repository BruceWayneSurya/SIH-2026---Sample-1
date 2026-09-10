-- Additive only: learning outcomes, RAG source corpus, class notebooks,
-- teacher content-pipeline jobs and the offline-sync ledger.
-- Idempotent table/index creation adopts an existing SQLite file without
-- deleting data. The three mcq_questions columns of this release (`lo_code`,
-- `trap_index`, `trap`) are adopted by src/db/ensure-columns.ts instead of ALTER
-- statements here: SQLite has no ADD COLUMN IF NOT EXISTS and this file must stay
-- replayable when a database without a migration journal is adopted. The
-- mcq_lo index is created by src/db/ensure-columns.ts with the lo_code column.
CREATE TABLE IF NOT EXISTS `class_notebook_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`notebook_id` integer NOT NULL,
	`kind` text DEFAULT 'link' NOT NULL,
	`title` text NOT NULL,
	`url` text,
	`note_id` integer,
	`source_document_id` integer,
	`added_by_id` integer,
	`added_by_name` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`notebook_id`) REFERENCES `class_notebooks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `class_notebook_items_notebook` ON `class_notebook_items` (`notebook_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `class_notebooks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_no` integer NOT NULL,
	`subject_slug` text NOT NULL,
	`chapter_id` integer NOT NULL,
	`title` text NOT NULL,
	`curator_id` integer,
	`curator_name` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `class_notebooks_chapter` ON `class_notebooks` (`chapter_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `content_jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chapter_id` integer NOT NULL,
	`created_by_id` integer,
	`created_by_name` text DEFAULT '' NOT NULL,
	`source_kind` text DEFAULT 'text' NOT NULL,
	`source_name` text DEFAULT '' NOT NULL,
	`source_text` text DEFAULT '' NOT NULL,
	`transcript` text,
	`status` text DEFAULT 'ready' NOT NULL,
	`payload` text DEFAULT '{}' NOT NULL,
	`error` text,
	`target_language` text DEFAULT 'te' NOT NULL,
	`published_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `content_jobs_chapter` ON `content_jobs` (`chapter_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `content_jobs_status` ON `content_jobs` (`status`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `learning_outcomes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`class_no` integer NOT NULL,
	`subject_slug` text NOT NULL,
	`chapter_num` integer NOT NULL,
	`parent_code` text,
	`order_index` integer DEFAULT 1 NOT NULL,
	`concept` text NOT NULL,
	`statement` text NOT NULL,
	`definition` text DEFAULT '' NOT NULL,
	`kind` text DEFAULT 'concept' NOT NULL,
	`source_statement` text DEFAULT '' NOT NULL,
	`source_doc` text DEFAULT '' NOT NULL,
	`source_page` integer,
	`textbook_page` integer,
	`keywords` text DEFAULT '[]' NOT NULL,
	`misconceptions` text DEFAULT '[]' NOT NULL,
	`diagram` text DEFAULT 'none' NOT NULL,
	`origin` text DEFAULT 'ncert_curated' NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `learning_outcomes_code_unique` ON `learning_outcomes` (`code`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `lo_chapter` ON `learning_outcomes` (`class_no`,`subject_slug`,`chapter_num`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `lo_parent` ON `learning_outcomes` (`parent_code`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `offline_syncs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` text NOT NULL,
	`user_id` integer NOT NULL,
	`chapter_id` integer NOT NULL,
	`attempt_id` integer,
	`score` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`xp_earned` integer DEFAULT 0 NOT NULL,
	`completed_at` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `offline_syncs_client_id_unique` ON `offline_syncs` (`client_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `offline_syncs_user` ON `offline_syncs` (`user_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `source_chunks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`document_id` integer NOT NULL,
	`chapter_id` integer NOT NULL,
	`seq` integer DEFAULT 1 NOT NULL,
	`page` integer,
	`para` integer DEFAULT 1 NOT NULL,
	`heading` text,
	`text` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `source_documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `source_chunks_chapter` ON `source_chunks` (`chapter_id`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `source_chunks_doc_seq` ON `source_chunks` (`document_id`,`seq`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `source_documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chapter_id` integer NOT NULL,
	`doc_key` text NOT NULL,
	`title` text NOT NULL,
	`attribution` text DEFAULT '' NOT NULL,
	`kind` text DEFAULT 'ncert_textbook' NOT NULL,
	`authority` text DEFAULT 'ncert' NOT NULL,
	`language` text DEFAULT 'en' NOT NULL,
	`page_start` integer,
	`page_end` integer,
	`url` text,
	`note_id` integer,
	`status` text DEFAULT 'published' NOT NULL,
	`uploaded_by_id` integer,
	`uploaded_by_name` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `source_documents_chapter_key` ON `source_documents` (`chapter_id`,`doc_key`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `source_documents_chapter` ON `source_documents` (`chapter_id`);
