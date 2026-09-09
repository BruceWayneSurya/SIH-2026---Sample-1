/**
 * Columns that a database created before the faculty-verification release may
 * still be missing.
 *
 * `drizzle/sqlite/0000_*.sql` is deliberately idempotent (`CREATE TABLE IF NOT
 * EXISTS`) so an existing SQLite file can be adopted without losing data, and
 * SQLite has no `ADD COLUMN IF NOT EXISTS`. These columns are therefore added
 * here, once, after the SQL migrations run.
 */
export const REQUIRED_COLUMNS: { table: string; column: string; ddl: string }[] =
  [
    {
      table: "users",
      column: "email_verified",
      ddl: "ALTER TABLE users ADD COLUMN email_verified integer NOT NULL DEFAULT false",
    },
    {
      table: "users",
      column: "email_verified_at",
      ddl: "ALTER TABLE users ADD COLUMN email_verified_at integer",
    },
    {
      table: "users",
      column: "email_domain",
      ddl: "ALTER TABLE users ADD COLUMN email_domain text",
    },
    {
      table: "users",
      column: "verification_status",
      ddl: "ALTER TABLE users ADD COLUMN verification_status text NOT NULL DEFAULT 'unverified'",
    },
    {
      table: "users",
      column: "verified_by",
      ddl: "ALTER TABLE users ADD COLUMN verified_by text",
    },
  ];

/** The lazy libSQL client (or anything that runs a raw statement). */
export type ColumnExecutor = {
  execute: (query: string) => Promise<{ rows: unknown[] }>;
};

function columnName(row: unknown): string {
  if (row && typeof row === "object" && "name" in row)
    return String((row as { name: unknown }).name ?? "");
  return "";
}

/** Adds any missing column and returns the names it added. */
export async function ensureSchemaColumns(
  executor: ColumnExecutor,
  required: typeof REQUIRED_COLUMNS = REQUIRED_COLUMNS,
): Promise<string[]> {
  const added: string[] = [];
  for (const table of [...new Set(required.map((r) => r.table))]) {
    const info = await executor.execute(`PRAGMA table_info(${table})`);
    const present = new Set(info.rows.map(columnName));
    for (const entry of required.filter((r) => r.table === table)) {
      if (present.has(entry.column)) continue;
      await executor.execute(entry.ddl);
      added.push(`${table}.${entry.column}`);
    }
  }
  return added;
}
