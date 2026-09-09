/**
 * Faculty email verification service — the server-side half of the flow.
 *
 *   sign in / register  →  startVerification()  →  OTP by mail
 *   user types the code →  confirmVerification() → account marked verified
 *
 * Everything the browser receives is either a masked address or a signed
 * challenge token; the code itself never leaves the mailbox (except in a
 * local build with no mail provider, where it is echoed for the demo).
 */
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { emailVerifications, users } from "@/db/schema";
import {
  assessFacultyEmail,
  emailDomain,
  emailTrust,
  maskEmail,
  type VerificationStatus,
} from "./faculty-email";
import {
  canSend,
  canSubmit,
  describeDecision,
  generateOtp,
  hashOtp,
  normalizeCode,
  openChallenge,
  otpExpiry,
  otpMatches,
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MS,
  resendCountdown,
  signChallenge,
  type OtpPurpose,
} from "./otp";
import { getMailConfig, sendMail, verificationMail } from "./mail";

export type ChallengeIssued = {
  ok: true;
  challengeId: string;
  maskedEmail: string;
  resendAfter: number;
  delivered: boolean;
  /** Present only when no mail provider is configured and NODE_ENV is not production. */
  devCode?: string;
};

export type ChallengeDenied = {
  ok: false;
  error: string;
  status: number;
  retryAfter?: number;
};

export type ChallengeResult = ChallengeIssued | ChallengeDenied;

export type VerificationOutcome =
  | { ok: true; userId: number; role: "student" | "faculty"; status: VerificationStatus }
  | ChallengeDenied;

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

type Target = { id: number; email: string; name: string };

/** Create (or refresh) a challenge and mail the code. */
export async function startVerification(
  target: Target,
  purpose: OtpPurpose = "login",
  env: Record<string, string | undefined> = process.env,
  options: { allowReuse?: boolean } = {},
): Promise<ChallengeResult> {
  const allowReuse = options.allowReuse !== false;
  const email = target.email.toLowerCase();
  const now = Date.now();

  const [existing] = await db
    .select()
    .from(emailVerifications)
    .where(eq(emailVerifications.userId, target.id))
    .orderBy(desc(emailVerifications.id))
    .limit(1);

  const reusable =
    existing &&
    existing.consumedAt === null &&
    existing.expiresAt.getTime() > now
      ? existing
      : null;

  if (reusable) {
    const decision = canSend(
      {
        attempts: reusable.attempts,
        sends: reusable.sends,
        lastSentAt: reusable.lastSentAt?.getTime() ?? null,
        expiresAt: reusable.expiresAt.getTime(),
        consumedAt: reusable.consumedAt?.getTime() ?? null,
      },
      now,
    );
    if (!decision.ok && decision.reason !== "cooldown")
      return { ok: false, error: describeDecision(decision), status: 429 };
    if (!decision.ok) {
      // A code is already on its way: signing in again inside the resend
      // cooldown must not lock the teacher out, so return the live challenge
      // (without the code — it is in the mailbox) and let them continue.
      if (allowReuse)
        return {
          ok: true,
          challengeId: signChallenge({
            id: reusable.id,
            email,
            expiresAt: reusable.expiresAt.getTime(),
          }),
          maskedEmail: maskEmail(email),
          resendAfter: resendCountdown(
            reusable.lastSentAt?.getTime() ?? null,
            now,
          ),
          delivered: false,
        };
      return {
        ok: false,
        error: describeDecision(decision),
        status: 429,
        retryAfter: Math.ceil((decision.retryAfterMs ?? 0) / 1000),
      };
    }
  }

  const code = generateOtp();
  const codeHash = hashOtp(code, email);
  const expiresAt = new Date(otpExpiry(now));

  let rowId = reusable?.id;
  if (reusable) {
    await db
      .update(emailVerifications)
      .set({
        codeHash,
        purpose,
        attempts: 0,
        sends: reusable.sends + 1,
        expiresAt,
        lastSentAt: new Date(now),
      })
      .where(eq(emailVerifications.id, reusable.id));
  } else {
    const [row] = await db
      .insert(emailVerifications)
      .values({
        userId: target.id,
        email,
        codeHash,
        purpose,
        sends: 1,
        expiresAt,
        lastSentAt: new Date(now),
      })
      .returning({ id: emailVerifications.id });
    rowId = row?.id;
  }
  if (!rowId)
    return {
      ok: false,
      error: "Could not start email verification. Please try again.",
      status: 500,
    };

  const config = getMailConfig(env);
  const mail = verificationMail({
    to: email,
    name: target.name,
    code,
    ttlMinutes: Math.round(OTP_TTL_MS / 60_000),
    config,
  });
  const sent = await sendMail(mail, config);
  if (!sent.delivered && sent.provider !== "console")
    return {
      ok: false,
      error:
        "The verification email could not be sent. Please try again in a minute.",
      status: 502,
    };

  return {
    ok: true,
    challengeId: signChallenge({
      id: rowId,
      email,
      expiresAt: expiresAt.getTime(),
    }),
    maskedEmail: maskEmail(email),
    resendAfter: resendCountdown(now),
    delivered: sent.delivered,
    devCode: sent.provider === "console" && !isProduction() ? code : undefined,
  };
}

/** Check a submitted code and upgrade the account when it is right. */
export async function confirmVerification(
  challengeId: unknown,
  rawCode: unknown,
  now = Date.now(),
): Promise<VerificationOutcome> {
  const payload = openChallenge(challengeId, now);
  if (!payload)
    return {
      ok: false,
      error:
        "This verification session has expired. Please sign in again to get a new code.",
      status: 400,
    };

  const code = normalizeCode(rawCode);
  if (!code)
    return { ok: false, error: "Enter the 6-digit code from your email.", status: 400 };

  const [row] = await db
    .select()
    .from(emailVerifications)
    .where(eq(emailVerifications.id, payload.id))
    .limit(1);
  if (!row || row.email !== payload.email)
    return { ok: false, error: "Verification session not found.", status: 400 };

  const decision = canSubmit(
    {
      attempts: row.attempts,
      sends: row.sends,
      lastSentAt: row.lastSentAt?.getTime() ?? null,
      expiresAt: row.expiresAt.getTime(),
      consumedAt: row.consumedAt?.getTime() ?? null,
    },
    now,
  );
  if (!decision.ok)
    return { ok: false, error: describeDecision(decision), status: 429 };

  if (!otpMatches(code, row.codeHash, row.email)) {
    await db
      .update(emailVerifications)
      .set({ attempts: row.attempts + 1 })
      .where(eq(emailVerifications.id, row.id));
    const left = OTP_MAX_ATTEMPTS - (row.attempts + 1);
    return {
      ok: false,
      error:
        left > 0
          ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.`
          : "Incorrect code. Please request a new one.",
      status: 401,
    };
  }

  await db
    .update(emailVerifications)
    .set({ consumedAt: new Date(now) })
    .where(eq(emailVerifications.id, row.id));

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      verificationStatus: users.verificationStatus,
    })
    .from(users)
    .where(eq(users.id, row.userId))
    .limit(1);
  if (!user)
    return { ok: false, error: "Account not found.", status: 404 };

  const assessment = assessFacultyEmail(user.email);
  const status: VerificationStatus =
    user.verificationStatus === "rejected"
      ? "rejected"
      : user.verificationStatus === "verified"
        ? "verified"
        : user.role === "faculty"
          ? assessment.statusAfterOtp
          : "verified";

  await db
    .update(users)
    .set({
      emailVerified: true,
      emailVerifiedAt: new Date(now),
      emailDomain: emailDomain(user.email),
      verificationStatus: status,
      verifiedBy: status === "verified" ? `OTP · ${emailTrust(user.email)} domain` : null,
    })
    .where(eq(users.id, user.id));

  return { ok: true, userId: user.id, role: user.role, status };
}

/** Resend the code for an existing challenge. */
export async function resendVerification(
  challengeId: unknown,
  env: Record<string, string | undefined> = process.env,
): Promise<ChallengeResult> {
  const payload = openChallenge(challengeId);
  if (!payload)
    return {
      ok: false,
      error: "This verification session has expired. Please sign in again.",
      status: 400,
    };
  // The challenge id addresses a verification row; find the account it belongs to.
  const [owner] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      purpose: emailVerifications.purpose,
    })
    .from(users)
    .innerJoin(emailVerifications, eq(emailVerifications.userId, users.id))
    .where(eq(emailVerifications.id, payload.id))
    .limit(1);
  if (!owner)
    return { ok: false, error: "Verification session not found.", status: 400 };
  return startVerification(owner, owner.purpose, env, { allowReuse: false });
}

/* --------------------------- review queue --------------------------- */

export type PendingFaculty = {
  id: number;
  name: string;
  email: string;
  domain: string | null;
  subject: string | null;
  institution: string | null;
  createdAt: Date;
};

/** Faculty who proved a personal mailbox and await an institutional check. */
export async function getPendingFaculty(limit = 25): Promise<PendingFaculty[]> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      domain: users.emailDomain,
      subject: users.subjectSpecialization,
      institution: users.institutionId,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.verificationStatus, "pending_review"))
    .orderBy(desc(users.id))
    .limit(limit);
  return rows;
}

/** A verified reviewer confirms or rejects a pending institutional claim. */
export async function reviewFaculty(
  reviewer: { role: string; verificationStatus: string | null; name: string },
  facultyId: number,
  approve: boolean,
): Promise<{ ok: boolean; error?: string }> {
  if (reviewer.role !== "faculty" || reviewer.verificationStatus !== "verified")
    return { ok: false, error: "Only verified faculty can review accounts." };
  const [row] = await db
    .update(users)
    .set({
      verificationStatus: approve ? "verified" : "rejected",
      verifiedBy: approve ? reviewer.name : `${reviewer.name} (rejected)`,
    })
    .where(eq(users.id, facultyId))
    .returning({ id: users.id });
  return row ? { ok: true } : { ok: false, error: "Faculty account not found." };
}
