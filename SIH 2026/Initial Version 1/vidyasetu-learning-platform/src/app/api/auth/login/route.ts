import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirectTo, startSession, verifyPassword } from "@/lib/session";

const INVALID = "Invalid email or password. Try a demo account below.";

type Creds = { email: string; password: string };

/**
 * Accepts both fetch()-style JSON and classic (no-JS) form submissions, so
 * the form's `action`/`method` fallback can sign users in even when client
 * JavaScript fails to load (e.g. blocked by a preview proxy).
 */
async function readCredentials(req: Request): Promise<Creds | null> {
  const ct = (req.headers.get("content-type") ?? "").toLowerCase();
  if (ct.includes("application/json")) {
    try {
      const body: { email?: unknown; password?: unknown } = await req.json();
      return {
        email: typeof body.email === "string" ? body.email.trim().toLowerCase() : "",
        password: typeof body.password === "string" ? body.password : "",
      };
    } catch {
      return null;
    }
  }
  if (
    ct.includes("application/x-www-form-urlencoded") ||
    ct.includes("multipart/form-data")
  ) {
    const fd = await req.formData().catch(() => null);
    if (!fd) return null;
    return {
      email: String(fd.get("email") ?? "").trim().toLowerCase(),
      password: String(fd.get("password") ?? ""),
    };
  }
  return null;
}

export async function POST(req: Request) {
  // Browsers navigating a real form send `Accept: text/html`; fetch() sends */*
  const wantsPage = (req.headers.get("accept") ?? "").includes("text/html");

  const creds = await readCredentials(req);
  if (!creds) {
    return wantsPage
      ? redirectTo("/?error=invalid")
      : Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { email, password } = creds;

  if (!email || !password) {
    return wantsPage
      ? redirectTo("/?error=invalid")
      : Response.json(
          { error: "Please enter both your email and password." },
          { status: 400 },
        );
  }

  let user;
  try {
    [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  } catch {
    return wantsPage
      ? redirectTo("/?error=invalid")
      : Response.json(
          { error: "Could not reach the portal database. Please try again." },
          { status: 503 },
        );
  }

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return wantsPage
      ? redirectTo("/?error=invalid")
      : Response.json({ error: INVALID }, { status: 401 });
  }

  await startSession(req, { id: user.id, role: user.role });

  // Classic form submissions get a plain redirect (cookie rides along);
  // fetch() clients get JSON with a relative path — absolute redirects built
  // from req.url would point at the internal origin and break behind a proxy.
  if (wantsPage) return redirectTo("/home");
  return Response.json({
    ok: true,
    redirect: "/home",
    user: { name: user.name, role: user.role },
  });
}
