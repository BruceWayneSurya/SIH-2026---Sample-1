import { withDatabase } from "@/lib/database-route";
import { getActiveUser } from "@/lib/session";
import { getAnalyticsPayload } from "@/lib/analytics/aggregate";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Complete analytics dashboard payload in one round-trip: 365-day sparse
 * activity array, streak statistics, radar dimensions (holistic + per
 * subject), weekly accuracy trajectory, activity distribution and the class
 * percentile. Private to the signed-in student and short-cacheable.
 */
async function handleGET() {
  const user = await getActiveUser();
  if (!user) {
    return Response.json({ ok: false, error: "Please log in first." }, {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  }
  const payload = await getAnalyticsPayload(user);
  return Response.json(payload, {
    headers: { "Cache-Control": "private, max-age=60" },
  });
}

export const GET = withDatabase(handleGET);
