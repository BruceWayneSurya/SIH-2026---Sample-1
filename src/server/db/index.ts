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

/**
 * Next.js compiles instrumentation, pages and route handlers as separate
 * bundles; without this global cache each bundle would instantiate its own
 * copy of this module (and therefore its own in-memory database), so a write
 * made in one route handler would be invisible to every other route and would
 * never reach the disk. Caching on `globalThis` guarantees exactly ONE shared
 * sqlite instance per server process — critical for the app to behave
 * correctly once deployed.
 */
type DbInstances = {
  sqlite: SqlJsDatabase;
  db: SQLJsDatabase;
  flush: () => void;
  close: () => void;
};

const globalForDb = globalThis as typeof globalThis & {
  __pragyanDb?: DbInstances;
  __pragyanDbInit?: Promise<DbInstances>;
};

function isWriteSql(sql: string): boolean {
  const t = sql.trimStart().toUpperCase();
  return (
    t.startsWith("INSERT") ||
    t.startsWith("UPDATE") ||
    t.startsWith("DELETE") ||
    t.startsWith("CREATE") ||
    t.startsWith("DROP") ||
    t.startsWith("ALTER") ||
    t.startsWith("REPLACE") ||
    t.startsWith("BEGIN") ||
    t.startsWith("COMMIT")
  );
}

async function createDbInstances(): Promise<DbInstances> {
  // ---- Load sql.js (WASM) and open (or create) the DB file ---------------
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

  // ---- Auto-persist to disk after writes ----------------------------------
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

  // Drizzle executes every statement through `prepare(sql)` + `stmt.run()`
  // (see drizzle-orm/sql-js/session.js), so intercepting `prepare` is the
  // reliable choke point for flagging mutations. `run`/`exec` are also wrapped
  // to cover direct calls (migrations, raw SQL).
  const origPrepare = sqlite.prepare.bind(sqlite);
  sqlite.prepare = function (this: SqlJsDatabase, sql: string) {
    if (typeof sql === "string" && isWriteSql(sql)) markDirty();
    return origPrepare(sql);
  } as typeof sqlite.prepare;

  const origRun = sqlite.run.bind(sqlite);
  sqlite.run = function (
    this: SqlJsDatabase,
    sqlOrValues?: string | unknown[] | Record<string, unknown>,
    params?: unknown[] | Record<string, unknown>,
  ): SqlJsDatabase {
    if (typeof sqlOrValues === "string" && isWriteSql(sqlOrValues)) {
      markDirty();
      return origRun(sqlOrValues, params as never);
    }
    return origRun(sqlOrValues as never, params as never);
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

  return {
    sqlite,
    db: drizzle(sqlite),
    /** Force a flush to disk immediately. */
    flush: () => saveNow(),
    /** Close the database and flush (primarily for tests/CLI). */
    close: () => {
      if (dirty) saveNow();
      sqlite.close();
    },
  };
}

// Reuse the instance if another bundle already created it; cache the in-flight
// promise too, so concurrent first loads still converge on ONE instance.
let instances = globalForDb.__pragyanDb;
if (!instances) {
  const init = (globalForDb.__pragyanDbInit ??= createDbInstances());
  instances = await init;
  globalForDb.__pragyanDb = instances;
}
const ready: DbInstances = instances;

export const sqlite = ready.sqlite;

// ---- Drizzle ORM instance ------------------------------------------------
export const db: SQLJsDatabase = ready.db;

/** Force a flush to disk immediately. */
export function flushDb() {
  ready.flush();
}

/** Close the database and flush (primarily for tests/CLI). */
export function closeDb() {
  ready.close();
}
