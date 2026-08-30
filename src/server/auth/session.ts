import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

const SECRET = process.env.SESSION_SECRET ?? "pragyan-sih-demo-secret";
const COOKIE = "vs_session";
const OPEN_GUEST_EMAIL = "guest.student@pragyan.gov.in";

export type SessionUser = {
  id: number;
  handle: string;
  name: string;
  email: string;
  role: "student" | "faculty";
  className: number | null;
  state: string | null;
  school: string | null;
  subjectSpecialization: string | null;
  institutionId: string | null;
  isGuest: boolean;
};

type UserRow = typeof users.$inferSelect;

function asSessionUser(u: UserRow, forceGuest = false): SessionUser {
  return {
    id: u.id,
    handle: u.handle,
    name: u.name,
    email: u.email,
    role: u.role,
    className: u.className,
    state: u.state,
    school: u.school,
    subjectSpecialization: u.subjectSpecialization,
    institutionId: u.institutionId,
    isGuest: forceGuest || u.isGuest,
  };
}

export { hashPassword, verifyPassword } from "./password";

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function makeSessionToken(
  user: { id: number; role: "student" | "faculty" },
  maxAgeSec = 60 * 60 * 24 * 14,
): string {
  const exp = Date.now() + maxAgeSec * 1000;
  const body = Buffer.from(
    JSON.stringify({ u: user.id, r: user.role, e: exp }),
  ).toString("base64url");
  return `${body}.${sign(body)}`;
}

function isHttps(req: Request): boolean {
  const proto =
    req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  return proto === "https";
}

/** Cookie header that works inside a cross-origin HTTPS preview iframe. */
export function sessionSetCookie(req: Request, token: string, maxAgeSec: number): string {
  const https = isHttps(req);
  const parts = [
    `${COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    `Max-Age=${maxAgeSec}`,
    https ? "Secure" : null,
    https ? "SameSite=None" : "SameSite=Lax",
  ].filter(Boolean);
  return parts.join("; ");
}

/**
 * Writes the session cookie. Prefer attaching Set-Cookie on the Response
 * (see `redirectWithSession`) — `cookies().set` can throw in some proxy
 * request contexts and then the whole guest sign-in aborts.
 */
export async function startSession(
  req: Request,
  user: { id: number; role: "student" | "faculty" },
  maxAgeSec = 60 * 60 * 24 * 14,
): Promise<void> {
  const https = isHttps(req);
  const store = await cookies();
  store.set(SESSION_COOKIE, makeSessionToken(user, maxAgeSec), {
    httpOnly: true,
    sameSite: https ? "none" : "lax",
    secure: https,
    maxAge: maxAgeSec,
    path: "/",
  });
}

export function redirectWithSession(
  req: Request,
  path: string,
  user: { id: number; role: "student" | "faculty" },
  maxAgeSec = 60 * 60 * 24 * 14,
): Response {
  const token = makeSessionToken(user, maxAgeSec);
  return new Response(null, {
    status: 303,
    headers: {
      Location: path,
      "Set-Cookie": sessionSetCookie(req, token, maxAgeSec),
    },
  });
}

export async function endSession(): Promise<void> {
  try {
    const store = await cookies();
    store.delete(SESSION_COOKIE);
  } catch {
    // ignore
  }
}

/**
 * Relative redirect. Building an absolute URL from `req.url` leaks the internal
 * origin (e.g. http://0.0.0.0:3000) and breaks the browser when the app is
 * served through a proxy, so we emit a relative Location header instead.
 */
export function redirectTo(path: string): Response {
  return new Response(null, { status: 303, headers: { Location: path } });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const store = await cookies();
    const token = store.get(COOKIE)?.value;
    if (!token) return null;
    const [body, sig] = token.split(".");
    if (!body || !sig || sign(body) !== sig) return null;
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof data?.u !== "number" || data.e < Date.now()) return null;
    const rows = await db.select().from(users).where(eq(users.id, data.u)).limit(1);
    const u = rows[0];
    return u ? asSessionUser(u) : null;
  } catch {
    return null;
  }
}

/**
 * Open-access identity: a signed-in user if a cookie is present, otherwise the
 * seeded guest student. Pages never bounce to a login screen.
 */
export async function getActiveUser(): Promise<SessionUser | null> {
  const session = await getSessionUser();
  if (session) return session;

  const lookup = async () => {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, OPEN_GUEST_EMAIL))
      .limit(1);
    return rows[0] ? asSessionUser(rows[0], true) : null;
  };

  try {
    const hit = await lookup();
    if (hit) return hit;
  } catch {
    // DB may still be booting — fall through to ensure + retry.
  }

  try {
    const { ensureDemoDatabase } = await import("../db/ensure-db");
    await ensureDemoDatabase();
    return await lookup();
  } catch (err) {
    console.error("[session] guest lookup failed", err);
    return null;
  }
}

export function handleFromName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 16);
  return `${base || "user"}_${Math.random().toString(36).slice(2, 6)}`;
}

export const SESSION_COOKIE = COOKIE;
