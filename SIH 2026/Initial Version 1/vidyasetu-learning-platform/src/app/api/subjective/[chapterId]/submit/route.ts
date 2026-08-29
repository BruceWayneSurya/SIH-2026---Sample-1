import { db } from "@/db";
import { chapters, subjectiveAttempts, xpEvents } from "@/db/schema";
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
  let body: { answers?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const answers: Record<string, string> = {};
  if (body.answers && typeof body.answers === "object") {
    for (const [k, v] of Object.entries(body.answers)) {
      answers[String(k)] = String(v ?? "").slice(0, 4000);
    }
  }

  const [chapter] = await db
    .select()
    .from(chapters)
    .where(eq(chapters.id, chapterId))
    .limit(1);
  if (!chapter)
    return Response.json({ error: "Chapter not found." }, { status: 404 });

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

  return Response.json({ ok: true, xpEarned, firstTime });
}
