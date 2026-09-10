/**
 * Read models for the mastery map, the RAG index, class notebooks and the
 * content-pipeline queue. Everything here is derived on read from stored
 * answers and stored sources — there is no denormalised "mastery" column that
 * could drift away from what a learner actually scored.
 */

import { and, asc, count, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  chapters,
  classNotebookItems,
  classNotebooks,
  contentJobs,
  learningOutcomes,
  mcqAttempts,
  mcqQuestions,
  notes,
  sourceChunks,
  sourceDocuments,
  users,
  videos,
} from "@/db/schema";
import {
  outcomesForChapter,
  type LearningOutcome,
  type OutcomeKind,
} from "@/lib/outcomes/taxonomy";
import { classMastery, studentMastery, type ClassMastery, type MasteryQuestion } from "@/lib/outcomes/mastery";
import { buildIndex, citation, retrieve, type Retrieval, type SourceChunk, type SourceKind, type SourceAuthority } from "@/lib/rag/retrieve";

export type OutcomeRow = LearningOutcome;

/** Outcomes for a chapter, from the database when seeded, else from the taxonomy. */
export async function getChapterOutcomes(
  classNo: number,
  subjectSlug: string,
  chapterNum: number,
): Promise<OutcomeRow[]> {
  try {
    const rows = await db
      .select()
      .from(learningOutcomes)
      .where(
        and(
          eq(learningOutcomes.classNo, classNo),
          eq(learningOutcomes.subjectSlug, subjectSlug),
          eq(learningOutcomes.chapterNum, chapterNum),
        ),
      )
      .orderBy(asc(learningOutcomes.orderIndex));
    if (rows.length > 0)
      return rows.map((row) => ({
        code: row.code,
        classNo: row.classNo,
        subjectSlug: row.subjectSlug,
        chapterNum: row.chapterNum,
        parent: row.parentCode,
        order: row.orderIndex,
        concept: row.concept,
        statement: row.statement,
        definition: row.definition,
        kind: row.kind as OutcomeKind,
        sourceStatement: row.sourceStatement,
        sourceDoc: row.sourceDoc,
        sourcePage: row.sourcePage ?? 0,
        textbookPage: row.textbookPage ?? 0,
        keywords: row.keywords ?? [],
        misconceptions: row.misconceptions ?? [],
        diagram: (row.diagram ?? "none") as LearningOutcome["diagram"],
      }));
  } catch {
    // Fall through to the static taxonomy (database may still be starting).
  }
  return outcomesForChapter(classNo, subjectSlug, chapterNum);
}

/** Chapter questions in stable id order — the answer array is positional. */
export async function getMasteryQuestions(chapterId: number): Promise<MasteryQuestion[]> {
  const rows = await db
    .select({
      id: mcqQuestions.id,
      qtext: mcqQuestions.qtext,
      options: mcqQuestions.options,
      correctIndex: mcqQuestions.correctIndex,
      loCode: mcqQuestions.loCode,
      trapIndex: mcqQuestions.trapIndex,
      trap: mcqQuestions.trap,
    })
    .from(mcqQuestions)
    .where(eq(mcqQuestions.chapterId, chapterId))
    .orderBy(asc(mcqQuestions.id));
  return rows.map((row) => ({ ...row, options: row.options ?? [] }));
}

/**
 * Students a teacher can see: one class cohort, not every Class-N learner in the
 * country. A teacher sees their own school; everyone else (a student, or an
 * anonymous visitor seeing the aggregate view) gets the largest cohort for that
 * class, so the numbers on screen never mix two schools together.
 */
export async function getClassCohorts(classNo: number) {
  const rows = await db
    .select({
      school: users.school,
      state: users.state,
      learners: count(),
    })
    .from(users)
    .where(and(eq(users.className, classNo), eq(users.role, "student"), eq(users.isGuest, false)))
    .groupBy(users.school, users.state)
    .orderBy(desc(count()), asc(users.school));
  return rows.map((row) => ({
    school: row.school ?? "Independent learners",
    state: row.state,
    learners: Number(row.learners ?? 0),
  }));
}

export async function getClassRoster(classNo: number, school?: string | null) {
  const cohort = school ?? (await getClassCohorts(classNo))[0]?.school ?? null;
  const where = [
    eq(users.className, classNo),
    eq(users.role, "student"),
    eq(users.isGuest, false),
  ];
  if (cohort) where.push(eq(users.school, cohort));
  return db
    .select({
      id: users.id,
      name: users.name,
      handle: users.handle,
      school: users.school,
      state: users.state,
      email: users.email,
    })
    .from(users)
    .where(and(...where))
    .orderBy(asc(users.name));
}

export type NamedStudentMastery = ClassMastery["students"][number] & {
  name: string;
  handle: string;
};

export type ClassMasteryView = Omit<ClassMastery, "students"> & {
  chapterId: number;
  chapterTitle: string;
  classNo: number;
  subjectSlug: string;
  students: NamedStudentMastery[];
  /** The cohort these numbers describe, shown on screen so it is never ambiguous. */
  school: string | null;
  state: string | null;
};

/**
 * The teacher heatmap: roster × outcomes, plus the evidence behind each flag.
 * Falls back to the whole class roster when a chapter has no curated outcomes.
 */
export async function getClassMasteryView(
  classNo: number,
  subjectSlug: string,
  chapterNum: number,
  options: { school?: string | null } = {},
): Promise<ClassMasteryView | null> {
  const [chapter] = await db
    .select()
    .from(chapters)
    .where(
      and(
        eq(chapters.classNo, classNo),
        eq(chapters.subjectSlug, subjectSlug),
        eq(chapters.num, chapterNum),
      ),
    )
    .limit(1);
  if (!chapter) return null;

  const [outcomes, questions, roster] = await Promise.all([
    getChapterOutcomes(classNo, subjectSlug, chapterNum),
    getMasteryQuestions(chapter.id),
    getClassRoster(classNo, options.school),
  ]);

  const attempts = roster.length
    ? await db
        .select({
          userId: mcqAttempts.userId,
          answers: mcqAttempts.answers,
          createdAt: mcqAttempts.createdAt,
        })
        .from(mcqAttempts)
        .where(
          and(
            eq(mcqAttempts.chapterId, chapter.id),
            inArray(
              mcqAttempts.userId,
              roster.map((student) => student.id),
            ),
          ),
        )
        .orderBy(asc(mcqAttempts.id))
    : [];

  // Latest attempt per learner keeps the map current without losing history.
  const latest = new Map<number, (typeof attempts)[number]>();
  for (const attempt of attempts) latest.set(attempt.userId, attempt);

  const mastery = classMastery(
    roster.map((student) => ({ userId: student.id })),
    questions,
    [...latest.values()],
    outcomes,
  );

  const nameById = new Map(roster.map((student) => [student.id, student]));
  return {
    ...mastery,
    school: roster[0]?.school ?? null,
    state: roster[0]?.state ?? null,
    chapterId: chapter.id,
    chapterTitle: chapter.title,
    classNo,
    subjectSlug,
    students: mastery.students.map((student) => ({
      ...student,
      name: nameById.get(student.userId)?.name ?? `#${student.userId}`,
      handle: nameById.get(student.userId)?.handle ?? "",
    })),
  };
}

/** A learner's own mastery map for one chapter. */
export async function getStudentMasteryView(
  userId: number,
  classNo: number,
  subjectSlug: string,
  chapterNum: number,
) {
  const [chapter] = await db
    .select()
    .from(chapters)
    .where(
      and(
        eq(chapters.classNo, classNo),
        eq(chapters.subjectSlug, subjectSlug),
        eq(chapters.num, chapterNum),
      ),
    )
    .limit(1);
  if (!chapter) return null;
  const [outcomes, questions] = await Promise.all([
    getChapterOutcomes(classNo, subjectSlug, chapterNum),
    getMasteryQuestions(chapter.id),
  ]);
  const [attempt] = await db
    .select({
      userId: mcqAttempts.userId,
      answers: mcqAttempts.answers,
      createdAt: mcqAttempts.createdAt,
      score: mcqAttempts.score,
      total: mcqAttempts.total,
    })
    .from(mcqAttempts)
    .where(and(eq(mcqAttempts.chapterId, chapter.id), eq(mcqAttempts.userId, userId)))
    .orderBy(desc(mcqAttempts.id))
    .limit(1);
  return {
    chapterId: chapter.id,
    chapterTitle: chapter.title,
    outcomes,
    attempt: attempt ?? null,
    mastery: studentMastery(questions, attempt ?? null, outcomes),
    questions,
  };
}

/* ------------------------------ RAG sources ------------------------------ */

type ChunkRow = {
  id: number;
  documentId: number;
  chapterId: number;
  page: number | null;
  para: number;
  heading: string | null;
  text: string;
  kind: string;
  authority: string;
  title: string;
  attribution: string;
};

function toSourceChunk(row: ChunkRow): SourceChunk {
  return {
    id: row.id,
    documentId: row.documentId,
    chapterId: row.chapterId,
    page: row.page,
    para: row.para,
    heading: row.heading,
    text: row.text,
    kind: row.kind as SourceKind,
    authority: row.authority as SourceAuthority,
    docTitle: row.title,
    attribution: row.attribution,
  };
}

/**
 * The chapter's quotable corpus: textbook paragraphs, teacher notes, curated
 * worksheets and (lower-weighted) classmate notes.
 */
export async function getChapterSources(
  chapterId: number,
  options: { includePending?: boolean; documentIds?: number[] } = {},
): Promise<SourceChunk[]> {
  const rows = await db
    .select({
      id: sourceChunks.id,
      documentId: sourceChunks.documentId,
      chapterId: sourceChunks.chapterId,
      page: sourceChunks.page,
      para: sourceChunks.para,
      heading: sourceChunks.heading,
      text: sourceChunks.text,
      kind: sourceDocuments.kind,
      authority: sourceDocuments.authority,
      title: sourceDocuments.title,
      attribution: sourceDocuments.attribution,
    })
    .from(sourceChunks)
    .innerJoin(sourceDocuments, eq(sourceDocuments.id, sourceChunks.documentId))
    .where(
      and(
        eq(sourceChunks.chapterId, chapterId),
        options.includePending ? undefined : eq(sourceDocuments.status, "published"),
        options.documentIds?.length
          ? inArray(sourceChunks.documentId, options.documentIds)
          : undefined,
      ),
    )
    .orderBy(asc(sourceDocuments.id), asc(sourceChunks.seq));
  return rows.map((row) => toSourceChunk(row as ChunkRow));
}

export async function getRetrieval(
  chapterId: number,
  query: string,
  options: { k?: number; documentIds?: number[] } = {},
): Promise<{ chunks: SourceChunk[]; results: Retrieval[] }> {
  const chunks = await getChapterSources(chapterId, { documentIds: options.documentIds });
  return { chunks, results: retrieve(chunks, query, { k: options.k ?? 5 }) };
}

/** One citation, in context: the paragraph plus its neighbours. */
export async function getChunkContext(chunkId: number) {
  const [row] = await db
    .select({
      id: sourceChunks.id,
      documentId: sourceChunks.documentId,
      chapterId: sourceChunks.chapterId,
      seq: sourceChunks.seq,
      page: sourceChunks.page,
      para: sourceChunks.para,
      heading: sourceChunks.heading,
      text: sourceChunks.text,
      kind: sourceDocuments.kind,
      authority: sourceDocuments.authority,
      title: sourceDocuments.title,
      attribution: sourceDocuments.attribution,
      url: sourceDocuments.url,
    })
    .from(sourceChunks)
    .innerJoin(sourceDocuments, eq(sourceDocuments.id, sourceChunks.documentId))
    .where(eq(sourceChunks.id, chunkId))
    .limit(1);
  if (!row) return null;

  const neighbours = await db
    .select({
      id: sourceChunks.id,
      seq: sourceChunks.seq,
      page: sourceChunks.page,
      para: sourceChunks.para,
      heading: sourceChunks.heading,
      text: sourceChunks.text,
    })
    .from(sourceChunks)
    .where(
      and(
        eq(sourceChunks.documentId, row.documentId),
        sql`${sourceChunks.seq} between ${row.seq - 2} and ${row.seq + 2}`,
      ),
    )
    .orderBy(asc(sourceChunks.seq));

  const [chapter] = await db
    .select({
      id: chapters.id,
      classNo: chapters.classNo,
      subjectSlug: chapters.subjectSlug,
      num: chapters.num,
      title: chapters.title,
      slug: chapters.slug,
    })
    .from(chapters)
    .where(eq(chapters.id, row.chapterId))
    .limit(1);

  return {
    chunk: toSourceChunk(row as ChunkRow),
    citation: citation(toSourceChunk(row as ChunkRow)),
    neighbours,
    chapter,
  };
}

/** Source-set coverage for a chapter, shown above the tutor. */
export async function getSourceSummary(chapterId: number) {
  const rows = await db
    .select({
      id: sourceDocuments.id,
      title: sourceDocuments.title,
      kind: sourceDocuments.kind,
      authority: sourceDocuments.authority,
      attribution: sourceDocuments.attribution,
      status: sourceDocuments.status,
      pageStart: sourceDocuments.pageStart,
      pageEnd: sourceDocuments.pageEnd,
      url: sourceDocuments.url,
      chunks: count(sourceChunks.id),
    })
    .from(sourceDocuments)
    .leftJoin(sourceChunks, eq(sourceChunks.documentId, sourceDocuments.id))
    .where(eq(sourceDocuments.chapterId, chapterId))
    .groupBy(sourceDocuments.id)
    .orderBy(asc(sourceDocuments.id));
  return rows.map((row) => ({ ...row, chunks: Number(row.chunks ?? 0) }));
}

/** Even a one-paragraph chapter index is enough for the offline pack search. */
export function searchIndexChunks(chunks: SourceChunk[], query: string, k = 3) {
  const index = buildIndex(chunks);
  void index;
  return retrieve(chunks, query, { k });
}

/* ------------------------------ notebooks ------------------------------ */

export async function getClassNotebook(chapterId: number) {
  const [notebook] = await db
    .select()
    .from(classNotebooks)
    .where(eq(classNotebooks.chapterId, chapterId))
    .limit(1);
  if (!notebook) return null;
  const items = await db
    .select()
    .from(classNotebookItems)
    .where(eq(classNotebookItems.notebookId, notebook.id))
    .orderBy(asc(classNotebookItems.id));
  const noteIds = items.map((item) => item.noteId).filter((id): id is number => id !== null);
  const linkedNotes = noteIds.length
    ? await db
        .select({
          id: notes.id,
          title: notes.title,
          content: notes.content,
          authorName: notes.authorName,
          facultyVerified: notes.facultyVerified,
          fileUrl: notes.fileUrl,
          fileType: notes.fileType,
        })
        .from(notes)
        .where(inArray(notes.id, noteIds))
    : [];
  const noteById = new Map(linkedNotes.map((note) => [note.id, note]));
  return {
    notebook,
    items: items.map((item) => ({
      ...item,
      note: item.noteId ? (noteById.get(item.noteId) ?? null) : null,
    })),
  };
}

/* --------------------------- content pipeline --------------------------- */

export async function getContentJobs(limit = 20) {
  return db
    .select()
    .from(contentJobs)
    .orderBy(desc(contentJobs.id))
    .limit(limit);
}

export async function getContentJob(id: number) {
  const [job] = await db.select().from(contentJobs).where(eq(contentJobs.id, id)).limit(1);
  return job ?? null;
}

/**
 * Chapters that still have no assessment bank or no video — the "content
 * coming soon" gap the pipeline is meant to close. Ordered by how empty they
 * are so faculty work on the biggest holes first.
 */
export async function getContentGaps(limit = 12) {
  const rows = await db
    .select({
      id: chapters.id,
      classNo: chapters.classNo,
      subjectSlug: chapters.subjectSlug,
      subjectName: chapters.subjectName,
      num: chapters.num,
      title: chapters.title,
      slug: chapters.slug,
      questions: sql<number>`(select count(*) from ${mcqQuestions} where ${mcqQuestions.chapterId} = ${chapters.id})`,
      lectureCount: sql<number>`(select count(*) from ${videos} where ${videos.chapterId} = ${chapters.id})`,
      sourced: sql<number>`(select count(*) from ${sourceDocuments} where ${sourceDocuments.chapterId} = ${chapters.id})`,
    })
    .from(chapters)
    .orderBy(asc(chapters.classNo), asc(chapters.subjectSlug), asc(chapters.num));
  return rows
    .map((row) => ({
      ...row,
      questions: Number(row.questions ?? 0),
      lectureCount: Number(row.lectureCount ?? 0),
      sourced: Number(row.sourced ?? 0),
    }))
    .filter((row) => row.questions === 0)
    .sort((a, b) => a.sourced - b.sourced || a.classNo - b.classNo)
    .slice(0, limit);
}

/** Class coverage: how many chapters have a question bank / curated LO map. */
export async function getCoverageStats() {
  const [totals] = await db.select({ n: count() }).from(chapters);
  const [withBank] = await db
    .select({ n: count() })
    .from(chapters)
    .where(
      sql`exists (select 1 from ${mcqQuestions} where ${mcqQuestions.chapterId} = ${chapters.id})`,
    );
  const [withSources] = await db
    .select({ n: count() })
    .from(chapters)
    .where(
      sql`exists (select 1 from ${sourceDocuments} where ${sourceDocuments.chapterId} = ${chapters.id})`,
    );
  const [tagged] = await db
    .select({ n: count() })
    .from(mcqQuestions)
    .where(isNotNull(mcqQuestions.loCode));
  const [totalQuestions] = await db.select({ n: count() }).from(mcqQuestions);
  const [outcomeCount] = await db.select({ n: count() }).from(learningOutcomes);
  return {
    chapters: Number(totals?.n ?? 0),
    chaptersWithBank: Number(withBank?.n ?? 0),
    chaptersWithSources: Number(withSources?.n ?? 0),
    taggedQuestions: Number(tagged?.n ?? 0),
    totalQuestions: Number(totalQuestions?.n ?? 0),
    outcomes: Number(outcomeCount?.n ?? 0),
  };
}
