import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  handle: text("handle").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["student", "faculty"] })
    .notNull()
    .default("student"),
  className: integer("class_name"),
  state: text("state"),
  school: text("school"),
  subjectSpecialization: text("subject_specialization"),
  institutionId: text("institution_id"),
  /** Mailbox proven with a one-time code. */
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  emailVerifiedAt: integer("email_verified_at", { mode: "timestamp_ms" }),
  /** Domain the address belongs to, kept for audit and review queues. */
  emailDomain: text("email_domain"),
  /** unverified → verified (institutional) | pending_review (personal mail). */
  verificationStatus: text("verification_status", {
    enum: ["unverified", "verified", "pending_review", "rejected"],
  })
    .notNull()
    .default("unverified"),
  /** Name of the reviewer who approved a pending institutional claim. */
  verifiedBy: text("verified_by"),
  isGuest: integer("is_guest", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
});

/** One-time codes issued while proving ownership of a mailbox. */
export const emailVerifications = sqliteTable(
  "email_verifications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    /** HMAC digest — the plain code is never stored. */
    codeHash: text("code_hash").notNull(),
    purpose: text("purpose", { enum: ["login", "register", "reverify"] })
      .notNull()
      .default("login"),
    attempts: integer("attempts").notNull().default(0),
    sends: integer("sends").notNull().default(1),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    lastSentAt: integer("last_sent_at", { mode: "timestamp_ms" }),
    consumedAt: integer("consumed_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (t) => [
    index("email_verifications_user").on(t.userId),
    index("email_verifications_email").on(t.email),
  ],
);

export const chapters = sqliteTable(
  "chapters",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    classNo: integer("class_no").notNull(),
    subjectSlug: text("subject_slug").notNull(),
    subjectName: text("subject_name").notNull(),
    num: integer("num").notNull(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    summary: text("summary"),
    /** NCERT learning outcome IDs, e.g. LO-8-SCI-06-01 */
    outcomeIds: text("outcome_ids", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),
    /** DIKSHA course mapping code */
    dikshaCode: text("diksha_code"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (t) => [
    uniqueIndex("chapters_class_subject_slug").on(
      t.classNo,
      t.subjectSlug,
      t.slug,
    ),
    index("chapters_lookup").on(t.classNo, t.subjectSlug),
  ],
);

export const videos = sqliteTable(
  "videos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    kind: text("kind", { enum: ["mp4", "youtube"] }).notNull().default("mp4"),
    videoUrl: text("video_url").notNull(),
    durationSec: integer("duration_sec").notNull().default(0),
    fileSizeMb: real("file_size_mb"),
    /** [{t: 0, label: "..."}] */
    markers: text("markers", { mode: "json" }).$type<{ t: number; label: string }[]>().notNull().default([]),
    slidesUrl: text("slides_url"),
    slidesTitle: text("slides_title"),
    uploadedById: integer("uploaded_by_id"),
    uploadedByName: text("uploaded_by_name"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (t) => [index("videos_chapter").on(t.chapterId)],
);

export const notes = sqliteTable(
  "notes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content"),
    fileName: text("file_name"),
    fileUrl: text("file_url"),
    fileType: text("file_type", { enum: ["text", "pdf", "image"] })
      .notNull()
      .default("text"),
    authorId: integer("author_id"),
    authorName: text("author_name").notNull(),
    facultyVerified: integer("faculty_verified", { mode: "boolean" }).notNull().default(false),
    verifiedByName: text("verified_by_name"),
    /** +50 XP reward already granted to author */
    rewarded: integer("rewarded", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (t) => [index("notes_chapter").on(t.chapterId)],
);

export const noteVotes = sqliteTable(
  "note_votes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    noteId: integer("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (t) => [
    uniqueIndex("note_votes_note_user").on(t.noteId, t.userId),
    index("note_votes_user").on(t.userId),
  ],
);

export const mcqQuestions = sqliteTable(
  "mcq_questions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    qtext: text("qtext").notNull(),
    options: text("options", { mode: "json" }).$type<string[]>().notNull(),
    correctIndex: integer("correct_index").notNull(),
    explanation: text("explanation").notNull().default(""),
    isPyq: integer("is_pyq", { mode: "boolean" }).notNull().default(false),
    pyqTag: text("pyq_tag"),
  },
  (t) => [index("mcq_chapter").on(t.chapterId)],
);

export const mcqAttempts = sqliteTable(
  "mcq_attempts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    answers: text("answers", { mode: "json" }).$type<number[]>().notNull().default([]),
    score: integer("score").notNull().default(0),
    total: integer("total").notNull().default(0),
    durationSec: integer("duration_sec").notNull().default(0),
    xpEarned: integer("xp_earned").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (t) => [
    index("mcq_attempts_user").on(t.userId),
    index("mcq_attempts_chapter").on(t.chapterId),
  ],
);

export const subjectiveQuestions = sqliteTable(
  "subjective_questions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    qtext: text("qtext").notNull(),
    marks: integer("marks").notNull(),
    /** [{step: "...", marks: 1}] */
    rubric: text("rubric", { mode: "json" }).$type<{ step: string; marks: number }[]>()
      .notNull()
      .default([]),
    modelAnswer: text("model_answer").notNull().default(""),
  },
  (t) => [index("subj_chapter").on(t.chapterId)],
);

export const subjectiveAttempts = sqliteTable(
  "subjective_attempts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    answers: text("answers", { mode: "json" }).$type<Record<string, string>>().notNull().default({}),
    xpEarned: integer("xp_earned").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (t) => [index("subj_attempts_user").on(t.userId)],
);

export const xpEvents = sqliteTable(
  "xp_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type", {
      enum: ["objective", "subjective", "note_upvotes", "note_upload", "streak_milestone"],
    }).notNull(),
    amount: integer("amount").notNull(),
    refType: text("ref_type"),
    refId: integer("ref_id"),
    note: text("note").notNull().default(""),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (t) => [index("xp_user").on(t.userId)],
);

/* ------------------------------------------------------------------ */
/*  Learning analytics — pre-aggregated by event, never scanned from   */
/*  the raw submission tables at render time.                          */
/* ------------------------------------------------------------------ */

/** One row per (student, UTC day) with the day's engagement totals. */
export const dailyActivity = sqliteTable(
  "daily_activity",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** UTC day key, YYYY-MM-DD. */
    activityDate: text("activity_date").notNull(),
    /** Objective tests submitted. */
    quizzes: integer("quizzes").notNull().default(0),
    /** Subjective written sets submitted. */
    subjective: integer("subjective").notNull().default(0),
    /** AI tutor conversations / study generations. */
    aiSessions: integer("ai_sessions").notNull().default(0),
    /** AI recall drills (practice-quiz flashcard-style questions) answered. */
    drills: integer("drills").notNull().default(0),
    /** Drill questions answered correctly (recall signal). */
    drillsCorrect: integer("drills_correct").notNull().default(0),
    xpEarned: integer("xp_earned").notNull().default(0),
    /** Estimated focused minutes (quiz durations, clamped). */
    minutesSpent: integer("minutes_spent").notNull().default(0),
    /** { "<subjectSlug>": <activities> } — drives the "top subjects" tooltip. */
    subjects: text("subjects", { mode: "json" })
      .$type<Record<string, number>>()
      .notNull()
      .default({}),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.activityDate] }),
    index("daily_activity_user_date").on(t.userId, t.activityDate),
  ],
);

/** Exponential-moving-average score per competency dimension and scope. */
export const competencyScores = sqliteTable(
  "competency_scores",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** "all" or a subject slug — the radar's holistic vs per-subject view. */
    scope: text("scope").notNull(),
    /** conceptual | analytical | retention */
    dimension: text("dimension").notNull(),
    /** Normalized 0.0–100.0. */
    score: real("score").notNull().default(0),
    /** Observation count behind the score. */
    dataPoints: integer("data_points").notNull().default(0),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.scope, t.dimension] }),
    index("competency_user").on(t.userId),
  ],
);

/** Chapters the student has practised — powers curriculum coverage cheaply. */
export const chapterProgress = sqliteTable(
  "chapter_progress",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    firstTouchedAt: integer("first_touched_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.chapterId] }),
    index("chapter_progress_user").on(t.userId),
  ],
);

/** Weekly objective-score rollup — the accuracy trajectory without raw scans. */
export const weeklyScores = sqliteTable(
  "weekly_scores",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** UTC Monday of the week, YYYY-MM-DD. */
    weekStart: text("week_start").notNull(),
    attempts: integer("attempts").notNull().default(0),
    correctSum: integer("correct_sum").notNull().default(0),
    totalSum: integer("total_sum").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.weekStart] }),
    index("weekly_scores_user").on(t.userId),
  ],
);

/** Instantaneous streak + lifetime totals — one indexed row per student. */
export const userAnalytics = sqliteTable(
  "user_analytics",
  {
    userId: integer("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    currentStreak: integer("current_streak").notNull().default(0),
    longestStreak: integer("longest_streak").notNull().default(0),
    /** UTC day key of the last recorded activity. */
    lastActiveDate: text("last_active_date"),
    totalActiveDays: integer("total_active_days").notNull().default(0),
    totalQuizzes: integer("total_quizzes").notNull().default(0),
    totalSubjective: integer("total_subjective").notNull().default(0),
    totalAiSessions: integer("total_ai_sessions").notNull().default(0),
    totalDrills: integer("total_drills").notNull().default(0),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (t) => [index("user_analytics_streak").on(t.currentStreak)],
);
