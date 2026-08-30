import { Router } from "express";
import { db } from "../db";
import { chapters, subjectiveAttempts, xpEvents } from "../db/schema";
import { and, count, eq } from "drizzle-orm";
import { getActiveUser } from "../auth/session";

const router = Router();

/** POST /api/subjective/:chapterId/submit */
router.post("/:chapterId/submit", async (req, res) => {
  const user = await getActiveUser(req);
  if (!user) return res.status(401).json({ error: "Please log in first." });

  const chapterId = Number(req.params.chapterId);
  const body = req.body ?? {};
  const answers: Record<string, string> = {};
  if (body.answers && typeof body.answers === "object") {
    for (const [k, v] of Object.entries(body.answers as Record<string, unknown>)) {
      answers[String(k)] = String(v ?? "").slice(0, 4000);
    }
  }

  const [chapter] = await db
    .select()
    .from(chapters)
    .where(eq(chapters.id, chapterId))
    .limit(1);
  if (!chapter) return res.status(404).json({ error: "Chapter not found." });

  const [prior] = await db
    .select({ n: count() })
    .from(subjectiveAttempts)
    .where(
      and(eq(subjectiveAttempts.userId, user.id), eq(subjectiveAttempts.chapterId, chapterId)),
    );
  const firstTime = (prior.n ?? 0) === 0;
  const xpEarned = firstTime ? 30 : 0;

  await db.insert(subjectiveAttempts).values({
    userId: user.id,
    chapterId,
    answers,
    xpEarned,
  });
  if (xpEarned > 0) {
    await db.insert(xpEvents).values({
      userId: user.id,
      type: "subjective",
      amount: xpEarned,
      refType: "chapter",
      refId: chapterId,
      note: `Subjective Practice · ${chapter.title}`,
    });
  }

  return res.json({ ok: true, xpEarned, firstTime });
});

export default router;
