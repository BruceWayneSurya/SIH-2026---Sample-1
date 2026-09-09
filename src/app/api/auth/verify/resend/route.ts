import { withDatabase } from "@/lib/database-route";
import { resendVerification } from "@/lib/faculty-verification";

async function handlePOST(req: Request) {
  let body: { challengeId?: unknown };
  try {
    body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid body");
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const result = await resendVerification(body.challengeId);
  if (!result.ok)
    return Response.json(
      { error: result.error, retryAfter: result.retryAfter ?? null },
      { status: result.status },
    );

  return Response.json({
    ok: true,
    challengeId: result.challengeId,
    maskedEmail: result.maskedEmail,
    resendAfter: result.resendAfter,
    delivered: result.delivered,
    devCode: result.devCode,
  });
}

export const POST = withDatabase(handlePOST);

export const runtime = "nodejs";
export const maxDuration = 60;
