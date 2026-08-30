import fs from "node:fs";
import path from "node:path";
import { sqlite, db, DB_PATH } from "@/server/db";
import { drizzle } from "drizzle-orm/sql-js";
import { migrate } from "drizzle-orm/sql-js/migrator";
import { seedDemoData } from "../../../scripts/seed";

const g = globalThis as typeof globalThis & {
  __vsEnsureDb?: Promise<void>;
};

function usersTableReady(): boolean {
  try {
    sqlite.exec("SELECT 1 FROM users LIMIT 1;");
    return true;
  } catch {
    return false;
  }
}

function guestCount(): number {
  try {
    const res = sqlite.exec(
      `SELECT COUNT(*) AS n FROM users WHERE email = 'guest.student@pragyan.gov.in';`,
    );
    if (!res.length || !res[0].values.length) return 0;
    return Number(res[0].values[0][0] ?? 0);
  } catch {
    return 0;
  }
}

async function boot(): Promise<void> {
  const needsInit = !fs.existsSync(DB_PATH) || fs.statSync(DB_PATH).size === 0;

  if (needsInit || !usersTableReady()) {
    console.warn(`[db] initializing SQLite at ${DB_PATH}`);
    migrate(drizzle(sqlite), {
      migrationsFolder: path.join(process.cwd(), "drizzle"),
    });
  }

  if (guestCount() === 0) {
    console.warn("[db] demo data missing — running seed");
    // Seed in-place against the already-open (in-memory) DB, then flush to disk.
    await seedDemoData({
      sqlite,
      db,
      persist: (sq) => {
        const out = sq.export();
        fs.writeFileSync(DB_PATH, Buffer.from(out));
      },
    });
  }

  console.log(`[db] demo database ready (${path.relative(process.cwd(), DB_PATH)})`);
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
