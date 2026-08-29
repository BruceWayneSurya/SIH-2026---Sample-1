import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";

function resolveDbPath(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) return path.join(process.cwd(), "data", "app.db");
  if (raw.startsWith("file://")) return raw.slice("file://".length);
  if (raw.startsWith("postgres://") || raw.startsWith("postgresql://")) {
    return path.join(process.cwd(), "data", "app.db");
  }
  return raw;
}

const dbPath = resolveDbPath();
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

async function main() {
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite);
  await migrate(db, {
    migrationsFolder: path.join(process.cwd(), "drizzle"),
  });
  console.log(`Migrations applied to ${dbPath}.`);
  sqlite.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
