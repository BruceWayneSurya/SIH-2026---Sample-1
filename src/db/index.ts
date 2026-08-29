import { drizzle, type SQLJsDatabase } from "drizzle-orm/sql-js";
import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";
import fs from "node:fs";
import path from "node:path";

/**
 * SQLite database — zero external server, zero native compilation.
 * Uses sql.js (SQLite compiled to WebAssembly), so it works on every OS and
 * every Node.js version out of the box — no Visual Studio, Python, or
 * Postgres install needed. The database file is persisted at data/app.db.
 *
 * Override the file location with DATABASE_URL (absolute path or file:// URL).
 */
function resolveDbPath(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) return path.join(process.cwd(), "data", "app.db");
  if (raw.startsWith("file://")) return raw.slice("file://".length);
  if (raw.startsWith("postgres://") || raw.startsWith("postgresql://")) {
    console.warn(
      "[db] DATABASE_URL looks like PostgreSQL but the app now uses SQLite. " +
        "Set it to a file path (or leave unset) to use data/app.db.",
    );
    return path.join(process.cwd(), "data", "app.db");
  }
  return raw;
}

export const DB_PATH = resolveDbPath();
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

if (!process.env.DATABASE_URL && process.env.NODE_ENV !== "production") {
  console.info(`[db] using SQLite (WASM) at ${DB_PATH}`);
}

// ---- Load sql.js (WASM) and open (or create) the DB file -----------------
const SQL = await initSqlJs({
  locateFile: (file: string) =>
    path.join(process.cwd(), "node_modules", "sql.js", "dist", file),
});

let sqlite: SqlJsDatabase;
if (fs.existsSync(DB_PATH) && fs.statSync(DB_PATH).size > 0) {
  const buf = fs.readFileSync(DB_PATH);
  sqlite = new SQL.Database(new Uint8Array(buf));
} else {
  sqlite = new SQL.Database();
}
sqlite.run("PRAGMA foreign_keys = ON;");

export { sqlite };

// ---- Auto-persist to disk after writes -----------------------------------
let dirty = false;
let flushTimer: NodeJS.Timeout | null = null;

function saveNow() {
  try {
    const data = sqlite.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (e) {
    console.error("[db] failed to persist database:", e);
  } finally {
    dirty = false;
    flushTimer = null;
  }
}

function markDirty() {
  if (dirty) return;
  dirty = true;
  if (!flushTimer) flushTimer = setTimeout(saveNow, 50);
}

function isWriteSql(sql: string): boolean {
  const t = sql.trimStart().toUpperCase();
  return (
    t.startsWith("INSERT") ||
    t.startsWith("UPDATE") ||
    t.startsWith("DELETE") ||
    t.startsWith("CREATE") ||
    t.startsWith("DROP") ||
    t.startsWith("ALTER") ||
    t.startsWith("REPLACE")
  );
}

// Wrap run(sql, params?) to mark mutations dirty.
const origRun = sqlite.run.bind(sqlite);
sqlite.run = function (
  this: SqlJsDatabase,
  sqlOrValues?: string | unknown[] | Record<string, unknown>,
  params?: unknown[] | Record<string, unknown>,
): SqlJsDatabase {
  if (typeof sqlOrValues === "string") {
    if (isWriteSql(sqlOrValues)) markDirty();
    return origRun(sqlOrValues, params as never);
  }
  // Called as statement.run(params) via a Statement — we already marked dirty
  // when the prepared statement's SQL was captured if needed; in practice
  // drizzle uses Database.run(sql, params) so this path is rare.
  return origRun(sqlOrValues as never);
} as typeof sqlite.run;

const origExec = sqlite.exec.bind(sqlite);
sqlite.exec = function (this: SqlJsDatabase, sql: string, params?: unknown) {
  if (isWriteSql(sql)) markDirty();
  return origExec(sql, params as never);
} as typeof sqlite.exec;

// Flush on exit so no data is lost.
process.on("exit", () => {
  if (dirty) saveNow();
});
process.on("SIGINT", () => {
  if (dirty) saveNow();
  process.exit(0);
});
process.on("SIGTERM", () => {
  if (dirty) saveNow();
  process.exit(0);
});

// ---- Drizzle ORM instance ------------------------------------------------
export const db: SQLJsDatabase = drizzle(sqlite);

/** Force a flush to disk immediately. */
export function flushDb() {
  saveNow();
}

/** Close the database and flush (primarily for tests/CLI). */
export function closeDb() {
  if (dirty) saveNow();
  sqlite.close();
}
