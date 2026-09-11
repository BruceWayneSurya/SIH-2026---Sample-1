import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  REQUIRED_COLUMNS,
  STALE_COLUMNS,
  ensureSchemaColumns,
} from "../src/db/ensure-columns";

function executor(existing: Record<string, string[]>) {
  const ran: string[] = [];
  return {
    ran,
    execute: async (query: string) => {
      ran.push(query);
      const table = query.match(/PRAGMA table_info\((\w+)\)/)?.[1];
      if (table) return { rows: (existing[table] ?? []).map((name) => ({ name })) };
      return { rows: [] };
    },
  };
}

describe("adopting SQLite files from an earlier release", () => {
  it("adds missing and drops stale columns in one pass", async () => {
    // A pre-verification-removal database: it still carries the retired
    // faculty-verification columns and lacks a hypothetical new one.
    const fake = executor({
      users: [
        "id",
        "handle",
        "name",
        "email",
        "password_hash",
        "role",
        "is_guest",
        ...STALE_COLUMNS.map((c) => c.column),
      ],
    });
    const touched = await ensureSchemaColumns(
      fake,
      [{ table: "users", column: "future_flag", ddl: "ALTER TABLE users ADD COLUMN future_flag integer" }],
      [{ table: "users", column: "email_verified" }],
    );
    assert.deepEqual(touched, ["+users.future_flag", "-users.email_verified"]);
    assert.ok(fake.ran.includes("ALTER TABLE users ADD COLUMN future_flag integer"));
    assert.ok(fake.ran.includes("ALTER TABLE users DROP COLUMN email_verified"));
  });

  it("retires every faculty-verification column from older databases", async () => {
    const columns = STALE_COLUMNS.map((c) => c.column);
    for (const name of [
      "email_verified",
      "email_verified_at",
      "email_domain",
      "verification_status",
      "verified_by",
    ])
      assert.ok(columns.includes(name), `unretired column: ${name}`);
    for (const column of STALE_COLUMNS) {
      assert.equal(column.table, "users");
      assert.match(column.column, /^[a-z_]+$/);
    }
  });

  it("is a no-op on an already-current database", async () => {
    const fake = executor({ users: ["id", "handle", "name", "email"] });
    const touched = await ensureSchemaColumns(fake);
    assert.deepEqual(touched, []);
    assert.equal(fake.ran.filter((q) => q.startsWith("ALTER")).length, 0);
    // The shipped schema no longer requires any additive columns.
    assert.deepEqual(REQUIRED_COLUMNS, []);
  });

  it("skips tables that do not exist", async () => {
    const fake = executor({ users: ["id", "email_verified"] });
    const touched = await ensureSchemaColumns(
      fake,
      [],
      [
        { table: "users", column: "email_verified" },
        { table: "absent_table", column: "whatever" },
      ],
    );
    assert.deepEqual(touched, ["-users.email_verified"]);
    assert.ok(!fake.ran.some((q) => q.includes("absent_table DROP")));
  });
});
