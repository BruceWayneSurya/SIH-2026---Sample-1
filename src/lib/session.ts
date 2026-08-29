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
 * Writes the session cookie. `Secure` is enabled only when the request actually
 * arrived over HTTPS (preview/proxy sets x-forwarded-proto) so the same code
 * works on plain-http localhost and on the https preview domain.
 */
export async function startSession(
  req: Request,
  user: { id: number; role: "student" | "faculty" },
  maxAgeSec = 60 * 60 * 24 * 14,
): Promise<void> {
  const proto =
    req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  const store = await cookies();
  store.set(SESSION_COOKIE, makeSessionToken(user, maxAgeSec), {
    httpOnly: true,
    sameSite: "lax",
    secure: proto === "https",
    maxAge: maxAgeSec,
    path: "/",
  });
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
