/**
 * Column adoption and retirement for databases created by earlier releases.
 *
 * `drizzle/sqlite/0000_*.sql` is deliberately idempotent (`CREATE TABLE IF NOT
 * EXISTS`) so an existing SQLite file can be adopted without losing data, and
 * SQLite has no `ADD/DROP COLUMN IF [NOT] EXISTS`. Schema evolution is
 * therefore handled here, once, after the SQL migrations run:
 *
 *   - REQUIRED_COLUMNS adds columns an older database may still be missing.
 *   - STALE_COLUMNS drops columns a newer schema no longer uses — the faculty
 *     email-verification suite (one-time codes, trust tiers, review queue)
 *     was removed, so its user columns are retired here rather than in a
 *     migration, keeping re-runs and journal-less adoption safe.
 */

export const REQUIRED_COLUMNS: { table: string; column: string; ddl: string }[] =
  [];

/** Columns removed from the schema that older databases may still carry. */
export const STALE_COLUMNS: { table: string; column: string }[] = [
  { table: "users", column: "email_verified" },
  { table: "users", column: "email_verified_at" },
  { table: "users", column: "email_domain" },
  { table: "users", column: "verification_status" },
  { table: "users", column: "verified_by" },
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

/** Adds missing and drops stale columns; returns the names it touched. */
export async function ensureSchemaColumns(
  executor: ColumnExecutor,
  required: typeof REQUIRED_COLUMNS = REQUIRED_COLUMNS,
  stale: typeof STALE_COLUMNS = STALE_COLUMNS,
): Promise<string[]> {
  const touched: string[] = [];
  for (const table of [
    ...new Set([...required.map((r) => r.table), ...stale.map((r) => r.table)]),
  ]) {
    const info = await executor.execute(`PRAGMA table_info(${table})`);
    if (info.rows.length === 0) continue; // table absent — migrations create it
    const present = new Set(info.rows.map(columnName));
    for (const entry of required.filter((r) => r.table === table)) {
      if (present.has(entry.column)) continue;
      await executor.execute(entry.ddl);
      touched.push(`+${table}.${entry.column}`);
    }
    for (const entry of stale.filter((r) => r.table === table)) {
      if (!present.has(entry.column)) continue;
      await executor.execute(
        `ALTER TABLE ${table} DROP COLUMN ${entry.column}`,
      );
      touched.push(`-${table}.${entry.column}`);
    }
  }
  return touched;
}
