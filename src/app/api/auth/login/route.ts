import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { startSession, verifyPassword } from "@/server/auth/session";

const INVALID = "Invalid email or password. Try a demo account below.";

export async function POST(req: Request) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await req.json();
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
  } catch {
    return Response.json(
      { error: "Could not reach the portal database. Please try again." },
      { status: 503 },
    );
  }

  if (!user || !verifyPassword(password, user.passwordHash))
    return Response.json({ error: INVALID }, { status: 401 });

  await startSession(req, { id: user.id, role: user.role });

  // Return a relative path; the client navigates. Absolute redirects built from
  // req.url would point at the internal origin and break behind a proxy.
  return Response.json({
    ok: true,
    redirect: "/home",
    user: { name: user.name, role: user.role },
  });
}
