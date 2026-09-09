import { withDatabase } from "@/lib/database-route";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { startSession } from "@/lib/session";
import { confirmVerification } from "@/lib/faculty-verification";

const NOTICE: Record<string, string> = {
  verified:
    "Email verified. Your faculty account is fully active, including note moderation.",
  pending_review:
    "Email verified. Your mailbox is confirmed; a verified reviewer will confirm your institution before note moderation is unlocked.",
  rejected:
    "Your earlier institutional claim was rejected. Contact the portal helpdesk to re-apply.",
  unverified: "Email verified.",
};

async function handlePOST(req: Request) {
  let body: { challengeId?: unknown; code?: unknown };
  try {
    body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid body");
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const result = await confirmVerification(body.challengeId, body.code);
  if (!result.ok)
    return Response.json(
      { error: result.error, retryAfter: result.retryAfter ?? null },
      { status: result.status },
    );

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, result.userId))
    .limit(1);
  if (!user)
    return Response.json({ error: "Account not found." }, { status: 404 });

  await startSession(req, { id: user.id, role: user.role });
  return Response.json({
    ok: true,
    redirect: "/home",
    status: result.status,
    notice: NOTICE[result.status] ?? NOTICE.unverified,
    user: {
      name: user.name,
      role: user.role,
      verificationStatus: result.status,
    },
  });
}

export const POST = withDatabase(handlePOST);

export const runtime = "nodejs";
export const maxDuration = 60;
