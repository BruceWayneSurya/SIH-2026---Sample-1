import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { after, before, describe, it } from "node:test";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { eq, sql } from "drizzle-orm";
import { openSqliteClient, retrySqliteBusy } from "../src/db/sqlite-client";
import { chapters, notes, noteVotes, users } from "../src/db/schema";

let directory: string;
before(async () => {
  await mkdir(".cache", { recursive: true });
  directory = await mkdtemp(path.resolve(".cache", "sqlite-tests-"));
});
after(async () => { if (directory) await rm(directory, { recursive: true, force: true }); });

const migrationsFolder = path.resolve("drizzle", "sqlite");

describe("SQLite storage", () => {
  it("migrates real SQLite files and round-trips text, JSON, booleans and dates", async () => {
    const filename = path.join(directory, "round-trip.db");
    const client = openSqliteClient(filename);
    const db = drizzle(client);
    try {
      await migrate(db, { migrationsFolder });
      const [chapter] = await db.insert(chapters).values({ classNo: 8, subjectSlug: "science", subjectName: "Science", num: 1, title: "அறிவியல்", slug: "science-test", outcomeIds: ["LO-TEST-01"] }).returning();
      assert.deepEqual(chapter.outcomeIds, ["LO-TEST-01"]);
      assert.ok(chapter.createdAt instanceof Date);
      assert.ok(Number.isFinite(chapter.createdAt.getTime()));
      const [user] = await db.insert(users).values({ handle: "test", email: "test@example.invalid", name: "Test student", passwordHash: "test-only", isGuest: true }).returning();
      assert.equal(user.isGuest, true);
      const [note] = await db.insert(notes).values({ chapterId: chapter.id, title: "Revision notes", content: "தமிழ் text", authorId: user.id, authorName: user.name, fileType: "pdf", fileUrl: "https://drive.google.com/file/d/File_123/view" }).returning();
      assert.equal(note.facultyVerified, false);
      assert.equal(note.content, "தமிழ் text");
      await db.insert(noteVotes).values({ noteId: note.id, userId: user.id });
      // Repeat the migration as on the next server start; never remove notes.
      await migrate(db, { migrationsFolder });
      assert.equal((await db.select().from(notes)).length, 1);
      // Adopt a compatible existing SQLite database without a migration journal.
      await client.execute("DROP TABLE __drizzle_migrations");
      await migrate(db, { migrationsFolder });
      assert.equal((await db.select().from(notes))[0].fileUrl, note.fileUrl);
      await db.delete(chapters).where(eq(chapters.id, chapter.id));
      assert.equal((await db.select().from(noteVotes)).length, 0);
      assert.equal((await db.select().from(notes)).length, 0);
    } finally { client.close(); }
    const reopened = openSqliteClient(filename);
    try { assert.equal((await reopened.execute("SELECT name FROM users")).rows[0].name, "Test student"); }
    finally { reopened.close(); }
  });

  it("serializes concurrent write transactions without blocking commits or replaying callbacks", async () => {
    const client = openSqliteClient(path.join(directory, "concurrency.db"));
    const db = drizzle(client);
    try {
      await client.execute("PRAGMA journal_mode = WAL");
      await client.execute("CREATE TABLE counter (n integer NOT NULL)");
      await client.execute("INSERT INTO counter VALUES (0)");
      let callbacks = 0;
      await Promise.all(Array.from({ length: 30 }, () => db.transaction(async (tx) => {
        callbacks++;
        const row = await tx.get<{ n: number }>(sql`SELECT n FROM counter`);
        await tx.run(sql`UPDATE counter SET n = ${row!.n + 1}`);
      })));
      assert.equal(callbacks, 30);
      assert.equal((await client.execute("SELECT n FROM counter")).rows[0].n, 30);
    } finally { client.close(); }
  });

  it("does not retry constraint violations or wait forever for a locked database", async () => {
    let attempts = 0;
    const constraint = Object.assign(new Error("constraint"), { code: "SQLITE_CONSTRAINT" });
    await assert.rejects(retrySqliteBusy(async () => { attempts++; throw constraint; }), constraint);
    assert.equal(attempts, 1);
    const busy = Object.assign(new Error("busy"), { code: "SQLITE_BUSY" });
    await assert.rejects(retrySqliteBusy(async () => { throw busy; }, 20), busy);
  });

  it("uses the same SQLite file for setup and repeated non-destructive seeding", async () => {
    const filename = path.join(directory, "seed.db");
    const command = (databaseUrl: string) => execFileSync(process.execPath, [path.resolve("node_modules/tsx/dist/cli.mjs"), "scripts/seed.ts"], {
      cwd: process.cwd(), env: { ...process.env, DATABASE_URL: databaseUrl }, encoding: "utf8", timeout: 30_000,
    });
    assert.match(command(path.relative(process.cwd(), filename)), /demo data added/);
    const client = openSqliteClient(filename);
    try {
      const initial = await client.execute("SELECT COUNT(*) AS n FROM notes");
      await client.execute("INSERT INTO notes (chapter_id, title, content, author_name) SELECT id, 'Keep this note', 'Custom user data', 'User' FROM chapters LIMIT 1");
      assert.match(command(pathToFileURL(filename).href), /existing data preserved/);
      assert.equal((await client.execute("SELECT COUNT(*) AS n FROM notes")).rows[0].n, Number(initial.rows[0].n) + 1);
      assert.equal((await client.execute("SELECT content FROM notes WHERE title = 'Keep this note'")).rows[0].content, "Custom user data");
      // Other Pragyan versions use the new guest email domain with the same IDs.
      const guestIds = (await client.execute("SELECT id FROM users WHERE is_guest = 1 ORDER BY id")).rows.map((row) => row.id);
      await client.execute("UPDATE users SET email = replace(email, '@vidyasetu.gov.in', '@pragyan.gov.in') WHERE is_guest = 1");
      assert.match(command(filename), /existing data preserved/);
      assert.deepEqual((await client.execute("SELECT id FROM users WHERE is_guest = 1 ORDER BY id")).rows.map((row) => row.id), guestIds);
    } finally { client.close(); }
  });
});
