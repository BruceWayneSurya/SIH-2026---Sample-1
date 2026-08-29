import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { sqlite } from "@/db";

const g = globalThis as typeof globalThis & {
  __vsEnsureDb?: Promise<void>;
};

function run(scriptRelPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tsx = path.join(process.cwd(), "node_modules", ".bin", "tsx");
    const child = spawn(tsx, [scriptRelPath], {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${scriptRelPath} exited ${code}`));
    });
  });
}

function guestExistsSync(): boolean {
  try {
    const row = sqlite
      .prepare(`select id from users where email = ? limit 1`)
      .get("guest.student@vidyasetu.gov.in") as { id: number } | undefined;
    return !!row;
  } catch {
    // Table probably doesn't exist yet — migrations haven't run.
    return false;
  }
}

function usersTableExists(): boolean {
  try {
    sqlite.prepare(`select 1 from users limit 1`).get();
    return true;
  } catch {
    return false;
  }
}

async function boot(): Promise<void> {
  const dbPath = (sqlite as unknown as { name: string }).name;
  const needsInit = !fs.existsSync(dbPath) || fs.statSync(dbPath).size === 0;

  if (needsInit || !usersTableExists()) {
    console.warn(`[db] initializing SQLite at ${dbPath}`);
    await run("scripts/migrate.ts");
  }

  if (!guestExistsSync()) {
    console.warn("[db] demo data missing — running seed");
    await run("scripts/seed.ts");
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
