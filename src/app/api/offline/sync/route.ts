import "server-only";
import { withDatabase } from "@/lib/database-route";
import { getActiveUser } from "@/lib/session";
import { SyncError, validateSyncPayload } from "@/lib/offline/pack";
import { applyOfflineSync, totalXp } from "@/lib/offline/server";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Accept quiz results that were taken offline.
 *
 *   POST /api/offline/sync  { attempts: [{ clientId, chapterId, answers,
 *                                         durationSec, completedAt, packVersion }] }
 *
 * The device sends options, never a score: marks are recomputed against the
 * server's answer key and XP follows the same first-attempt rule as the online
 * quiz. Each `clientId` is applied once, so retrying on a bad connection is safe.
 */
async function handlePOST(req: Request) {
  const user = await getActiveUser();
  if (!user) return Response.json({ error: "Sign-in required." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Send JSON." }, { status: 400 });
  }

  try {
    const payload = validateSyncPayload(body);
    if (payload.attempts.length === 0)
      return Response.json(
        { ok: true, outcomes: [], xpTotal: 0, totalXp: await totalXp(user.id) },
        { headers: { "Cache-Control": "no-store" } },
      );
    const result = await applyOfflineSync(user.id, payload);
    return Response.json(
      {
        ok: true,
        ...result,
        totalXp: await totalXp(user.id),
        applied: result.outcomes.filter((outcome) => outcome.status === "applied").length,
        duplicates: result.outcomes.filter((outcome) => outcome.status === "duplicate").length,
        rejected: result.outcomes.filter((outcome) => outcome.status === "rejected").length,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof SyncError)
      return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: "Could not sync offline results." }, { status: 500 });
  }
}

export const POST = withDatabase(handlePOST);
