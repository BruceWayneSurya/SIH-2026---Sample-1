import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

/**
 * SQLite file-based database — zero external server required.
 *
 * The database lives at data/app.db (inside the project) by default, so the
 * demo runs with `npm run dev` without installing PostgreSQL. Override by
 * setting DATABASE_URL to an absolute path or a `file:` URL, e.g.:
 *   DATABASE_URL=/var/lib/vidyasetu/app.db
 *   DATABASE_URL=file:///tmp/vidyasetu.db
 */
function resolveDbPath(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    return path.join(process.cwd(), "data", "app.db");
  }
  // Strip optional file:// prefix
  if (raw.startsWith("file://")) return raw.slice("file://".length);
  // If it looks like a PostgreSQL URL, fall back to the default
  if (raw.startsWith("postgres://") || raw.startsWith("postgresql://")) {
    console.warn(
      "[db] DATABASE_URL looks like PostgreSQL but the app now uses SQLite. " +
        "Set it to a file path (or leave unset) to use data/app.db.",
    );
    return path.join(process.cwd(), "data", "app.db");
  }
  return raw;
}

const DB_PATH = resolveDbPath();
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

if (!process.env.DATABASE_URL && process.env.NODE_ENV !== "production") {
  console.info(`[db] using SQLite at ${DB_PATH}`);
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsSqlite?: Database.Database;
};

/**
 * Open (or reuse) the SQLite connection. `better-sqlite3` opens the file
 * immediately but creates it if missing — importing this module is safe
 * even before the schema has been migrated.
 */
export const sqlite =
  globalForDb.__arenaNextJsSqlite ??
  new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsSqlite = sqlite;
}

export const db = drizzle(sqlite);
