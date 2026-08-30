import {
  sqliteTable,
  integer,
  text,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// ---------------------------------------------------------------------------
// Notes on the SQLite port (was PostgreSQL):
//   * `pgTable`      -> `sqliteTable`
//   * `serial()`     -> `integer({ mode: "number" }).primaryKey({ autoIncrement: true })`
//   * `boolean()`    -> `integer({ mode: "boolean" })`  (stored as 0/1)
//   * `timestamp()`  -> `integer({ mode: "timestamp" })` (stored as ms epoch, returns Date)
//   * `jsonb`/arrays -> `text({ mode: "json" })` (auto-serialized via Drizzle)
//   * `text().array()` -> JSON text column with `$type<string[]>()`
// ---------------------------------------------------------------------------

export const users = sqliteTable("users", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
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
  isGuest: integer("is_guest", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const chapters = sqliteTable(
  "chapters",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    classNo: integer("class_no").notNull(),
    subjectSlug: text("subject_slug").notNull(),
    subjectName: text("subject_name").notNull(),
    num: integer("num").notNull(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    summary: text("summary"),
    /** NCERT learning outcome IDs, e.g. ["LO-8-SCI-06-01", ...] — stored as JSON */
    outcomeIds: text("outcome_ids", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),
    /** DIKSHA course mapping code */
    dikshaCode: text("diksha_code"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
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
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    chapterId: integer("chapter_id").notNull().references(() => chapters.id, {
      onDelete: "cascade",
    }),
    title: text("title").notNull(),
    kind: text("kind", { enum: ["mp4", "youtube"] }).notNull().default("mp4"),
    videoUrl: text("video_url").notNull(),
    durationSec: integer("duration_sec").notNull().default(0),
    fileSizeMb: real("file_size_mb"),
    /** [{t: 0, label: "..."}] */
    markers: text("markers", { mode: "json" })
      .$type<{ t: number; label: string }[]>()
      .notNull()
      .default([]),
    slidesUrl: text("slides_url"),
    slidesTitle: text("slides_title"),
    uploadedById: integer("uploaded_by_id"),
    uploadedByName: text("uploaded_by_name"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("videos_chapter").on(t.chapterId)],
);

export const notes = sqliteTable(
  "notes",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    chapterId: integer("chapter_id").notNull().references(() => chapters.id, {
      onDelete: "cascade",
    }),
    title: text("title").notNull(),
    content: text("content"),
    fileName: text("file_name"),
    fileUrl: text("file_url"),
    fileType: text("file_type", { enum: ["text", "pdf", "image"] })
      .notNull()
      .default("text"),
    authorId: integer("author_id"),
    authorName: text("author_name").notNull(),
    facultyVerified: integer("faculty_verified", { mode: "boolean" })
      .notNull()
      .default(false),
    verifiedByName: text("verified_by_name"),
    /** +50 XP reward already granted to author */
    rewarded: integer("rewarded", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("notes_chapter").on(t.chapterId)],
);

export const noteVotes = sqliteTable(
  "note_votes",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    noteId: integer("note_id").notNull().references(() => notes.id, {
      onDelete: "cascade",
    }),
    userId: integer("user_id").notNull().references(() => users.id, {
      onDelete: "cascade",
    }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    uniqueIndex("note_votes_note_user").on(t.noteId, t.userId),
    index("note_votes_user").on(t.userId),
  ],
);

export const mcqQuestions = sqliteTable(
  "mcq_questions",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    chapterId: integer("chapter_id").notNull().references(() => chapters.id, {
      onDelete: "cascade",
    }),
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
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull().references(() => users.id, {
      onDelete: "cascade",
    }),
    chapterId: integer("chapter_id").notNull().references(() => chapters.id, {
      onDelete: "cascade",
    }),
    answers: text("answers", { mode: "json" })
      .$type<number[]>()
      .notNull()
      .default([]),
    score: integer("score").notNull().default(0),
    total: integer("total").notNull().default(0),
    durationSec: integer("duration_sec").notNull().default(0),
    xpEarned: integer("xp_earned").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    index("mcq_attempts_user").on(t.userId),
    index("mcq_attempts_chapter").on(t.chapterId),
  ],
);

export const subjectiveQuestions = sqliteTable(
  "subjective_questions",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    chapterId: integer("chapter_id").notNull().references(() => chapters.id, {
      onDelete: "cascade",
    }),
    qtext: text("qtext").notNull(),
    marks: integer("marks").notNull(),
    /** [{step: "...", marks: 1}] */
    rubric: text("rubric", { mode: "json" })
      .$type<{ step: string; marks: number }[]>()
      .notNull()
      .default([]),
    modelAnswer: text("model_answer").notNull().default(""),
  },
  (t) => [index("subj_chapter").on(t.chapterId)],
);

export const subjectiveAttempts = sqliteTable(
  "subjective_attempts",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull().references(() => users.id, {
      onDelete: "cascade",
    }),
    chapterId: integer("chapter_id").notNull().references(() => chapters.id, {
      onDelete: "cascade",
    }),
    answers: text("answers", { mode: "json" })
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    xpEarned: integer("xp_earned").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("subj_attempts_user").on(t.userId)],
);

export const xpEvents = sqliteTable(
  "xp_events",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull().references(() => users.id, {
      onDelete: "cascade",
    }),
    type: text("type", {
      enum: ["objective", "subjective", "note_upvotes", "note_upload"],
    }).notNull(),
    amount: integer("amount").notNull(),
    refType: text("ref_type"),
    refId: integer("ref_id"),
    note: text("note").notNull().default(""),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("xp_user").on(t.userId)],
);
