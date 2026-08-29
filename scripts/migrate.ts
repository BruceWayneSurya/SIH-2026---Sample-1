import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";

export function resolveDbPath(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) return path.join(process.cwd(), "data", "app.db");
  if (raw.startsWith("file://")) return raw.slice("file://".length);
  if (raw.startsWith("postgres://") || raw.startsWith("postgresql://")) {
    return path.join(process.cwd(), "data", "app.db");
  }
  return raw;
}

/**
 * Run pending Drizzle migrations. Accepts an optional existing better-sqlite3
 * Database instance so it can be reused from the running Next server (avoids
 * spawning a child process, which is unreliable cross-platform on Windows).
 */
export async function runMigrations(existing?: Database.Database): Promise<void> {
  const dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const ownsConnection = !existing;
  const sqlite = existing ?? new Database(dbPath);
  try {
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    const db = drizzle(sqlite);
    await migrate(db, {
      migrationsFolder: path.join(process.cwd(), "drizzle"),
    });
    console.log(`Migrations applied to ${dbPath}.`);
  } finally {
    if (ownsConnection) sqlite.close();
  }
}

// CLI entry point: `tsx scripts/migrate.ts`
if (require.main === module) {
  runMigrations().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
