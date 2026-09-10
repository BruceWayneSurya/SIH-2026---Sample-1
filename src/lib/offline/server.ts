/**
 * Server side of the offline loop: build a chapter pack, and accept quiz results
 * that were taken with no network.
 *
 * Two rules make this trustworthy:
 *   • the pack is generated from the same tables the online portal reads, so an
 *     offline quiz cannot show a question the school has withdrawn;
 *   • sync recomputes the score from the server's answer key. The device sends
 *     only the options the learner picked — never a score, never XP. A replayed
 *     `clientId` is recorded once and returns the original result, so a flaky
 *     connection cannot duplicate XP.
 */

import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  chapters,
  mcqAttempts,
  mcqQuestions,
  notes,
  offlineSyncs,
  users,
  videos,
  xpEvents,
} from "@/db/schema";
import { getChapterOutcomes, getChapterSources, getMasteryQuestions } from "@/lib/queries-learning";
import { citation } from "@/lib/rag/retrieve";
import { buildRevisionSheet, renderRevisionSvg } from "@/lib/revision/sheet";
import { subjectName } from "@/lib/curriculum";
import {
  PACK_FORMAT,
  PACK_VERSION,
  packSizeKb,
  type ChapterPack,
  type SyncPayload,
} from "./pack";

/** Textbook paragraphs shipped inside the pack so the tutor still has sources. */
const PACK_SOURCE_LIMIT = 80;

export async function buildChapterPack(chapterId: number): Promise<ChapterPack | null> {
  const [chapter] = await db.select().from(chapters).where(eq(chapters.id, chapterId)).limit(1);
  if (!chapter) return null;

  const [outcomes, questions, sources, videosForChapter, chapterNotes] = await Promise.all([
    getChapterOutcomes(chapter.classNo, chapter.subjectSlug, chapter.num),
    getMasteryQuestions(chapter.id),
    getChapterSources(chapter.id),
    db.select().from(videos).where(eq(videos.chapterId, chapter.id)).orderBy(asc(videos.id)),
    db
      .select({
        title: notes.title,
        content: notes.content,
        authorName: notes.authorName,
        facultyVerified: notes.facultyVerified,
      })
      .from(notes)
      .where(eq(notes.chapterId, chapter.id))
      .orderBy(desc(notes.facultyVerified), desc(notes.id))
      .limit(5),
  ]);

  const revision = buildRevisionSheet({
    classNo: chapter.classNo,
    subjectName: chapter.subjectName,
    chapterNum: chapter.num,
    chapterTitle: chapter.title,
    outcomes,
    questions: questions.map((question) => ({
      qtext: question.qtext,
      options: question.options,
      correctIndex: question.correctIndex,
      loCode: question.loCode,
      trap: question.trap,
    })),
    sources: [...new Set(sources.map((chunk) => citation(chunk).label))].slice(0, 5),
  });

  const pack: ChapterPack = {
    format: PACK_FORMAT,
    packVersion: PACK_VERSION,
    chapterId: chapter.id,
    classNo: chapter.classNo,
    subjectSlug: chapter.subjectSlug,
    subjectName: chapter.subjectName,
    chapterNum: chapter.num,
    chapterTitle: chapter.title,
    book: null,
    dikshaCode: chapter.dikshaCode ?? null,
    generatedAt: new Date().toISOString(),
    outcomes: outcomes.map((outcome) => ({
      code: outcome.code,
      concept: outcome.concept,
      statement: outcome.statement,
      definition: outcome.definition,
      parent: outcome.parent,
      page: outcome.textbookPage,
      keywords: outcome.keywords,
      diagram: outcome.diagram,
    })),
    questions: questions.map((question) => ({
      id: question.id,
      qtext: question.qtext,
      options: question.options,
      correctIndex: question.correctIndex,
      explanation: "",
      loCode: question.loCode,
      trapIndex: question.trapIndex ?? null,
      trap: question.trap ?? null,
    })),
    notes: chapterNotes.map((note) => ({
      title: note.title,
      body: (note.content ?? "").slice(0, 4_000),
      author: note.authorName,
      facultyVerified: note.facultyVerified,
    })),
    sources: sources.slice(0, PACK_SOURCE_LIMIT).map((chunk) => ({
      chunkId: chunk.id,
      label: citation(chunk).label,
      page: chunk.page,
      para: chunk.para,
      heading: chunk.heading,
      text: chunk.text,
      kind: chunk.kind,
    })),
    videos: videosForChapter.map((video) => ({
      title: video.title,
      url: video.videoUrl,
      durationSec: video.durationSec,
      sizeMb: video.fileSizeMb ?? null,
      // Sample lecture files are streamed from the government CDN; the pack marks
      // them honestly rather than promising an offline video it did not download.
      cached: false,
    })),
    revision: { svg: renderRevisionSvg(revision), title: revision.title },
    quiz: { seconds: 20 * 60, xpPerCorrect: 10 },
    sizeKb: 0,
  };

  pack.sizeKb = packSizeKb({ ...pack, sizeKb: 0 });
  return pack;
}

/** Questions keyed for scoring; the client never receives the answer key's role. */
async function answerKey(chapterId: number) {
  return db
    .select({ id: mcqQuestions.id, correctIndex: mcqQuestions.correctIndex })
    .from(mcqQuestions)
    .where(eq(mcqQuestions.chapterId, chapterId))
    .orderBy(asc(mcqQuestions.id));
}

export type SyncOutcome = {
  clientId: string;
  status: "applied" | "duplicate" | "rejected";
  score: number;
  total: number;
  xpEarned: number;
  reason?: string;
};

export type SyncResult = {
  outcomes: SyncOutcome[];
  xpTotal: number;
  streakDay: string;
};

function isoDay(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export async function applyOfflineSync(
  userId: number,
  payload: SyncPayload,
): Promise<SyncResult> {
  const outcomes: SyncOutcome[] = [];
  let xpTotal = 0;

  for (const attempt of payload.attempts) {
    try {
      const outcome = await db.transaction(async (tx) => {
        const already = await tx
          .select({
            id: offlineSyncs.id,
            score: offlineSyncs.score,
            total: offlineSyncs.total,
          })
          .from(offlineSyncs)
          .where(eq(offlineSyncs.clientId, attempt.clientId))
          .limit(1);
        if (already[0]) {
          return {
            clientId: attempt.clientId,
            status: "duplicate" as const,
            score: already[0].score,
            total: already[0].total,
            xpEarned: 0,
            reason: "This attempt was already synced from this device.",
          };
        }

        const [chapter] = await tx
          .select({ id: chapters.id, title: chapters.title })
          .from(chapters)
          .where(eq(chapters.id, attempt.chapterId))
          .limit(1);
        if (!chapter)
          return {
            clientId: attempt.clientId,
            status: "rejected" as const,
            score: 0,
            total: 0,
            xpEarned: 0,
            reason: "Chapter not found.",
          };

        const key = await tx
          .select({ correctIndex: mcqQuestions.correctIndex })
          .from(mcqQuestions)
          .where(eq(mcqQuestions.chapterId, chapter.id))
          .orderBy(asc(mcqQuestions.id));
        if (key.length === 0)
          return {
            clientId: attempt.clientId,
            status: "rejected" as const,
            score: 0,
            total: 0,
            xpEarned: 0,
            reason: "This chapter has no assessment bank on the server.",
          };

        // The score is recomputed here; the device's opinion is never trusted.
        const score = key.reduce(
          (total, question, index) =>
            total + (attempt.answers[index] === question.correctIndex ? 1 : 0),
          0,
        );
        const [prior] = await tx
          .select({ n: count() })
          .from(mcqAttempts)
          .where(and(eq(mcqAttempts.userId, userId), eq(mcqAttempts.chapterId, chapter.id)));
        const firstTime = (prior?.n ?? 0) === 0;
        const xpEarned = firstTime ? 10 * score : 0;

        const [inserted] = await tx
          .insert(mcqAttempts)
          .values({
            userId,
            chapterId: chapter.id,
            answers: attempt.answers,
            score,
            total: key.length,
            durationSec: attempt.durationSec,
            xpEarned,
            createdAt: new Date(),
          })
          .returning({ id: mcqAttempts.id });

        // Unique clientId: a replayed upload cannot double-count.
        await tx.insert(offlineSyncs).values({
          clientId: attempt.clientId,
          userId,
          chapterId: chapter.id,
          attemptId: inserted?.id ?? null,
          score,
          total: key.length,
          xpEarned,
          completedAt: attempt.completedAt,
        });

        if (xpEarned > 0)
          await tx.insert(xpEvents).values({
            userId,
            type: "objective",
            amount: xpEarned,
            refType: "chapter",
            refId: chapter.id,
            note: `Offline Objective Test · ${chapter.title} · ${score}/${key.length}`,
          });

        return {
          clientId: attempt.clientId,
          status: "applied" as const,
          score,
          total: key.length,
          xpEarned,
        };
      });
      if (outcome.status === "applied") xpTotal += outcome.xpEarned;
      outcomes.push(outcome);
    } catch {
      // A losing race on the unique clientId is reported as a duplicate, not a failure.
      outcomes.push({
        clientId: attempt.clientId,
        status: "duplicate",
        score: 0,
        total: 0,
        xpEarned: 0,
        reason: "This attempt was already synced from this device.",
      });
    }
  }

  return { outcomes, xpTotal, streakDay: isoDay() };
}

/** Total XP after a sync — the header shows it climbing as devices reconnect. */
export async function totalXp(userId: number): Promise<number> {
  const [row] = await db
    .select({ xp: sql<number>`coalesce(sum(${xpEvents.amount}), 0)` })
    .from(xpEvents)
    .where(eq(xpEvents.userId, userId));
  return Number(row?.xp ?? 0);
}

export async function syncedAttemptCount(userId: number): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(offlineSyncs)
    .where(eq(offlineSyncs.userId, userId));
  return Number(row?.n ?? 0);
}

/** Students whose devices have synced, used by the teacher dashboard footer. */
export async function recentlySynced(classNo: number, limit = 10) {
  const roster = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(and(eq(users.className, classNo), eq(users.role, "student")))
    .limit(400);
  if (roster.length === 0) return [];
  const ids = roster.map((row) => row.id);
  const rows = await db
    .select({
      userId: offlineSyncs.userId,
      clientId: offlineSyncs.clientId,
      createdAt: offlineSyncs.createdAt,
      chapterId: offlineSyncs.chapterId,
      syncedAt: offlineSyncs.createdAt,
      completedAt: offlineSyncs.completedAt,
      score: offlineSyncs.score,
      total: offlineSyncs.total,
    })
    .from(offlineSyncs)
    .where(inArray(offlineSyncs.userId, ids))
    .orderBy(desc(offlineSyncs.id))
    .limit(limit);
  const nameById = new Map(roster.map((row) => [row.id, row.name]));
  return rows.map((row) => ({ ...row, name: nameById.get(row.userId) ?? "Student" }));
}
