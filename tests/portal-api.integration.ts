import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { client, db, initializeDatabase } from "../src/db";
import { chapters, mcqAttempts, mcqQuestions, notes, subjectiveAttempts, subjectiveQuestions, users } from "../src/db/schema";
import { getRankedNotes, getUserStats } from "../src/lib/queries";

const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";
const runId = randomUUID();
const email = `portal-test-${runId}@example.invalid`;
const password = "Test-fixture-only-123!";
let userId: number;
let chapterId: number;
let session = "";

async function post(route: string, body: unknown, cookie = session) {
  return fetch(`${base}${route}`, {
    method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify(body),
  });
}

before(async () => {
  await initializeDatabase();
  assert.equal((await fetch(`${base}/api/health`)).status, 200);
  const [chapter] = await db.insert(chapters).values({ classNo: 8, subjectSlug: "science", subjectName: "Science", num: 998, title: "Portal API test", slug: `portal-test-${runId}` }).returning();
  chapterId = chapter.id;
  await db.insert(mcqQuestions).values([
    { chapterId, qtext: "Question one", options: ["Correct", "Wrong"], correctIndex: 0 },
    { chapterId, qtext: "Question two", options: ["Wrong", "Correct"], correctIndex: 1 },
  ]);
  await db.insert(subjectiveQuestions).values({ chapterId, qtext: "Explain your answer", marks: 2, rubric: [{ step: "Explain", marks: 2 }], modelAnswer: "A model explanation." });
});

after(async () => {
  try {
    if (chapterId) await db.delete(chapters).where(eq(chapters.id, chapterId));
    // Also clean up if registration saved the user but a later assertion failed.
    await db.delete(users).where(eq(users.email, email));
  } finally { client.close(); }
});

describe("portal APIs on SQLite", () => {
  it("registers and signs in a student using the configured session secret", async () => {
    const registration = await post("/api/auth/register", { name: "Portal Test Student", email, password, role: "student", className: "8", state: "Tamil Nadu", school: "Test School" });
    assert.equal(registration.status, 200, await registration.clone().text());
    const [user] = await db.select().from(users).where(eq(users.email, email));
    userId = user.id;
    assert.equal(user.role, "student");
    assert.equal(user.isGuest, false);
    const login = await post("/api/auth/login", { email, password });
    assert.equal(login.status, 200);
    session = login.headers.get("set-cookie")!.split(";")[0];
    assert.match(session, /^vs_session=/);
    const wrong = await post("/api/auth/login", { email, password: "incorrect-test-password" });
    assert.equal(wrong.status, 401);
  });

  it("persists objective answers and only rewards the first attempt", async () => {
    const first = await post(`/api/objective/${chapterId}/submit`, { answers: [0, 1], durationSec: 45 });
    assert.equal(first.status, 200, await first.clone().text());
    assert.deepEqual(await first.json(), { ok: true, score: 2, total: 2, xpEarned: 20, firstTime: true });
    const second = await post(`/api/objective/${chapterId}/submit`, { answers: [0, 1], durationSec: 30 });
    assert.equal((await second.json()).xpEarned, 0);
    const attempts = await db.select().from(mcqAttempts).where(eq(mcqAttempts.userId, userId));
    assert.equal(attempts.length, 2);
    assert.deepEqual(attempts[0].answers, [0, 1]);
    assert.ok(attempts[0].createdAt instanceof Date);
  });

  it("persists subjective answers, computes XP and renders account/leaderboard data", async () => {
    const answers = { 1: "A test explanation." };
    const first = await post(`/api/subjective/${chapterId}/submit`, { answers });
    assert.equal(first.status, 200, await first.clone().text());
    assert.deepEqual(await first.json(), { ok: true, xpEarned: 30, firstTime: true });
    const second = await post(`/api/subjective/${chapterId}/submit`, { answers });
    assert.equal((await second.json()).xpEarned, 0);
    const attempts = await db.select().from(subjectiveAttempts).where(eq(subjectiveAttempts.userId, userId));
    assert.deepEqual(attempts[0].answers, answers);
    const stats = await getUserStats(userId, 8);
    assert.equal(stats.xp, 50);
    assert.equal(stats.accuracy, 100);
    const account = await fetch(`${base}/account`, { headers: { Cookie: session } });
    assert.equal(account.status, 200);
    assert.match(await account.text(), /Portal Test Student/);
    assert.equal((await fetch(`${base}/leaderboard`, { headers: { Cookie: session } })).status, 200);
  });

  it("retains faculty-only verification and SQLite boolean/ranking updates", async () => {
    const [note] = await db.insert(notes).values({ chapterId, title: "Faculty verification test", authorId: userId, authorName: "Portal Test Student", content: "Study notes" }).returning();
    const denied = await post(`/api/notes/${note.id}/verify`, { verified: true });
    assert.equal(denied.status, 403);
    const guest = await fetch(`${base}/api/auth/guest?role=faculty`, { redirect: "manual" });
    assert.equal(guest.status, 303);
    const facultyCookie = guest.headers.get("set-cookie")!.split(";")[0];
    const verified = await post(`/api/notes/${note.id}/verify`, { verified: true }, facultyCookie);
    assert.equal(verified.status, 200);
    assert.equal((await verified.json()).facultyVerified, true);
    const ranked = (await getRankedNotes(chapterId, userId)).find((n) => n.id === note.id)!;
    assert.equal(ranked.facultyVerified, true);
    assert.equal(ranked.rankScore, 30);
    assert.equal((await post("/api/auth/logout", {})).status, 200);
  });

  it("signs faculty in directly at registration and login — no email OTP", async () => {
    // A personal mailbox must register, sign in and moderate notes with no
    // one-time code step anywhere (the faculty OTP feature was removed).
    const facultyEmail = `faculty-${runId}@gmail.com`;
    const registration = await post("/api/auth/register", {
      name: "Direct Faculty Test",
      email: facultyEmail,
      password,
      role: "faculty",
      subjectSpecialization: "Science",
      institutionId: "SCH-TEST-1",
      state: "Andhra Pradesh",
    });
    assert.equal(registration.status, 200, await registration.clone().text());
    const registered = await registration.json();
    assert.equal(registered.ok, true);
    assert.equal(registered.user.role, "faculty");
    assert.equal(registered.requiresVerification, undefined);
    const facultySession = registration.headers.get("set-cookie")!.split(";")[0];
    assert.match(facultySession, /^vs_session=/);

    // Fresh login is equally direct.
    const login = await post("/api/auth/login", { email: facultyEmail, password });
    assert.equal(login.status, 200);
    const loggedIn = await login.json();
    assert.equal(loggedIn.ok, true);
    assert.equal(loggedIn.requiresVerification, undefined);

    // Moderation rights come with the faculty role, no review step.
    const [note] = await db.insert(notes).values({ chapterId, title: "Direct faculty note", authorId: userId, authorName: "Portal Test Student", content: "Study notes" }).returning();
    const verified = await post(`/api/notes/${note.id}/verify`, { verified: true }, facultySession);
    assert.equal(verified.status, 200);
    assert.equal((await verified.json()).facultyVerified, true);
    await db.delete(notes).where(eq(notes.id, note.id));
    await db.delete(users).where(eq(users.email, facultyEmail));
  });
});
