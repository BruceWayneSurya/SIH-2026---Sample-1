/**
 * Faculty identity policy for the portal.
 *
 * Every faculty account must own the mailbox it signs in with (OTP over email).
 * On top of that, the *domain* decides how much trust the account gets:
 *
 *  • institutional (…gov.in / …nic.in / …edu.in / …ac.in / listed bodies)
 *      → verified immediately after the mailbox is proven; may moderate notes.
 *  • personal (gmail.com and friends)
 *      → mailbox verified, but the account stays "pending institutional review"
 *        until a verified reviewer confirms the institution. It can teach and
 *        browse, it cannot verify other people's notes.
 *  • anything else → same as personal, and flagged for manual review.
 *
 * The personal-mail policy is configurable so a State coordinator can close
 * personal addresses entirely (`FACULTY_PERSONAL_EMAIL_POLICY=block`) or let
 * them through without review in a pilot (`=allow`).
 */

export type EmailTrust = "institutional" | "personal" | "other";

/** Verified mailbox + institutional domain. */
export type VerificationStatus =
  | "unverified"
  | "verified"
  | "pending_review"
  | "rejected";

export const PERSONAL_EMAIL_POLICY = ["review", "block", "allow"] as const;
export type PersonalEmailPolicy = (typeof PERSONAL_EMAIL_POLICY)[number];

/** Suffixes that prove a government / academic institution in India. */
export const INSTITUTIONAL_SUFFIXES = [
  "gov.in",
  "nic.in",
  "edu.in",
  "ac.in",
  "res.in",
  "mil.in",
] as const;

/** Bodies whose addresses are institution-owned even without a .in suffix. */
export const INSTITUTIONAL_DOMAINS = [
  "diksha.gov.in",
  "ncert.nic.in",
  "cbse.gov.in",
  "cbseacademic.nic.in",
] as const;

export const PERSONAL_EMAIL_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.in",
  "yahoo.in",
  "ymail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "rediffmail.com",
  "protonmail.com",
  "proton.me",
  "zoho.com",
  "gmx.com",
  "aol.com",
] as const;

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;

export function normalizeEmail(value: unknown): string {
  return typeof value === "string"
    ? value.trim().toLowerCase().replace(/\s+/g, "")
    : "";
}

export function isEmailAddress(value: string): boolean {
  return value.length <= 120 && EMAIL_RE.test(value);
}

/** Domain part of an address, lower-cased; "" when the address is malformed. */
export function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 0 || at === email.length - 1) return "";
  return email.slice(at + 1).toLowerCase();
}

export function emailTrust(email: string): EmailTrust {
  const domain = emailDomain(email);
  if (!domain) return "other";
  if (
    (PERSONAL_EMAIL_DOMAINS as readonly string[]).includes(domain) ||
    domain.startsWith("gmail.")
  )
    return "personal";
  if ((INSTITUTIONAL_DOMAINS as readonly string[]).includes(domain))
    return "institutional";
  return INSTITUTIONAL_SUFFIXES.some(
    (suffix) => domain === suffix || domain.endsWith(`.${suffix}`),
  )
    ? "institutional"
    : "other";
}

export function personalEmailPolicy(
  env: Record<string, string | undefined> = process.env,
): PersonalEmailPolicy {
  const raw = env.FACULTY_PERSONAL_EMAIL_POLICY?.trim().toLowerCase();
  return (PERSONAL_EMAIL_POLICY as readonly string[]).includes(raw ?? "")
    ? (raw as PersonalEmailPolicy)
    : "review";
}

export type FacultyEmailDecision = {
  email: string;
  domain: string;
  trust: EmailTrust;
  /** False when registration must be refused outright. */
  allowed: boolean;
  /**
   * Status granted once the mailbox has been proven with an OTP.
   * `verified` unlocks note moderation; `pending_review` does not.
   */
  statusAfterOtp: VerificationStatus;
  message: string;
};

/** Decide, before anything is written to the database, what an email implies. */
export function assessFacultyEmail(
  input: unknown,
  env: Record<string, string | undefined> = process.env,
): FacultyEmailDecision {
  const email = normalizeEmail(input);
  const domain = emailDomain(email);
  if (!isEmailAddress(email)) {
    return {
      email,
      domain,
      trust: "other",
      allowed: false,
      statusAfterOtp: "unverified",
      message: "Enter a valid email address.",
    };
  }

  const trust = emailTrust(email);
  if (trust === "institutional") {
    return {
      email,
      domain,
      trust,
      allowed: true,
      statusAfterOtp: "verified",
      message: `Institutional address (${domain}) — verified as soon as the mailbox is confirmed.`,
    };
  }

  const policy = personalEmailPolicy(env);
  if (trust === "personal" && policy === "block") {
    return {
      email,
      domain,
      trust,
      allowed: false,
      statusAfterOtp: "unverified",
      message: `Personal mailboxes such as ${domain} are not accepted for faculty accounts. Please use your school or department email ID.`,
    };
  }

  return {
    email,
    domain,
    trust,
    allowed: true,
    statusAfterOtp: policy === "allow" ? "verified" : "pending_review",
    message:
      policy === "allow"
        ? `Address accepted (${domain}) — verified as soon as the mailbox is confirmed.`
        : `Personal address (${domain}) accepted with review — a verified reviewer must confirm your institution before you can moderate notes.`,
  };
}

/** `anita.sharma@vidyasetu.gov.in` → `a*****@vidyasetu.gov.in` */
export function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  if (!domain) return "•••";
  const head = local.slice(0, 1);
  const tail = local.length > 4 ? local.slice(-1) : "";
  return `${head}${"•".repeat(Math.max(3, local.length - head.length - tail.length))}${tail}@${domain}`;
}

/** Human-readable label used on the dashboard and the account page. */
export function verificationLabel(status: VerificationStatus): string {
  switch (status) {
    case "verified":
      return "Verified faculty";
    case "pending_review":
      return "Pending institutional review";
    case "rejected":
      return "Verification rejected";
    default:
      return "Email not verified";
  }
}

/** Only verified faculty may sign off on community notes. */
export function canModerateNotes(user: {
  role: string;
  verificationStatus: string | null;
  isGuest?: boolean;
}): boolean {
  return user.role === "faculty" && user.verificationStatus === "verified";
}
