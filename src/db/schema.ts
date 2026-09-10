import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
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
    /**
     * NCERT learning outcome this question assesses (`learning_outcomes.code`).
     * Null = untagged, and untagged questions never move a mastery colour.
     */
    loCode: text("lo_code"),
    /** Option index that carries the classic wrong idea, and its name. */
    trapIndex: integer("trap_index"),
    trap: text("trap"),
  },
  (t) => [index("mcq_chapter").on(t.chapterId), index("mcq_lo").on(t.loCode)],
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
      enum: ["objective", "subjective", "note_upvotes", "note_upload"],
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
/*  Learning-outcome graph, RAG sources, notebooks, content pipeline   */
/* ------------------------------------------------------------------ */

/**
 * NCERT learning outcomes. `chapters.outcome_ids` keeps the lightweight list the
 * chapter header renders; this table is the queryable graph behind the teacher
 * heatmap, the concept tree and the offline pack.
 */
export const learningOutcomes = sqliteTable(
  "learning_outcomes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** Stable NCERT-style code, e.g. LO-8-SCI-06-03. */
    code: text("code").notNull().unique(),
    classNo: integer("class_no").notNull(),
    subjectSlug: text("subject_slug").notNull(),
    chapterNum: integer("chapter_num").notNull(),
    /** Parent concept code — the tree edge. */
    parentCode: text("parent_code"),
    orderIndex: integer("order_index").notNull().default(1),
    concept: text("concept").notNull(),
    statement: text("statement").notNull(),
    definition: text("definition").notNull().default(""),
    kind: text("kind", { enum: ["concept", "skill", "application"] })
      .notNull()
      .default("concept"),
    /** Published stage outcome this chapter outcome sits under. */
    sourceStatement: text("source_statement").notNull().default(""),
    sourceDoc: text("source_doc").notNull().default(""),
    sourcePage: integer("source_page"),
    textbookPage: integer("textbook_page"),
    keywords: text("keywords", { mode: "json" }).$type<string[]>().notNull().default([]),
    misconceptions: text("misconceptions", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),
    diagram: text("diagram").notNull().default("none"),
    /** ncert_curated | faculty_approved | ai_proposed */
    origin: text("origin").notNull().default("ncert_curated"),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [
    index("lo_chapter").on(t.classNo, t.subjectSlug, t.chapterNum),
    index("lo_parent").on(t.parentCode),
  ],
);

/**
 * Everything the tutor is allowed to quote. `authority` is what makes
 * faculty-verified notes outrank a classmate's and the textbook outrank both.
 */
export const sourceDocuments = sqliteTable(
  "source_documents",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    /** Stable per-chapter key so re-seeding updates instead of duplicating. */
    docKey: text("doc_key").notNull(),
    title: text("title").notNull(),
    /** Shown on the citation chip: book title or author name. */
    attribution: text("attribution").notNull().default(""),
    kind: text("kind", {
      enum: ["ncert_textbook", "faculty_note", "student_note", "worksheet", "video", "ai_notes"],
    })
      .notNull()
      .default("ncert_textbook"),
    authority: text("authority", {
      enum: ["ncert", "faculty_verified", "faculty", "student", "ai_proposed"],
    })
      .notNull()
      .default("ncert"),
    language: text("language").notNull().default("en"),
    pageStart: integer("page_start"),
    pageEnd: integer("page_end"),
    url: text("url"),
    noteId: integer("note_id"),
    status: text("status", { enum: ["published", "pending_review"] })
      .notNull()
      .default("published"),
    uploadedById: integer("uploaded_by_id"),
    uploadedByName: text("uploaded_by_name"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [
    uniqueIndex("source_documents_chapter_key").on(t.chapterId, t.docKey),
    index("source_documents_chapter").on(t.chapterId),
  ],
);

/** One paragraph (or bullet) per row — the unit a citation points at. */
export const sourceChunks = sqliteTable(
  "source_chunks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    documentId: integer("document_id")
      .notNull()
      .references(() => sourceDocuments.id, { onDelete: "cascade" }),
    chapterId: integer("chapter_id").notNull(),
    seq: integer("seq").notNull().default(1),
    page: integer("page"),
    para: integer("para").notNull().default(1),
    heading: text("heading"),
    text: text("text").notNull(),
    /** Bumped when text changes so stale offline packs can be detected. */
    revision: integer("revision").notNull().default(1),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [
    index("source_chunks_chapter").on(t.chapterId),
    uniqueIndex("source_chunks_doc_seq").on(t.documentId, t.seq),
  ],
);

/** A teacher's curated source set for one class + chapter. */
export const classNotebooks = sqliteTable(
  "class_notebooks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    classNo: integer("class_no").notNull(),
    subjectSlug: text("subject_slug").notNull(),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    curatorId: integer("curator_id"),
    curatorName: text("curator_name").notNull().default(""),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [uniqueIndex("class_notebooks_chapter").on(t.chapterId)],
);

export const classNotebookItems = sqliteTable(
  "class_notebook_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    notebookId: integer("notebook_id")
      .notNull()
      .references(() => classNotebooks.id, { onDelete: "cascade" }),
    kind: text("kind", {
      enum: ["note", "pdf", "youtube", "worksheet", "link"],
    })
      .notNull()
      .default("link"),
    title: text("title").notNull(),
    url: text("url"),
    noteId: integer("note_id"),
    sourceDocumentId: integer("source_document_id"),
    addedById: integer("added_by_id"),
    addedByName: text("added_by_name").notNull().default(""),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [index("class_notebook_items_notebook").on(t.notebookId)],
);

/**
 * Teacher content pipeline: one row per uploaded lecture/PDF/photo and the
 * generated transcript, notes, outcome-tagged question bank and translation.
 */
export const contentJobs = sqliteTable(
  "content_jobs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    createdById: integer("created_by_id"),
    createdByName: text("created_by_name").notNull().default(""),
    sourceKind: text("source_kind", {
      enum: ["text", "pdf", "photo", "audio"],
    })
      .notNull()
      .default("text"),
    sourceName: text("source_name").notNull().default(""),
    /** Extracted/transcribed text the generation ran on. */
    sourceText: text("source_text").notNull().default(""),
    transcript: text("transcript"),
    status: text("status", {
      enum: ["draft", "ready", "published", "failed"],
    })
      .notNull()
      .default("ready"),
    /** { notes, questions[], translation, outcomes[], model, degraded } */
    payload: text("payload", { mode: "json" })
      .$type<{
        notes?: string;
        questions?: {
          qtext: string;
          options: string[];
          correctIndex: number;
          explanation: string;
          loCode: string | null;
        }[];
        translation?: { language: string; text: string } | null;
        outcomes?: { code: string; concept: string; statement: string }[];
        model?: string;
        degraded?: boolean;
      }>()
      .notNull()
      .default({}),
    error: text("error"),
    targetLanguage: text("target_language").notNull().default("te"),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [
    index("content_jobs_chapter").on(t.chapterId),
    index("content_jobs_status").on(t.status),
  ],
);

/**
 * Idempotency ledger for offline quiz results: a device may upload the same
 * attempt many times across flaky connections, and XP must be granted once.
 */
export const offlineSyncs = sqliteTable(
  "offline_syncs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    clientId: text("client_id").notNull().unique(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    chapterId: integer("chapter_id").notNull(),
    attemptId: integer("attempt_id"),
    score: integer("score").notNull().default(0),
    total: integer("total").notNull().default(0),
    xpEarned: integer("xp_earned").notNull().default(0),
    /** Device clock, recorded for audit only. */
    completedAt: text("completed_at"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [index("offline_syncs_user").on(t.userId)],
);
