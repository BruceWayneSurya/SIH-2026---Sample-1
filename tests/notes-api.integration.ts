import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { and, eq, inArray } from "drizzle-orm";
import { db, pool } from "../src/db";
import { chapters, notes, noteVotes, users, xpEvents } from "../src/db/schema";
import { getRankedNotes } from "../src/lib/queries";
import { makeSessionToken, SESSION_COOKIE } from "../src/lib/session";

// Run against a running local app and the SAME database/session secret:
//   npm run dev
//   npm run test:integration
// Only this suite's uniquely named fixtures are created/deleted; no reseeding.
const baseUrl = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";
const runId = randomUUID();
const driveUrl = "https://drive.google.com/file/d/1Test_Notes-Pdf123456789/view";
let chapterId: number;
let authorId: number;
let voterIds: number[] = [];
let fixtureUserIds: number[] = [];
const localUploads: string[] = [];

function cookie(id: number) {
  return `${SESSION_COOKIE}=${makeSessionToken({ id, role: "student" })}`;
}

async function upload(values: Record<string, string | File>, id = authorId) {
  const form = new FormData();
  form.set("chapterId", String(chapterId));
  form.set("title", "Integration test note");
  for (const [key, value] of Object.entries(values)) form.set(key, value);
  return fetch(`${baseUrl}/api/notes`, {
    method: "POST",
    headers: { Cookie: cookie(id) },
    body: form,
  });
}

async function makeNote(title = "Voting test note") {
  const [note] = await db.insert(notes).values({
    chapterId,
    title,
    content: "Test content",
    authorId,
    authorName: "Notes test author",
  }).returning();
  return note;
}

async function vote(noteId: number, userId: number, voted?: boolean) {
  const res = await fetch(`${baseUrl}/api/notes/${noteId}/vote`, {
    method: "POST",
    headers: { Cookie: cookie(userId), "Content-Type": "application/json" },
    body: voted === undefined ? undefined : JSON.stringify({ voted }),
  });
  assert.equal(res.status, 200, await res.clone().text());
  return res.json() as Promise<{ ok: boolean; upvotes: number; voted: boolean; reward: number }>;
}

before(async () => {
  // Trigger local demo bootstrap before creating any test fixtures.
  const health = await fetch(`${baseUrl}/api/health`);
  assert.equal(health.status, 200, "Start the app before running integration tests.");

  const [chapter] = await db.insert(chapters).values({
    classNo: 8,
    subjectSlug: "science",
    subjectName: "Science",
    num: 999,
    title: `Notes integration test ${runId}`,
    slug: `notes-test-${runId}`,
  }).returning({ id: chapters.id });
  chapterId = chapter.id;

  const people = await db.insert(users).values(
    Array.from({ length: 12 }, (_, i) => ({
      handle: `notes_test_${runId}_${i}`,
      name: i === 0 ? "Notes test author" : `Notes test voter ${i}`,
      email: `notes-test-${runId}-${i}@example.invalid`,
      passwordHash: "test-only-no-login",
      role: "student" as const,
      className: 8,
    })),
  ).returning({ id: users.id });
  fixtureUserIds = people.map((p) => p.id);
  [authorId, ...voterIds] = fixtureUserIds;
});

after(async () => {
  try {
    for (const fileUrl of localUploads) {
      await unlink(path.join(process.cwd(), "public", fileUrl)).catch(() => undefined);
    }
    if (chapterId) await db.delete(chapters).where(eq(chapters.id, chapterId));
    if (fixtureUserIds.length) await db.delete(users).where(inArray(users.id, fixtureUserIds));
  } finally {
    await pool.end();
  }
});

describe("notes upload API", () => {
  for (const example of [
    { label: "text only", content: "Readable text notes", link: "", type: "text" },
    { label: "Drive PDF only", content: "", link: driveUrl, type: "pdf" },
    { label: "text and Drive PDF", content: "Text version of the document", link: driveUrl, type: "pdf" },
  ]) {
    it(`publishes and persists ${example.label}`, async () => {
      const res = await upload({ content: example.content, driveUrl: example.link });
      assert.equal(res.status, 201, await res.clone().text());
      const data = await res.json();
      const [saved] = await db.select().from(notes).where(eq(notes.id, data.id));
      assert.equal(saved.content, example.content || null);
      assert.equal(saved.fileUrl, example.link || null);
      assert.equal(saved.fileType, example.type);
      assert.equal(saved.authorId, authorId);
      assert.equal(saved.chapterId, chapterId);
    });
  }

  it("normalizes share links and preserves the resource key", async () => {
    const res = await upload({ driveUrl: "https://drive.google.com/open?id=File_123&resourcekey=0-key&usp=sharing" });
    assert.equal(res.status, 201);
    const data = await res.json();
    const [saved] = await db.select().from(notes).where(eq(notes.id, data.id));
    assert.equal(saved.fileUrl, "https://drive.google.com/file/d/File_123/view?resourcekey=0-key");
  });

  it("keeps local PDF attachments working", async () => {
    const res = await upload({ file: new File(["%PDF-1.4\n%%EOF"], "Test notes.pdf", { type: "application/pdf" }) });
    assert.equal(res.status, 201, await res.clone().text());
    const data = await res.json();
    const [saved] = await db.select().from(notes).where(eq(notes.id, data.id));
    assert.equal(saved.fileType, "pdf");
    assert.match(saved.fileUrl!, /^\/uploads\/n[\w-]+-Test_notes\.pdf$/);
    localUploads.push(saved.fileUrl!);
  });

  it("rejects empty notes, invalid Drive links, and mixed document sources", async () => {
    const invalidNotes: Record<string, string | File>[] = [
      {},
      { content: "   " },
      { driveUrl: "javascript:alert(1)" },
      { content: "Valid text", driveUrl: "https://example.com/notes.pdf" },
      { driveUrl: "https://drive.google.com/drive/folders/Folder123" },
      { driveUrl, file: new File(["pdf"], "notes.pdf") },
    ];
    for (const values of invalidNotes) {
      const res = await upload(values);
      assert.equal(res.status, 400, await res.clone().text());
      assert.ok((await res.json()).error);
    }
  });

  it("validates chapter IDs before attempting an insert", async () => {
    const invalid = await upload({ content: "Text", chapterId: "-1" });
    assert.equal(invalid.status, 400);
    const missing = await upload({ content: "Text", chapterId: "2147483647" });
    assert.equal(missing.status, 404);
  });
});

describe("helpful votes", () => {
  it("adds, persists and removes one vote for the active user", async () => {
    const note = await makeNote();
    const added = await vote(note.id, voterIds[0], true);
    assert.deepEqual(added, { ok: true, upvotes: 1, voted: true, reward: 0 });

    const mine = (await getRankedNotes(chapterId, voterIds[0])).find((n) => n.id === note.id)!;
    const others = (await getRankedNotes(chapterId, voterIds[1])).find((n) => n.id === note.id)!;
    assert.equal(mine.iVoted, true);
    assert.equal(mine.upvotes, 1);
    assert.equal(mine.rankScore, 0.7);
    assert.equal(others.iVoted, false);
    assert.equal(others.upvotes, 1);

    const removed = await vote(note.id, voterIds[0], false);
    assert.deepEqual(removed, { ok: true, upvotes: 0, voted: false, reward: 0 });
    const refreshed = (await getRankedNotes(chapterId, voterIds[0])).find((n) => n.id === note.id)!;
    assert.equal(refreshed.iVoted, false);
    assert.equal(refreshed.upvotes, 0);
  });

  it("makes concurrent retries idempotent and never double-counts a user", async () => {
    const note = await makeNote();
    const added = await Promise.all(Array.from({ length: 8 }, () => vote(note.id, voterIds[0], true)));
    assert.ok(added.every((r) => r.upvotes === 1 && r.voted));
    const removed = await Promise.all(Array.from({ length: 8 }, () => vote(note.id, voterIds[0], false)));
    assert.ok(removed.every((r) => r.upvotes === 0 && !r.voted));
  });

  it("counts different users separately without removing another person's vote", async () => {
    const note = await makeNote();
    await vote(note.id, voterIds[0], true);
    assert.equal((await vote(note.id, voterIds[1], true)).upvotes, 2);
    assert.equal((await vote(note.id, voterIds[0], false)).upvotes, 1);
    const [remaining] = await db.select().from(noteVotes).where(eq(noteVotes.noteId, note.id));
    assert.equal(remaining.userId, voterIds[1]);
  });

  it("keeps the legacy body-less toggle working", async () => {
    const note = await makeNote();
    assert.equal((await vote(note.id, voterIds[0])).voted, true);
    assert.equal((await vote(note.id, voterIds[0])).voted, false);
  });

  it("grants the 10-vote XP reward only once under concurrent votes and retries", async () => {
    const note = await makeNote("Reward threshold test");
    await db.insert(noteVotes).values(voterIds.slice(0, 9).map((userId) => ({ noteId: note.id, userId })));
    const results = await Promise.all([
      vote(note.id, voterIds[9], true),
      vote(note.id, voterIds[10], true),
      vote(note.id, voterIds[9], true),
    ]);
    assert.equal(results.reduce((sum, r) => sum + r.reward, 0), 50);
    const savedVotes = await db.select().from(noteVotes).where(eq(noteVotes.noteId, note.id));
    assert.equal(savedVotes.length, 11);
    await vote(note.id, voterIds[9], false);
    await vote(note.id, voterIds[10], false);
    assert.equal((await vote(note.id, voterIds[9], true)).reward, 0);

    const rewards = await db.select().from(xpEvents).where(
      and(eq(xpEvents.refType, "note"), eq(xpEvents.refId, note.id), eq(xpEvents.type, "note_upvotes")),
    );
    assert.equal(rewards.length, 1);
    assert.equal(rewards[0].userId, authorId);
    assert.equal(rewards[0].amount, 50);
    const [saved] = await db.select().from(notes).where(eq(notes.id, note.id));
    assert.equal(saved.rewarded, true);
  });

  it("returns useful errors for invalid IDs and request bodies", async () => {
    for (const id of ["0", "-1", "abc", "1.5", "2147483648"]) {
      const res = await fetch(`${baseUrl}/api/notes/${id}/vote`, { method: "POST", headers: { Cookie: cookie(voterIds[0]) } });
      assert.equal(res.status, 400);
      assert.ok((await res.json()).error);
    }
    const missing = await fetch(`${baseUrl}/api/notes/2147483647/vote`, { method: "POST", headers: { Cookie: cookie(voterIds[0]) } });
    assert.equal(missing.status, 404);

    const note = await makeNote();
    for (const body of ["invalid JSON", "null", "[]", "{}", '{"voted":"true"}']) {
      const res = await fetch(`${baseUrl}/api/notes/${note.id}/vote`, {
        method: "POST",
        headers: { Cookie: cookie(voterIds[0]), "Content-Type": "application/json" },
        body,
      });
      assert.equal(res.status, 400);
      assert.ok((await res.json()).error);
    }
    const savedVotes = await db.select().from(noteVotes).where(eq(noteVotes.noteId, note.id));
    assert.equal(savedVotes.length, 0);
  });
});
