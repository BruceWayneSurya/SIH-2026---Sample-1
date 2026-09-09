import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { REQUIRED_COLUMNS, ensureSchemaColumns } from "../src/db/ensure-columns";

function executor(existing: Record<string, string[]>) {
  const ran: string[] = [];
  return {
    ran,
    execute: async (query: string) => {
      const text = query;
      ran.push(text);
      const table = text.match(/PRAGMA table_info\((\w+)\)/)?.[1];
      if (table) return { rows: (existing[table] ?? []).map((name) => ({ name })) };
      return { rows: [] };
    },
  };
}

describe("adopting SQLite files from an earlier release", () => {
  it("adds only the columns the database is missing", async () => {
    const fake = executor({
      users: ["id", "handle", "name", "email", "password_hash", "role", "is_guest"],
    });
    const added = await ensureSchemaColumns(fake);
    assert.deepEqual(added, REQUIRED_COLUMNS.map((c) => `users.${c.column}`));
    for (const column of REQUIRED_COLUMNS)
      assert.ok(
        fake.ran.includes(column.ddl),
        `missing ALTER for ${column.column}`,
      );
  });

  it("is a no-op on a database that already has the columns", async () => {
    const fake = executor({
      users: [
        "id",
        ...REQUIRED_COLUMNS.map((c) => c.column),
      ],
    });
    const added = await ensureSchemaColumns(fake);
    assert.deepEqual(added, []);
    assert.equal(fake.ran.filter((q) => q.startsWith("ALTER")).length, 0);
  });

  it("covers every faculty verification column with a SQLite-safe default", async () => {
    const columns = REQUIRED_COLUMNS.map((c) => c.column);
    for (const name of [
      "email_verified",
      "email_verified_at",
      "email_domain",
      "verification_status",
      "verified_by",
    ])
      assert.ok(columns.includes(name), `uncovered column: ${name}`);
    for (const column of REQUIRED_COLUMNS) {
      assert.match(column.ddl, /^ALTER TABLE \w+ ADD COLUMN /);
      if (column.ddl.includes("NOT NULL"))
        assert.match(column.ddl, /DEFAULT /, `${column.column} needs a default`);
    }
  });
});
