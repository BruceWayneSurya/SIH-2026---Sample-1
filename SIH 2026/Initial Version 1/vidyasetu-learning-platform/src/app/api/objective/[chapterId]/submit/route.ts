import { db } from "@/db";
import { chapters, mcqAttempts, mcqQuestions, xpEvents } from "@/db/schema";
import { and, count, eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ chapterId: string }> },
) {
  const user = await getSessionUser();
  if (!user)
    return Response.json({ error: "Please log in first." }, { status: 401 });

  const { chapterId: chParam } = await ctx.params;
  const chapterId = Number(chParam);
  let body: { answers?: number[]; durationSec?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const answers = Array.isArray(body.answers) ? body.answers : [];
  const durationSec = Math.max(0, Math.min(7200, Number(body.durationSec) || 0));

  const [chapter] = await db
    .select()
    .from(chapters)
    .where(eq(chapters.id, chapterId))
    .limit(1);
  if (!chapter)
    return Response.json({ error: "Chapter not found." }, { status: 404 });

  const questions = await db
    .select()
    .from(mcqQuestions)
    .where(eq(mcqQuestions.chapterId, chapterId))
    .orderBy(mcqQuestions.id);
  if (questions.length === 0)
    return Response.json({ error: "No questions for this chapter." }, { status: 400 });

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

  return Response.json({
    ok: true,
    score,
    total: questions.length,
    xpEarned,
    firstTime,
  });
}
