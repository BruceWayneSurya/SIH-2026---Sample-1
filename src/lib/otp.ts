/**
 * One-time codes for faculty email verification.
 *
 * Rules (all enforced server-side, the UI only mirrors them):
 *  • 6 digits, generated with a CSPRNG, stored only as an HMAC digest.
 *  • Valid for 10 minutes, maximum 5 wrong attempts, then it dies.
 *  • Resend is throttled to one per 60s and five per rolling hour.
 *  • The challenge id handed to the browser is a signed token, so a code can
 *    never be replayed against somebody else's challenge.
 */
import { randomInt } from "node:crypto";
import { hmac, portalSecret, safeEqual } from "./secret";

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const RESEND_COOLDOWN_MS = 60 * 1000;
export const MAX_SENDS_PER_HOUR = 5;
export const SEND_WINDOW_MS = 60 * 60 * 1000;

export type OtpPurpose = "login" | "register" | "reverify";

export function generateOtp(length = OTP_LENGTH): string {
  return String(randomInt(0, 10 ** length)).padStart(length, "0");
}

export function normalizeCode(value: unknown): string {
  return typeof value === "string" ? value.replace(/\D/g, "").slice(0, 12) : "";
}

/** Digest of the code bound to the address it was issued for. */
export function hashOtp(
  code: string,
  email: string,
  secret = portalSecret(),
): string {
  return hmac(`${email}::${code}`, secret);
}

export function otpMatches(
  code: string,
  digest: string,
  email: string,
  secret = portalSecret(),
): boolean {
  return safeEqual(hashOtp(code, email, secret), digest);
}

export function otpExpiry(now = Date.now()): number {
  return now + OTP_TTL_MS;
}

export type ChallengeState = {
  attempts: number;
  sends: number;
  lastSentAt: number | null;
  expiresAt: number;
  consumedAt: number | null;
};

export type OtpDecision =
  | { ok: true }
  | { ok: false; reason: "expired" | "consumed" | "locked" | "cooldown" | "limit"; retryAfterMs?: number };

/** Can another code be sent right now? */
export function canSend(
  state: ChallengeState,
  now = Date.now(),
): OtpDecision {
  if (state.consumedAt !== null) return { ok: false, reason: "consumed" };
  if (state.expiresAt <= now) return { ok: false, reason: "expired" };
  if (state.lastSentAt !== null) {
    const wait = state.lastSentAt + RESEND_COOLDOWN_MS - now;
    if (wait > 0)
      return { ok: false, reason: "cooldown", retryAfterMs: wait };
  }
  if (state.sends >= MAX_SENDS_PER_HOUR)
    return { ok: false, reason: "limit", retryAfterMs: SEND_WINDOW_MS };
  return { ok: true };
}

/** Can the submitted code still be checked against this challenge? */
export function canSubmit(
  state: ChallengeState,
  now = Date.now(),
): OtpDecision {
  if (state.consumedAt !== null) return { ok: false, reason: "consumed" };
  if (state.expiresAt <= now) return { ok: false, reason: "expired" };
  if (state.attempts >= OTP_MAX_ATTEMPTS)
    return { ok: false, reason: "locked", retryAfterMs: OTP_TTL_MS };
  return { ok: true };
}

export function describeDecision(decision: OtpDecision): string {
  if (decision.ok) return "";
  switch (decision.reason) {
    case "expired":
      return "This verification code has expired. Please request a new one.";
    case "consumed":
      return "This verification code has already been used.";
    case "locked":
      return "Too many incorrect attempts. Please request a new code.";
    case "cooldown": {
      const seconds = Math.max(
        1,
        Math.ceil((decision.retryAfterMs ?? RESEND_COOLDOWN_MS) / 1000),
      );
      return `Please wait ${seconds} second${seconds === 1 ? "" : "s"} before requesting another code.`;
    }
    case "limit":
      return "Verification limit reached for this address. Please try again in an hour.";
  }
}

/* ------------------------- signed challenge token ------------------------- */

export type ChallengePayload = { id: number; email: string; expiresAt: number };

export function signChallenge(
  payload: ChallengePayload,
  secret = portalSecret(),
): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${hmac(body, secret)}`;
}

/** Null when the token is malformed, forged or expired. */
export function openChallenge(
  token: unknown,
  now = Date.now(),
  secret = portalSecret(),
): ChallengePayload | null {
  if (typeof token !== "string") return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  if (!safeEqual(hmac(body, secret), signature)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as Partial<ChallengePayload>;
    if (
      !Number.isSafeInteger(payload?.id) ||
      typeof payload?.email !== "string" ||
      !Number.isFinite(payload?.expiresAt) ||
      (payload.expiresAt as number) <= now
    )
      return null;
    return {
      id: payload.id as number,
      email: payload.email as string,
      expiresAt: payload.expiresAt as number,
    };
  } catch {
    return null;
  }
}

/** Seconds of cooldown still owed to the user, for the resend button. */
export function resendCountdown(
  lastSentAt: number | null,
  now = Date.now(),
): number {
  if (lastSentAt === null) return 0;
  return Math.max(0, Math.ceil((lastSentAt + RESEND_COOLDOWN_MS - now) / 1000));
}
