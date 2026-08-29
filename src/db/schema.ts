import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  jsonb,
  real,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
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
  isGuest: boolean("is_guest").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chapters = pgTable(
  "chapters",
  {
    id: serial("id").primaryKey(),
    classNo: integer("class_no").notNull(),
    subjectSlug: text("subject_slug").notNull(),
    subjectName: text("subject_name").notNull(),
    num: integer("num").notNull(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    summary: text("summary"),
    /** NCERT learning outcome IDs, e.g. LO-8-SCI-06-01 */
    outcomeIds: text("outcome_ids")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** DIKSHA course mapping code */
    dikshaCode: text("diksha_code"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
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

export const videos = pgTable(
  "videos",
  {
    id: serial("id").primaryKey(),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    kind: text("kind", { enum: ["mp4", "youtube"] }).notNull().default("mp4"),
    videoUrl: text("video_url").notNull(),
    durationSec: integer("duration_sec").notNull().default(0),
    fileSizeMb: real("file_size_mb"),
    /** [{t: 0, label: "..."}] */
    markers: jsonb("markers").$type<{ t: number; label: string }[]>().notNull().default([]),
    slidesUrl: text("slides_url"),
    slidesTitle: text("slides_title"),
    uploadedById: integer("uploaded_by_id"),
    uploadedByName: text("uploaded_by_name"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("videos_chapter").on(t.chapterId)],
);

export const notes = pgTable(
  "notes",
  {
    id: serial("id").primaryKey(),
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
    facultyVerified: boolean("faculty_verified").notNull().default(false),
    verifiedByName: text("verified_by_name"),
    /** +50 XP reward already granted to author */
    rewarded: boolean("rewarded").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("notes_chapter").on(t.chapterId)],
);

export const noteVotes = pgTable(
  "note_votes",
  {
    id: serial("id").primaryKey(),
    noteId: integer("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("note_votes_note_user").on(t.noteId, t.userId),
    index("note_votes_user").on(t.userId),
  ],
);

export const mcqQuestions = pgTable(
  "mcq_questions",
  {
    id: serial("id").primaryKey(),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    qtext: text("qtext").notNull(),
    options: jsonb("options").$type<string[]>().notNull(),
    correctIndex: integer("correct_index").notNull(),
    explanation: text("explanation").notNull().default(""),
    isPyq: boolean("is_pyq").notNull().default(false),
    pyqTag: text("pyq_tag"),
  },
  (t) => [index("mcq_chapter").on(t.chapterId)],
);

export const mcqAttempts = pgTable(
  "mcq_attempts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    answers: jsonb("answers").$type<number[]>().notNull().default([]),
    score: integer("score").notNull().default(0),
    total: integer("total").notNull().default(0),
    durationSec: integer("duration_sec").notNull().default(0),
    xpEarned: integer("xp_earned").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("mcq_attempts_user").on(t.userId),
    index("mcq_attempts_chapter").on(t.chapterId),
  ],
);

export const subjectiveQuestions = pgTable(
  "subjective_questions",
  {
    id: serial("id").primaryKey(),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    qtext: text("qtext").notNull(),
    marks: integer("marks").notNull(),
    /** [{step: "...", marks: 1}] */
    rubric: jsonb("rubric").$type<{ step: string; marks: number }[]>()
      .notNull()
      .default([]),
    modelAnswer: text("model_answer").notNull().default(""),
  },
  (t) => [index("subj_chapter").on(t.chapterId)],
);

export const subjectiveAttempts = pgTable(
  "subjective_attempts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    answers: jsonb("answers").$type<Record<string, string>>().notNull().default({}),
    xpEarned: integer("xp_earned").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("subj_attempts_user").on(t.userId)],
);

export const xpEvents = pgTable(
  "xp_events",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type", {
      enum: ["objective", "subjective", "note_upvotes", "note_upload"],
    }).notNull(),
    amount: integer("amount").notNull(),
    refType: text("ref_type"),
    refId: integer("ref_id"),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("xp_user").on(t.userId)],
);
