import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import type { Request, Response } from "express";
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
    (req.headers["x-forwarded-proto"] as string | undefined) ??
    (req.protocol || "http");
  return proto === "https";
}

/** Set-Cookie header value that works inside a cross-origin HTTPS preview iframe. */
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

/** Attach the session cookie to an outgoing Express response. */
export function setSessionCookie(
  req: Request,
  res: Response,
  token: string,
  maxAgeSec = 60 * 60 * 24 * 14,
): void {
  res.setHeader("Set-Cookie", sessionSetCookie(req, token, maxAgeSec));
}

/** Read + validate the signed session token from the request cookie. */
export async function getSessionUser(req: Request): Promise<SessionUser | null> {
  try {
    const raw = (req.headers.cookie ?? "")
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${COOKIE}=`));
    if (!raw) return null;
    const token = raw.slice(COOKIE.length + 1);
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
 * Open-access identity: a signed-in user if a session cookie is present,
 * otherwise the seeded guest student. Pages never bounce to a login screen.
 */
export async function getActiveUser(req: Request): Promise<SessionUser | null> {
  const session = await getSessionUser(req);
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
