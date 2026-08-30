import { Router } from "express";
import { db } from "../db";
import { chapters, mcqAttempts, notes, xpEvents } from "../db/schema";
import { eq, desc, inArray, sql } from "drizzle-orm";
import { getActiveUser } from "../auth/session";
import { SUBJECTS } from "../shared/curriculum";
import {
  getChapter,
  getChapterList,
  getContentForChapter,
  getRankedNotes,
  getBestAttempt,
  getChapterLeaderboard,
  getClassLeaderboard,
  getUserStats,
  getBadgesForUser,
} from "../data/queries";

const router = Router();

async function xpFor(userId: number): Promise<number> {
  const [row] = await db
    .select({ x: sql<number>`coalesce(sum(${xpEvents.amount}), 0)` })
    .from(xpEvents)
    .where(eq(xpEvents.userId, userId));
  return Number(row?.x ?? 0);
}

/** GET /api/me — current user + total XP (used by the portal header). */
router.get("/me", async (req, res) => {
  const user = await getActiveUser(req);
  if (!user) return res.status(401).json({ error: "No session" });
  const xp = await xpFor(user.id);
  return res.json({ user, xp });
});

/** GET /api/account — user profile, stats and earned badges. */
router.get("/account", async (req, res) => {
  const user = await getActiveUser(req);
  if (!user) return res.status(401).json({ error: "No session" });
  const [stats, badges] = await Promise.all([
    getUserStats(user.id, user.className),
    getBadgesForUser(user.id),
  ]);
  return res.json({ user, stats, badges });
});

/** GET /api/home — dashboard data for the active user. */
router.get("/home", async (req, res) => {
  const user = await getActiveUser(req);
  if (!user) return res.status(401).json({ error: "No session" });

  const classNo = user.className ?? 8;
  const stats = await getUserStats(user.id, classNo);

  const subjectData: {
    slug: string;
    name: string;
    total: number;
    practiced: number;
    testable: number;
  }[] = [];
  const testableChapters: {
    key: string;
    href: string;
    subject: string;
    label: string;
    best: string | null;
  }[] = [];

  for (const s of SUBJECTS) {
    const list = await getChapterList(classNo, s.slug, user.id);
    const practiced = list.filter((c) => c.bestScore !== null).length;
    const testable = list.filter((c) => c.mcqCount > 0 || c.subjCount > 0).length;
    subjectData.push({ slug: s.slug, name: s.name, total: list.length, practiced, testable });
    for (const c of list) {
      if (c.mcqCount > 0) {
        testableChapters.push({
          key: `${classNo}-${s.slug}-${c.num}`,
          href: `/class/${classNo}/${s.slug}/${c.slug}`,
          subject: s.name,
          label: `Ch ${c.num}: ${c.title}`,
          best: c.bestScore !== null ? `${c.bestScore}/${c.bestTotal}` : null,
        });
      }
    }
  }

  let facultyQueue: { id: number; title: string; chapter: string; author: string }[] = [];
  if (user.role === "faculty") {
    const pending = await db
      .select({
        id: notes.id,
        title: notes.title,
        authorName: notes.authorName,
        chapterTitle: chapters.title,
        classNo: chapters.classNo,
      })
      .from(notes)
      .innerJoin(chapters, eq(notes.chapterId, chapters.id))
      .where(eq(notes.facultyVerified, false))
      .orderBy(desc(notes.id))
      .limit(5);
    facultyQueue = pending.map((p) => ({
      id: p.id,
      title: p.title,
      author: p.authorName,
      chapter: `Class ${p.classNo} · ${p.chapterTitle}`,
    }));
  }

  return res.json({ user, stats, subjects: subjectData, testableChapters, facultyQueue });
});

/** GET /api/chapters?class=8&subject=science — chapter list for a subject. */
router.get("/chapters", async (req, res) => {
  const user = await getActiveUser(req);
  if (!user) return res.status(401).json({ error: "No session" });
  const classNo = Number(req.query.class) || user.className || 8;
  const subject = typeof req.query.subject === "string" ? req.query.subject : "";
  const list = await getChapterList(classNo, subject, user.id);
  return res.json({ list });
});

/** GET /api/faculty-queue — notes awaiting faculty review. */
router.get("/faculty-queue", async (req, res) => {
  const user = await getActiveUser(req);
  if (!user) return res.status(401).json({ error: "No session" });
  if (user.role !== "faculty")
    return res.status(403).json({ error: "Faculty only" });
  const pending = await db
    .select({
      id: notes.id,
      title: notes.title,
      authorName: notes.authorName,
      chapterTitle: chapters.title,
      classNo: chapters.classNo,
    })
    .from(notes)
    .innerJoin(chapters, eq(notes.chapterId, chapters.id))
    .where(eq(notes.facultyVerified, false))
    .orderBy(desc(notes.id))
    .limit(10);
  return res.json({
    queue: pending.map((p) => ({
      id: p.id,
      title: p.title,
      author: p.authorName,
      chapter: `Class ${p.classNo} · ${p.chapterTitle}`,
    })),
  });
});

/** GET /api/chapter/:classNo/:subject/:slug — full chapter payload. */
router.get("/chapter/:classNo/:subject/:slug", async (req, res) => {
  const user = await getActiveUser(req);
  if (!user) return res.status(401).json({ error: "No session" });
  const classNo = Number(req.params.classNo);
  const subject = String(req.params.subject);
  const slug = String(req.params.slug);

  const ch = await getChapter(classNo, subject, slug);
  if (!ch) return res.status(404).json({ error: "Chapter not found" });

  const { videos, mcqs, subj } = await getContentForChapter(ch.id);
  const notesList = await getRankedNotes(ch.id, user.id);
  const best = await getBestAttempt(user.id, ch.id);
  const top = (await getChapterLeaderboard(ch.id)).slice(0, 5);
  const pyqCount = mcqs.filter((m) => m.isPyq).length;
  const pyqPct = mcqs.length ? Math.round((pyqCount / mcqs.length) * 100) : 0;

  return res.json({
    user,
    chapter: {
      id: ch.id,
      num: ch.num,
      title: ch.title,
      slug: ch.slug,
      outcomeIds: ch.outcomeIds,
      dikshaCode: ch.dikshaCode,
      summary: ch.summary,
    },
    videos: videos.map((v) => ({
      id: v.id,
      title: v.title,
      kind: v.kind,
      videoUrl: v.videoUrl,
      durationSec: v.durationSec,
      fileSizeMb: v.fileSizeMb,
      markers: v.markers ?? [],
      slidesUrl: v.slidesUrl,
      slidesTitle: v.slidesTitle,
      uploadedByName: v.uploadedByName,
    })),
    mcqs: mcqs.map((m) => ({
      id: m.id,
      qtext: m.qtext,
      options: m.options ?? [],
      correctIndex: m.correctIndex,
      explanation: m.explanation,
      isPyq: m.isPyq,
      pyqTag: m.pyqTag,
    })),
    subj: subj.map((q) => ({
      id: q.id,
      qtext: q.qtext,
      marks: q.marks as 2 | 3 | 5,
      rubric: q.rubric ?? [],
      modelAnswer: q.modelAnswer,
    })),
    notes: notesList,
    best: best ? { score: best.score, total: best.total, xpEarned: best.xpEarned } : null,
    top,
    pyqCount,
    pyqPct,
  });
});

/** GET /api/leaderboard?class=8&chapter=3 — class + optional chapter boards. */
router.get("/leaderboard", async (req, res) => {
  const user = await getActiveUser(req);
  if (!user) return res.status(401).json({ error: "No session" });

  const classParam = String(req.query.class ?? "");
  const classNo =
    classParam === "7" || classParam === "8"
      ? Number(classParam)
      : user.className ?? 8;

  const board = await getClassLeaderboard(classNo);

  const chapterOpts = await db
    .select({
      id: chapters.id,
      title: chapters.title,
      subjectName: chapters.subjectName,
      num: chapters.num,
    })
    .from(mcqAttempts)
    .innerJoin(chapters, eq(mcqAttempts.chapterId, chapters.id))
    .where(inArray(chapters.classNo, [classNo]))
    .orderBy(chapters.num);
  const seen = new Set<number>();
  const opts = chapterOpts.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));

  const chapterParam = typeof req.query.chapter === "string" ? req.query.chapter : "";
  const chapterId = chapterParam ? Number(chapterParam) : null;
  let chapter: { board: Awaited<ReturnType<typeof getChapterLeaderboard>>; meta: unknown } | null = null;
  if (chapterId && !Number.isNaN(chapterId)) {
    const chapterBoard = await getChapterLeaderboard(chapterId);
    const meta =
      opts.find((o) => o.id === chapterId) ??
      (await db.select().from(chapters).where(eq(chapters.id, chapterId)).limit(1))[0] ??
      null;
    chapter = { board: chapterBoard, meta };
  }

  const myRank = board.findIndex((r) => r.id === user.id) + 1;
  return res.json({ user, classNo, myRank, board, opts, chapter });
});

export default router;
