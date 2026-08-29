import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

const SECRET = process.env.SESSION_SECRET ?? "vidyasetu-sih-demo-secret";
const COOKIE = "vs_session";

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

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const check = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return check.length === expected.length && timingSafeEqual(check, expected);
}

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

/**
 * Writes the session cookie.
 *
 * The app is normally reached through an HTTPS reverse proxy (e.g. the live
 * preview at https://<port>-<sandbox>.e2b.app) where the request the server
 * actually sees may still be plain http. In that case the cookie is marked
 * `Secure` + `SameSite=None` + `Partitioned` (CHIPS), so modern browsers
 * accept and send it even when the app is embedded in a cross-origin iframe —
 * the classic cause of "login succeeds but I land back on the login page"
 * inside preview environments.
 */
export async function startSession(
  req: Request,
  user: { id: number; role: "student" | "faculty" },
  maxAgeSec = 60 * 60 * 24 * 14,
): Promise<void> {
  const isHttps = requestIsHttps(req);
  const store = await cookies();
  store.set(SESSION_COOKIE, makeSessionToken(user, maxAgeSec), {
    httpOnly: true,
    // `none` is required for the cookie to be sent inside cross-origin
    // iframes (paired with Secure + Partitioned below); plain-http
    // localhost keeps `lax` so local `npm run dev` keeps working.
    sameSite: isHttps ? "none" : "lax",
    secure: isHttps,
    partitioned: isHttps,
    maxAge: maxAgeSec,
    path: "/",
  });
}

function requestIsHttps(req: Request): boolean {
  const fwd = req.headers.get("x-forwarded-proto");
  if (fwd) return fwd.split(",")[0]?.trim() === "https";
  try {
    const url = new URL(req.url);
    if (url.protocol === "https:") return true;
    const host = (req.headers.get("x-forwarded-host") ?? url.host).toLowerCase();
    // Public preview gateways terminate TLS in front of us; treat their
    // hosts as HTTPS so the session cookie survives in the browser.
    if (host.includes(".e2b.app")) return true;
  } catch {
    // ignore malformed request URLs
  }
  return false;
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
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
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig || sign(body) !== sig) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof data?.u !== "number" || data.e < Date.now()) return null;
    const rows = await db.select().from(users).where(eq(users.id, data.u)).limit(1);
    const u = rows[0];
    if (!u) return null;
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
      isGuest: u.isGuest,
    };
  } catch {
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
