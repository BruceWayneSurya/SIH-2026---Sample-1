import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { eq, inArray } from "drizzle-orm";
import { client, db, initializeDatabase } from "../src/db";
import {
  chapters,
  emailVerifications,
  notes,
  users,
} from "../src/db/schema";
import { makeSessionToken, SESSION_COOKIE } from "../src/lib/session";

// Run against a running local app that shares this database and session secret:
//   npm run dev
//   npm run test:integration
// Only this suite's uniquely named fixtures are created and removed; no reseeding.
const baseUrl = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";
const runId = randomUUID().slice(0, 8);
const password = "Test-fixture-only-123!";
const personalEmail = `faculty-personal-${runId}@gmail.com`;
const institutionalEmail = `faculty-institutional-${runId}@kvs.gov.in`;
const studentEmail = `student-verification-${runId}@example.invalid`;
const reviewerEmail = `reviewer-${runId}@nic.in`;
const fixtureEmails = [
  personalEmail,
  institutionalEmail,
  studentEmail,
  reviewerEmail,
];

let personalFacultyId = 0;
let reviewerId = 0;
let chapterId = 0;
let noteId = 0;
let personalSession = "";
let challengeId = "";
let code = "";
let codeAvailable = false;

/** Reviewer identity — minted locally because a reviewer needs no OTP round trip. */
function reviewerCookie() {
  return `${SESSION_COOKIE}=${makeSessionToken({ id: reviewerId, role: "faculty" })}`;
}

async function post(route: string, body: unknown, cookie = "") {
  return fetch(`${baseUrl}${route}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function facultyRow(email: string) {
  const [row] = await db.select().from(users).where(eq(users.email, email));
  return row;
}

before(async () => {
  await initializeDatabase();
  assert.equal((await fetch(`${baseUrl}/api/health`)).status, 200);
  const [chapter] = await db
    .insert(chapters)
    .values({
      classNo: 8,
      subjectSlug: "science",
      subjectName: "Science",
      num: 997,
      title: "Faculty verification test",
      slug: `verification-test-${runId}`,
    })
    .returning();
  chapterId = chapter.id;
  const [note] = await db
    .insert(notes)
    .values({
      chapterId,
      title: "Note awaiting moderation",
      content: "Fixture used to prove moderation gating.",
      fileType: "text",
      authorName: "Fixture Student",
    })
    .returning();
  noteId = note.id;
  const [reviewer] = await db
    .insert(users)
    .values({
      handle: `reviewer-${runId}`,
      name: "Fixture Reviewer",
      email: reviewerEmail,
      passwordHash: "x",
      role: "faculty",
      state: "Delhi",
      subjectSpecialization: "Science",
      institutionId: "NIC-DEL-1",
      emailVerified: true,
      verificationStatus: "verified",
    })
    .returning();
  reviewerId = reviewer.id;
});

after(async () => {
  try {
    if (noteId) await db.delete(notes).where(eq(notes.id, noteId));
    if (chapterId) await db.delete(chapters).where(eq(chapters.id, chapterId));
    await db.delete(emailVerifications).where(inArray(emailVerifications.email, fixtureEmails));
    await db.delete(users).where(inArray(users.email, fixtureEmails));
  } finally {
    client.close();
  }
});

describe("faculty email verification over HTTP", () => {
  it("holds a personal mailbox at pending review and keeps its challenge alive through the resend cooldown", async (t) => {
    const registration = await post("/api/auth/register", {
      role: "faculty",
      name: "Personal Mail Faculty",
      email: personalEmail,
      password,
      state: "Gujarat",
      subjectSpecialization: "Science",
      institutionId: "SCH-GJ-1",
    });
    assert.equal(registration.status, 200, await registration.clone().text());
    const started = await registration.json();
    assert.equal(started.ok, false);
    assert.equal(started.requiresVerification, true);
    assert.ok(started.challengeId, "the browser receives a signed challenge id");
    assert.match(started.maskedEmail, /^f\u2022{3,}.@gmail\.com$/, "keeps only the first and last character of the local part");
    assert.ok(
      !started.maskedEmail.includes("personal-"),
      "the masked address never leaks the full mailbox",
    );
    assert.equal(
      registration.headers.get("set-cookie"),
      null,
      "no session is issued before the code is confirmed",
    );
    challengeId = started.challengeId;
    code = started.devCode ?? "";
    codeAvailable = Boolean(code);
    if (!codeAvailable) {
      t.skip("MAIL_PROVIDER is not the console provider, so no code was disclosed");
      return;
    }

    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.email, personalEmail));
    personalFacultyId = row.id;
    assert.equal(
      row.verificationStatus,
      "unverified",
      "registration alone never grants a trust tier",
    );
    assert.equal(row.emailVerified, false);
    assert.equal(row.emailDomain, "gmail.com");

    // A teacher who signs straight back in must not be locked out of a code they
    // already hold — the live challenge is returned instead of a bare 429.
    const insideCooldown = await post("/api/auth/login", { email: personalEmail, password });
    assert.equal(insideCooldown.status, 200, await insideCooldown.clone().text());
    const reused = await insideCooldown.json();
    assert.equal(reused.requiresVerification, true);
    assert.equal(reused.challengeId, challengeId, "the same challenge is reused");
    assert.equal(reused.delivered, false, "no second email is sent");
    assert.ok(reused.resendAfter > 0, "the countdown is reported to the browser");
    assert.equal(reused.devCode, undefined, "reuse never re-discloses a code");

    // An explicit resend request is still throttled.
    const resend = await post("/api/auth/verify/resend", { challengeId });
    assert.equal(resend.status, 429);
    assert.ok((await resend.json()).retryAfter > 0);

    const wrong = await post("/api/auth/verify", { challengeId, code: "000000" });
    assert.equal(wrong.status, 401);
    // The remaining attempts travel in the message; the route exposes no counter field.
    assert.match((await wrong.json()).error, /4 attempts left/);

    const confirmed = await post("/api/auth/verify", { challengeId, code });
    assert.equal(confirmed.status, 200, await confirmed.clone().text());
    const done = await confirmed.json();
    assert.equal(done.ok, true);
    assert.equal(done.status, "pending_review");
    personalSession = confirmed.headers.get("set-cookie")!.split(";")[0];
    assert.match(personalSession, /^vs_session=/);

    const afterRow = await facultyRow(personalEmail);
    assert.equal(afterRow.emailVerified, true);
    assert.equal(
      afterRow.verificationStatus,
      "pending_review",
      "a personal mailbox still needs an institutional sign-off",
    );
  });

  it("keeps note moderation locked until a verified reviewer approves the institution", async () => {
    assert.ok(personalSession, "the pending faculty session from the previous test");
    const blocked = await post(
      `/api/notes/${noteId}/verify`,
      { verified: true },
      personalSession,
    );
    assert.equal(blocked.status, 403);
    assert.match((await blocked.json()).error, /pending institutional review/i);

    const review = await post(
      "/api/faculty/review",
      { facultyId: personalFacultyId, approve: true },
      reviewerCookie(),
    );
    assert.equal(review.status, 200, await review.clone().text());
    const approved = await facultyRow(personalEmail);
    assert.equal(approved.verificationStatus, "verified");
    assert.equal(approved.verifiedBy, "Fixture Reviewer");

    // The existing cookie now resolves to a verified faculty member, because the
    // session is re-read from the database on every request.
    const allowed = await post(
      `/api/notes/${noteId}/verify`,
      { verified: true },
      personalSession,
    );
    assert.equal(allowed.status, 200, await allowed.clone().text());
    assert.equal((await allowed.json()).facultyVerified, true);
  });

  it("verifies an institutional mailbox straight away and lets students straight in", async (t) => {
    const registration = await post("/api/auth/register", {
      role: "faculty",
      name: "Institutional Faculty",
      email: institutionalEmail,
      password,
      state: "Delhi",
      subjectSpecialization: "Mathematics",
      institutionId: "KVS-DEL-1",
    });
    const started = await registration.json();
    assert.equal(started.requiresVerification, true);
    const institutionalCode = started.devCode ?? "";
    if (!institutionalCode) {
      t.skip("MAIL_PROVIDER is not the console provider, so no code was disclosed");
      return;
    }

    const confirmed = await post("/api/auth/verify", {
      challengeId: started.challengeId,
      code: institutionalCode,
    });
    assert.equal(confirmed.status, 200, await confirmed.clone().text());
    assert.equal((await confirmed.json()).status, "verified");
    const row = await facultyRow(institutionalEmail);
    assert.equal(row.verificationStatus, "verified");
    assert.equal(row.emailDomain, "kvs.gov.in");

    const student = await post("/api/auth/register", {
      role: "student",
      name: "Verification Test Student",
      email: studentEmail,
      password,
      className: "9",
      state: "Telangana",
      school: "ZP High School",
    });
    assert.equal(student.status, 200, await student.clone().text());
    const joined = await student.json();
    assert.equal(joined.ok, true, "learners are never held up by faculty checks");
    assert.equal(joined.requiresVerification, undefined);
    assert.match(student.headers.get("set-cookie") ?? "", /vs_session=/);
    const studentRow = await facultyRow(studentEmail);
    assert.equal(studentRow.emailVerified, true);
    assert.equal(studentRow.verificationStatus, "verified");
  });

  it("refuses a forged challenge and an unknown one", async () => {
    assert.ok(codeAvailable, "requires the console mail provider");
    const forged = await post("/api/auth/verify", {
      challengeId: `${challengeId}x`,
      code,
    });
    assert.equal(forged.status, 400);
    const unknown = await post("/api/auth/verify", {
      challengeId: `${Buffer.from(JSON.stringify({ id: 999999, email: personalEmail, expiresAt: Date.now() + 60000 })).toString("base64url")}.${"a".repeat(43)}`,
      code,
    });
    assert.equal(unknown.status, 400);
  });
});
