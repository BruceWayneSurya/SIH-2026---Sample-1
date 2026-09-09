CREATE TABLE "chapters" (
	"id" serial PRIMARY KEY NOT NULL,
	"class_no" integer NOT NULL,
	"subject_slug" text NOT NULL,
	"subject_name" text NOT NULL,
	"num" integer NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"summary" text,
	"outcome_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"diksha_code" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcq_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"chapter_id" integer NOT NULL,
	"answers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"duration_sec" integer DEFAULT 0 NOT NULL,
	"xp_earned" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcq_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"chapter_id" integer NOT NULL,
	"qtext" text NOT NULL,
	"options" jsonb NOT NULL,
	"correct_index" integer NOT NULL,
	"explanation" text DEFAULT '' NOT NULL,
	"is_pyq" boolean DEFAULT false NOT NULL,
	"pyq_tag" text
);
--> statement-breakpoint
CREATE TABLE "note_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"note_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"chapter_id" integer NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"file_name" text,
	"file_url" text,
	"file_type" text DEFAULT 'text' NOT NULL,
	"author_id" integer,
	"author_name" text NOT NULL,
	"faculty_verified" boolean DEFAULT false NOT NULL,
	"verified_by_name" text,
	"rewarded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subjective_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"chapter_id" integer NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"xp_earned" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subjective_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"chapter_id" integer NOT NULL,
	"qtext" text NOT NULL,
	"marks" integer NOT NULL,
	"rubric" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"model_answer" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"handle" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'student' NOT NULL,
	"class_name" integer,
	"state" text,
	"school" text,
	"subject_specialization" text,
	"institution_id" text,
	"is_guest" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_handle_unique" UNIQUE("handle"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"chapter_id" integer NOT NULL,
	"title" text NOT NULL,
	"kind" text DEFAULT 'mp4' NOT NULL,
	"video_url" text NOT NULL,
	"duration_sec" integer DEFAULT 0 NOT NULL,
	"file_size_mb" real,
	"markers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"slides_url" text,
	"slides_title" text,
	"uploaded_by_id" integer,
	"uploaded_by_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "xp_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"amount" integer NOT NULL,
	"ref_type" text,
	"ref_id" integer,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mcq_attempts" ADD CONSTRAINT "mcq_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcq_attempts" ADD CONSTRAINT "mcq_attempts_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcq_questions" ADD CONSTRAINT "mcq_questions_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_votes" ADD CONSTRAINT "note_votes_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_votes" ADD CONSTRAINT "note_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjective_attempts" ADD CONSTRAINT "subjective_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjective_attempts" ADD CONSTRAINT "subjective_attempts_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjective_questions" ADD CONSTRAINT "subjective_questions_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chapters_class_subject_slug" ON "chapters" USING btree ("class_no","subject_slug","slug");--> statement-breakpoint
CREATE INDEX "chapters_lookup" ON "chapters" USING btree ("class_no","subject_slug");--> statement-breakpoint
CREATE INDEX "mcq_attempts_user" ON "mcq_attempts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mcq_attempts_chapter" ON "mcq_attempts" USING btree ("chapter_id");--> statement-breakpoint
CREATE INDEX "mcq_chapter" ON "mcq_questions" USING btree ("chapter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "note_votes_note_user" ON "note_votes" USING btree ("note_id","user_id");--> statement-breakpoint
CREATE INDEX "note_votes_user" ON "note_votes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notes_chapter" ON "notes" USING btree ("chapter_id");--> statement-breakpoint
CREATE INDEX "subj_attempts_user" ON "subjective_attempts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subj_chapter" ON "subjective_questions" USING btree ("chapter_id");--> statement-breakpoint
CREATE INDEX "videos_chapter" ON "videos" USING btree ("chapter_id");--> statement-breakpoint
CREATE INDEX "xp_user" ON "xp_events" USING btree ("user_id");