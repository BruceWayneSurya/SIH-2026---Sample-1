import { db } from "@/db";
import {
  chapters,
  users,
  videos,
  notes,
  noteVotes,
  mcqQuestions,
  mcqAttempts,
  subjectiveQuestions,
  subjectiveAttempts,
  xpEvents,
} from "@/db/schema";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";

/* ----------------------------- chapters ----------------------------- */

export async function getChapter(
  classNo: number,
  subjectSlug: string,
  slug: string,
) {
  const rows = await db
    .select()
    .from(chapters)
    .where(
      and(
        eq(chapters.classNo, classNo),
        eq(chapters.subjectSlug, subjectSlug),
        eq(chapters.slug, slug),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export type ChapterListItem = {
  id: number;
  num: number;
  title: string;
  slug: string;
  summary: string | null;
  outcomeIds: string[];
  dikshaCode: string | null;
  videoCount: number;
  noteCount: number;
  mcqCount: number;
  pyqPct: number;
  subjCount: number;
  bestScore: number | null;
  bestTotal: number | null;
};

export async function getChapterList(
  classNo: number,
  subjectSlug: string,
  userId: number | null,
): Promise<ChapterListItem[]> {
  const base = await db
    .select()
    .from(chapters)
    .where(and(eq(chapters.classNo, classNo), eq(chapters.subjectSlug, subjectSlug)))
    .orderBy(asc(chapters.num));

  const ids = base.map((c) => c.id);
  if (ids.length === 0) return [];

  const counts = await Promise.all([
    db
      .select({ chapterId: videos.chapterId, n: count() })
      .from(videos)
      .where(inArray(videos.chapterId, ids))
      .groupBy(videos.chapterId),
    db
      .select({ chapterId: notes.chapterId, n: count() })
      .from(notes)
      .where(inArray(notes.chapterId, ids))
      .groupBy(notes.chapterId),
    db
      .select({
        chapterId: mcqQuestions.chapterId,
        n: count(),
        pyq: sql<number>`sum(case when ${mcqQuestions.isPyq} then 1 else 0 end)`,
      })
      .from(mcqQuestions)
      .where(inArray(mcqQuestions.chapterId, ids))
      .groupBy(mcqQuestions.chapterId),
    db
      .select({ chapterId: subjectiveQuestions.chapterId, n: count() })
      .from(subjectiveQuestions)
      .where(inArray(subjectiveQuestions.chapterId, ids))
      .groupBy(subjectiveQuestions.chapterId),
    userId
      ? db
          .select({
            userId: mcqAttempts.userId,
            chapterId: mcqAttempts.chapterId,
            best: sql<number>`max(${mcqAttempts.score})`,
            total: sql<number>`max(${mcqAttempts.total})`,
          })
          .from(mcqAttempts)
          .where(
            and(
              eq(mcqAttempts.userId, userId),
              inArray(mcqAttempts.chapterId, ids),
            ),
          )
          .groupBy(mcqAttempts.userId, mcqAttempts.chapterId)
      : Promise.resolve([] as { userId: number; chapterId: number; best: number | null; total: number | null }[]),
  ]);

  const [vidMap, noteMap, mcqMap, subjMap, bestMap] = [
    Object.fromEntries(counts[0].map((r) => [r.chapterId, r.n])),
    Object.fromEntries(counts[1].map((r) => [r.chapterId, r.n])),
    Object.fromEntries(counts[2].map((r) => [r.chapterId, r])),
    Object.fromEntries(counts[3].map((r) => [r.chapterId, r.n])),
    Object.fromEntries(
      (counts[4] as { chapterId: number; best: number | null; total: number | null }[]).map(
        (r) => [r.chapterId, r],
      ),
    ),
  ];

  return base.map((c) => {
    const mcq = mcqMap[c.id];
    return {
      id: c.id,
      num: c.num,
      title: c.title,
      slug: c.slug,
      summary: c.summary,
      outcomeIds: c.outcomeIds,
      dikshaCode: c.dikshaCode,
      videoCount: vidMap[c.id] ?? 0,
      noteCount: noteMap[c.id] ?? 0,
      mcqCount: mcq?.n ?? 0,
      pyqPct: mcq && mcq.n > 0 ? Math.round(((Number(mcq.pyq) || 0) / mcq.n) * 100) : 0,
      subjCount: subjMap[c.id] ?? 0,
      bestScore: bestMap[c.id]?.best ?? null,
      bestTotal: bestMap[c.id]?.total ?? null,
    };
  });
}

/* ------------------------------- notes ------------------------------ */

export type RankedNote = {
  id: number;
  title: string;
  content: string | null;
  fileName: string | null;
  fileUrl: string | null;
  fileType: "text" | "pdf" | "image";
  authorName: string;
  authorIsFaculty: boolean;
  facultyVerified: boolean;
  verifiedByName: string | null;
  upvotes: number;
  iVoted: boolean;
  rankScore: number;
  createdAt: string;
};

export async function getRankedNotes(
  chapterId: number,
  userId: number | null,
): Promise<RankedNote[]> {
  const rows = await db
    .select({
      id: notes.id,
      title: notes.title,
      content: notes.content,
      fileName: notes.fileName,
      fileUrl: notes.fileUrl,
      fileType: notes.fileType,
      authorName: notes.authorName,
      authorId: notes.authorId,
      facultyVerified: notes.facultyVerified,
      verifiedByName: notes.verifiedByName,
      createdAt: notes.createdAt,
      upvotes: sql<number>`coalesce(count(${noteVotes.id}), 0)`,
      // SQLite has no bool_or; use MAX over a CASE (1/0 -> treated as boolean below)
      iVoted: sql<number>`coalesce(max(case when ${noteVotes.userId} = ${userId ?? -1} then 1 else 0 end), 0)`,
      rankScore: sql<number>`(coalesce(count(${noteVotes.id}), 0) * 0.7 + case when ${notes.facultyVerified} then 30 else 0 end)`,
    })
    .from(notes)
    .leftJoin(noteVotes, eq(noteVotes.noteId, notes.id))
    .where(eq(notes.chapterId, chapterId))
    .groupBy(notes.id)
    .orderBy(
      desc(
        sql`(coalesce(count(${noteVotes.id}), 0) * 0.7 + case when ${notes.facultyVerified} then 30 else 0 end)`,
      ),
      asc(notes.id),
    );

  const facultyIds = await db.select({ id: users.id }).from(users).where(eq(users.role, "faculty"));
  const fset = new Set(facultyIds.map((f) => f.id));
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    content: r.content,
    fileName: r.fileName,
    fileUrl: r.fileUrl,
    fileType: r.fileType,
    authorName: r.authorName,
    authorIsFaculty: r.authorId !== null && fset.has(r.authorId),
    facultyVerified: r.facultyVerified,
    verifiedByName: r.verifiedByName,
    upvotes: Number(r.upvotes),
    iVoted: Number(r.iVoted) === 1,
    rankScore: Number(r.rankScore),
    createdAt: r.createdAt.toISOString(),
  }));
}

/* ---------------------------- leaderboards --------------------------- */

export type LeaderRow = {
  id: number;
  handle: string;
  name: string;
  school: string | null;
  state: string | null;
  xp: number;
  accuracy: number | null;
  attempts: number;
  badges: string[];
};

async function classStudents(classNo: number) {
  return db
    .select({
      id: users.id,
      handle: users.handle,
      name: users.name,
      school: users.school,
      state: users.state,
    })
    .from(users)
    .where(and(eq(users.className, classNo), eq(users.role, "student")));
}

async function badgeMaps(ids: number[]) {
  const [xp, acc, best, science, contributor, chapSet] = await Promise.all([
    db
      .select({ userId: xpEvents.userId, xp: sql<number>`sum(${xpEvents.amount})` })
      .from(xpEvents)
      .where(inArray(xpEvents.userId, ids))
      .groupBy(xpEvents.userId),
    db
      .select({
        userId: mcqAttempts.userId,
        scored: sql<number>`sum(${mcqAttempts.score})`,
        total: sql<number>`sum(${mcqAttempts.total})`,
        attempts: sql<number>`count(${mcqAttempts.id})`,
      })
      .from(mcqAttempts)
      .where(inArray(mcqAttempts.userId, ids))
      .groupBy(mcqAttempts.userId),
    db
      .select({ userId: mcqAttempts.userId, best: sql<number>`max(${mcqAttempts.score})` })
      .from(mcqAttempts)
      .where(inArray(mcqAttempts.userId, ids))
      .groupBy(mcqAttempts.userId),
    db
      .select({
        userId: mcqAttempts.userId,
        science: sql<number>`sum(${mcqAttempts.score})`,
      })
      .from(mcqAttempts)
      .innerJoin(chapters, eq(mcqAttempts.chapterId, chapters.id))
      .where(and(inArray(mcqAttempts.userId, ids), eq(chapters.subjectSlug, "science")))
      .groupBy(mcqAttempts.userId),
    db
      .select({
        authorId: notes.authorId,
        votes: sql<number>`count(${noteVotes.id})`,
      })
      .from(notes)
      .leftJoin(noteVotes, eq(noteVotes.noteId, notes.id))
      .where(inArray(notes.authorId, ids))
      .groupBy(notes.authorId)
      .having(sql`${sql`count(${noteVotes.id})`} >= 10`),
    db
      .select({ userId: subjectiveAttempts.userId, chapterId: subjectiveAttempts.chapterId })
      .from(subjectiveAttempts)
      .where(inArray(subjectiveAttempts.userId, ids)),
  ]);

  const mcqChap = await db
    .select({ userId: mcqAttempts.userId, chapterId: mcqAttempts.chapterId })
    .from(mcqAttempts)
    .where(inArray(mcqAttempts.userId, ids));

  return { xp, acc, best, science, contributor, chapSet: chapSet.concat(mcqChap) };
}

function buildBadgeList(userId: number, m: Awaited<ReturnType<typeof badgeMaps>>): string[] {
  const acc = m.acc.find((r) => r.userId === userId);
  const best = m.best.find((r) => r.userId === userId);
  const sci = m.science.find((r) => r.userId === userId);
  const isContrib = m.contributor.some((r) => r.authorId === userId);
  const chaptersTouched = new Set(
    m.chapSet.filter((r) => r.userId === userId).map((r) => r.chapterId),
  );
  const out: string[] = [];
  if ((acc?.attempts ?? 0) >= 1) out.push("first_steps");
  if ((best?.best ?? 0) >= 18) out.push("quiz_whiz");
  if ((sci?.science ?? 0) >= 15) out.push("science_scholar");
  if (isContrib) out.push("top_contributor");
  if (chaptersTouched.size >= 3) out.push("multi_chapter");
  return out;
}

export async function getClassLeaderboard(classNo: number): Promise<LeaderRow[]> {
  const students = await classStudents(classNo);
  if (students.length === 0) return [];
  const m = await badgeMaps(students.map((s) => s.id));
  const rows = students.map((s) => {
    const xp = Number(m.xp.find((r) => r.userId === s.id)?.xp ?? 0);
    const acc = m.acc.find((r) => r.userId === s.id);
    const total = Number(acc?.total ?? 0);
    return {
      id: s.id,
      handle: s.handle,
      name: s.name,
      school: s.school,
      state: s.state,
      xp,
      accuracy: total > 0 ? Math.round((Number(acc?.scored ?? 0) / total) * 100) : null,
      attempts: Number(acc?.attempts ?? 0),
      badges: buildBadgeList(s.id, m),
    };
  });
  rows.sort((a, b) => b.xp - a.xp || (b.accuracy ?? 0) - (a.accuracy ?? 0));
  return rows;
}

export type ChapterLeaderRow = {
  id: number;
  handle: string;
  name: string;
  school: string | null;
  chapterXp: number;
  bestScore: number | null;
  bestTotal: number | null;
  attempts: number;
};

export async function getChapterLeaderboard(
  chapterId: number,
): Promise<ChapterLeaderRow[]> {
  const students = await classStudents(
    (await db.select({ classNo: chapters.classNo }).from(chapters).where(eq(chapters.id, chapterId)).limit(1))
      .find((c) => c)?.classNo ?? 8,
  );
  const ids = students.map((s) => s.id);
  if (ids.length === 0) return [];

  const [objRows, subjRows] = await Promise.all([
    db
      .select({
        userId: mcqAttempts.userId,
        xp: sql<number>`sum(${mcqAttempts.xpEarned})`,
        best: sql<number>`max(${mcqAttempts.score})`,
        total: sql<number>`max(${mcqAttempts.total})`,
        attempts: sql<number>`count(${mcqAttempts.id})`,
      })
      .from(mcqAttempts)
      .where(and(inArray(mcqAttempts.userId, ids), eq(mcqAttempts.chapterId, chapterId)))
      .groupBy(mcqAttempts.userId),
    db
      .select({
        userId: subjectiveAttempts.userId,
        xp: sql<number>`sum(${subjectiveAttempts.xpEarned})`,
        attempts: sql<number>`count(${subjectiveAttempts.id})`,
      })
      .from(subjectiveAttempts)
      .where(and(inArray(subjectiveAttempts.userId, ids), eq(subjectiveAttempts.chapterId, chapterId)))
      .groupBy(subjectiveAttempts.userId),
  ]);

  const rows: ChapterLeaderRow[] = students
    .map((s) => {
      const o = objRows.find((r) => r.userId === s.id);
      const sv = subjRows.find((r) => r.userId === s.id);
      const chapterXp = Number(o?.xp ?? 0) + Number(sv?.xp ?? 0);
      return {
        id: s.id,
        handle: s.handle,
        name: s.name,
        school: s.school,
        chapterXp,
        bestScore: o?.best === null || o?.best === undefined ? null : Number(o.best),
        bestTotal: o?.total === null || o?.total === undefined ? null : Number(o.total),
        attempts: Number(o?.attempts ?? 0) + Number(sv?.attempts ?? 0),
      };
    })
    .filter((r) => r.attempts > 0);
  rows.sort((a, b) => b.chapterXp - a.chapterXp || (b.bestScore ?? 0) - (a.bestScore ?? 0));
  return rows;
}

/* ------------------------------ user stats --------------------------- */

export async function getUserStats(userId: number, classNo: number | null) {
  const [xpRows, attemptRows, noteRows, recent] = await Promise.all([
    db
      .select({ xp: sql<number>`coalesce(sum(${xpEvents.amount}), 0)` })
      .from(xpEvents)
      .where(eq(xpEvents.userId, userId)),
    db
      .select({
        scored: sql<number>`coalesce(sum(${mcqAttempts.score}), 0)`,
        total: sql<number>`coalesce(sum(${mcqAttempts.total}), 0)`,
        count: sql<number>`count(${mcqAttempts.id})`,
      })
      .from(mcqAttempts)
      .where(eq(mcqAttempts.userId, userId)),
    db
      .select({ count: count() })
      .from(notes)
      .where(eq(notes.authorId, userId)),
    db
      .select()
      .from(xpEvents)
      .where(eq(xpEvents.userId, userId))
      .orderBy(desc(xpEvents.createdAt), desc(xpEvents.id))
      .limit(8),
  ]);

  const xp = Number(xpRows[0]?.xp ?? 0);
  let rank: number | null = null;
  if (classNo) {
    const board = await getClassLeaderboard(classNo);
    rank = board.findIndex((r) => r.id === userId) + 1 || null;
  }
  const a = attemptRows[0];
  return {
    xp,
    rank,
    accuracy:
      Number(a?.total ?? 0) > 0
        ? Math.round((Number(a?.scored ?? 0) / Number(a.total)) * 100)
        : null,
    objectiveAttempts: Number(a?.count ?? 0),
    notes: noteRows[0]?.count ?? 0,
    recent,
  };
}

export async function getBadgesForUser(userId: number): Promise<string[]> {
  const m = await badgeMaps([userId]);
  return buildBadgeList(userId, m);
}

/* ------------------------------- content ----------------------------- */

export async function getContentForChapter(chapterId: number) {
  const [videoRows, mcqs, subj] = await Promise.all([
    db
      .select()
      .from(videos)
      .where(eq(videos.chapterId, chapterId))
      .orderBy(asc(videos.id)),
    db
      .select()
      .from(mcqQuestions)
      .where(eq(mcqQuestions.chapterId, chapterId))
      .orderBy(asc(mcqQuestions.id)),
    db
      .select()
      .from(subjectiveQuestions)
      .where(eq(subjectiveQuestions.chapterId, chapterId))
      .orderBy(asc(subjectiveQuestions.id)),
  ]);
  return { videos: videoRows, mcqs, subj };
}

export async function getBestAttempt(userId: number, chapterId: number) {
  const rows = await db
    .select()
    .from(mcqAttempts)
    .where(and(eq(mcqAttempts.userId, userId), eq(mcqAttempts.chapterId, chapterId)))
    .orderBy(desc(mcqAttempts.score))
    .limit(1);
  return rows[0] ?? null;
}
