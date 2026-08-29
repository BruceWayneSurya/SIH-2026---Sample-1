import fs from "node:fs";
import path from "node:path";
import { sqlite } from "@/db";
import { runMigrations } from "../../scripts/migrate";
import { seedDemoData } from "../../scripts/seed";

const g = globalThis as typeof globalThis & {
  __vsEnsureDb?: Promise<void>;
};

function usersTableReady(): boolean {
  try {
    sqlite.prepare(`select 1 from users limit 1`).get();
    return true;
  } catch {
    return false;
  }
}

function guestExists(): boolean {
  try {
    const row = sqlite
      .prepare(`select id from users where email = ? limit 1`)
      .get("guest.student@vidyasetu.gov.in") as { id: number } | undefined;
    return !!row;
  } catch {
    return false;
  }
}

async function boot(): Promise<void> {
  const dbPath = (sqlite as unknown as { name: string }).name;
  const needsInit = !fs.existsSync(dbPath) || fs.statSync(dbPath).size === 0;

  // Run migrations in-process (reuses the already-open SQLite connection).
  if (needsInit || !usersTableReady()) {
    console.warn(`[db] initializing SQLite at ${dbPath}`);
    await runMigrations(sqlite);
  }

  // Seed demo data if missing — also in-process, on the same connection.
  if (!guestExists()) {
    console.warn("[db] demo data missing — running seed");
    await seedDemoData(sqlite);
  }

  console.log(`[db] demo database ready (${path.relative(process.cwd(), dbPath)})`);
}

/** Idempotent: migrates and seeds the SIH demo SQLite database if needed. */
export function ensureDemoDatabase(): Promise<void> {
  if (!g.__vsEnsureDb) {
    g.__vsEnsureDb = boot().catch((err) => {
      g.__vsEnsureDb = undefined;
      console.error("[db] ensure failed", err);
      throw err;
    });
  }
  return g.__vsEnsureDb;
}
