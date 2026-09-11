import { withDatabase } from "@/lib/database-route";
import { getActiveUser } from "@/lib/session";
import { recordLearningActivity } from "@/lib/analytics/record";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_DRILLS = 50;

/**
 * Beacon for AI study outcomes that only the client can observe: recall
 * drills answered inside the AI Quiz Generator (flashcard-style practice).
 * The server already records AI conversations when they happen; this route
 * records what the student *did* with the generated practice.
 */
async function handlePOST(req: Request) {
  const user = await getActiveUser();
  if (!user) {
    return Response.json({ ok: false, error: "Please log in first." }, { status: 401 });
  }

  let body: { chapterId?: unknown; drills?: unknown; correct?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const chapterId =
    body.chapterId === undefined || body.chapterId === null
      ? null
      : Number(body.chapterId);
  if (chapterId !== null && (!Number.isSafeInteger(chapterId) || chapterId < 1)) {
    return Response.json({ ok: false, error: "Choose a valid chapter." }, { status: 400 });
  }

  const drills = Math.max(0, Math.min(MAX_DRILLS, Math.round(Number(body.drills) || 0)));
  const correct = Math.max(0, Math.min(drills, Math.round(Number(body.correct) || 0)));
  if (drills === 0) {
    return Response.json({ ok: false, error: "Nothing to record." }, { status: 400 });
  }

  await recordLearningActivity({
    userId: user.id,
    chapterId,
    drills,
    drillsCorrect: correct,
  });

  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

export const POST = withDatabase(handlePOST);
