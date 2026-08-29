import { spawn } from "node:child_process";
import path from "node:path";
import { Client } from "pg";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db";
const ADMIN_URL = DATABASE_URL.replace(/\/[^/]+$/, "/postgres");

const g = globalThis as typeof globalThis & {
  __vsEnsureDb?: Promise<void>;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL },
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} exited ${code}`));
    });
  });
}

async function ping(url: string): Promise<boolean> {
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 2000 });
  try {
    await client.connect();
    await client.query("select 1");
    await client.end();
    return true;
  } catch {
    try {
      await client.end();
    } catch {
      /* ignore */
    }
    return false;
  }
}

async function guestExists(): Promise<boolean> {
  const client = new Client({ connectionString: DATABASE_URL, connectionTimeoutMillis: 2500 });
  try {
    await client.connect();
    const r = await client.query(
      "select 1 from users where email = $1 limit 1",
      ["guest.student@vidyasetu.gov.in"],
    );
    await client.end();
    return (r.rowCount ?? 0) > 0;
  } catch {
    try {
      await client.end();
    } catch {
      /* ignore */
    }
    return false;
  }
}

async function startEmbeddedPostgres(): Promise<void> {
  if (await ping(ADMIN_URL)) return;
  const child = spawn(process.execPath, [path.join(process.cwd(), "scripts/dev-pg.mjs")], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "ignore",
    detached: true,
  });
  child.unref();
  for (let i = 0; i < 40; i++) {
    if (await ping(ADMIN_URL)) return;
    await sleep(250);
  }
  throw new Error("embedded postgres did not become ready");
}

async function boot(): Promise<void> {
  if (!(await ping(DATABASE_URL)) && !(await ping(ADMIN_URL))) {
    console.warn("[db] no postgres on 5432 — starting embedded cluster");
    await startEmbeddedPostgres();
  }
  if (!(await ping(DATABASE_URL))) {
    // cluster is up but app_db may be missing; migrate/seed creates tables
    const tsx = path.join(process.cwd(), "node_modules", ".bin", "tsx");
    await run(tsx, ["scripts/migrate.ts"]).catch(() => undefined);
  }
  if (!(await guestExists())) {
    console.warn("[db] demo data missing — running db:setup");
    const tsx = path.join(process.cwd(), "node_modules", ".bin", "tsx");
    await run(tsx, ["scripts/migrate.ts"]);
    await run(tsx, ["scripts/seed.ts"]);
  }
  console.log("[db] demo database ready");
}

/** Idempotent: starts Postgres, migrates and seeds the SIH demo if needed. */
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
