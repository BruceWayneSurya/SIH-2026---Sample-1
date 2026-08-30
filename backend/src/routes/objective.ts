import { Router } from "express";
import { db } from "../db";
import { chapters, mcqAttempts, mcqQuestions, xpEvents } from "../db/schema";
import { and, count, eq } from "drizzle-orm";
import { getActiveUser } from "../auth/session";

const router = Router();

/** POST /api/objective/:chapterId/submit */
router.post("/:chapterId/submit", async (req, res) => {
  const user = await getActiveUser(req);
  if (!user) return res.status(401).json({ error: "Please log in first." });

  const chapterId = Number(req.params.chapterId);
  const body = req.body ?? {};
  const answers = Array.isArray(body.answers) ? body.answers : [];
  const durationSec = Math.max(0, Math.min(7200, Number(body.durationSec) || 0));

  const [chapter] = await db
    .select()
    .from(chapters)
    .where(eq(chapters.id, chapterId))
    .limit(1);
  if (!chapter) return res.status(404).json({ error: "Chapter not found." });

  const questions = await db
    .select()
    .from(mcqQuestions)
    .where(eq(mcqQuestions.chapterId, chapterId))
    .orderBy(mcqQuestions.id);
  if (questions.length === 0)
    return res.status(400).json({ error: "No questions for this chapter." });

  const score = questions.reduce(
    (acc, q, i) => acc + (Number(answers[i]) === q.correctIndex ? 1 : 0),
    0,
  );

  const [prior] = await db
    .select({ n: count() })
    .from(mcqAttempts)
    .where(and(eq(mcqAttempts.userId, user.id), eq(mcqAttempts.chapterId, chapterId)));
  const firstTime = (prior.n ?? 0) === 0;
  const xpEarned = firstTime ? 10 * score : 0;

  await db.insert(mcqAttempts).values({
    userId: user.id,
    chapterId,
    answers,
    score,
    total: questions.length,
    durationSec,
    xpEarned,
  });
  if (xpEarned > 0) {
    await db.insert(xpEvents).values({
      userId: user.id,
      type: "objective",
      amount: xpEarned,
      refType: "chapter",
      refId: chapterId,
      note: `Objective Test · ${chapter.title} · ${score}/${questions.length}`,
    });
  }

  return res.json({
    ok: true,
    score,
    total: questions.length,
    xpEarned,
    firstTime,
  });
});

export default router;
