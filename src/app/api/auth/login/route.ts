import { withDatabase } from "@/lib/database-route";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { startSession, verifyPassword } from "@/lib/session";
import { startVerification } from "@/lib/faculty-verification";

import { DEMO_EMAIL_ALIASES } from "@/lib/demo-accounts";

const INVALID = "Invalid email or password. Try a demo account below.";

async function handlePOST(req: Request) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid body");
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password)
    return Response.json(
      { error: "Please enter both your email and password." },
      { status: 400 },
    );

  let user;
  try {
    [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user && DEMO_EMAIL_ALIASES[email]) {
      [user] = await db.select().from(users).where(eq(users.email, DEMO_EMAIL_ALIASES[email])).limit(1);
    }
  } catch {
    return Response.json(
      { error: "Could not reach the portal database. Please try again." },
      { status: 503 },
    );
  }

  if (!user || !verifyPassword(password, user.passwordHash))
    return Response.json({ error: INVALID }, { status: 401 });

  // Faculty must prove they own the mailbox before a session is issued.
  if (user.role === "faculty" && !user.emailVerified) {
    const challenge = await startVerification(
      { id: user.id, email: user.email, name: user.name },
      "login",
    );
    if (!challenge.ok)
      return Response.json({ error: challenge.error }, { status: challenge.status });
    return Response.json({
      ok: false,
      requiresVerification: true,
      role: user.role,
      name: user.name,
      challengeId: challenge.challengeId,
      maskedEmail: challenge.maskedEmail,
      resendAfter: challenge.resendAfter,
      delivered: challenge.delivered,
      devCode: challenge.devCode,
    });
  }

  await startSession(req, { id: user.id, role: user.role });

  // Return a relative path; the client navigates. Absolute redirects built from
  // req.url would point at the internal origin and break behind a proxy.
  return Response.json({
    ok: true,
    redirect: "/home",
    user: {
      name: user.name,
      role: user.role,
      verificationStatus: user.verificationStatus,
    },
  });
}

export const POST = withDatabase(handlePOST);

export const runtime = "nodejs";
export const maxDuration = 60;
