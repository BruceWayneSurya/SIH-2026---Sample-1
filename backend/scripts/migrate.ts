import "dotenv/config";
import { pathToFileURL } from "node:url";

function isMain(metaUrl: string): boolean {
  return process.argv[1] ? metaUrl === pathToFileURL(process.argv[1]).href : false;
}

import path from "node:path";
import fs from "node:fs";
import { drizzle } from "drizzle-orm/sql-js";
import { migrate } from "drizzle-orm/sql-js/migrator";
import initSqlJs from "sql.js";

export function resolveDbPath(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) return path.join(process.cwd(), "data", "app.db");
  if (raw.startsWith("file://")) return raw.slice("file://".length);
  if (raw.startsWith("postgres://") || raw.startsWith("postgresql://")) {
    return path.join(process.cwd(), "data", "app.db");
  }
  return raw;
}

/** Run pending Drizzle migrations against the SQLite file at dbPath. */
export async function runMigrations(dbPath?: string): Promise<void> {
  const resolved = dbPath ?? resolveDbPath();
  fs.mkdirSync(path.dirname(resolved), { recursive: true });

  const SQL = await initSqlJs({
    locateFile: (file: string) =>
      path.join(process.cwd(), "node_modules", "sql.js", "dist", file),
  });

  let sqlite: initSqlJs.Database;
  if (fs.existsSync(resolved) && fs.statSync(resolved).size > 0) {
    const buf = fs.readFileSync(resolved);
    sqlite = new SQL.Database(new Uint8Array(buf));
  } else {
    sqlite = new SQL.Database();
  }
  sqlite.run("PRAGMA foreign_keys = ON;");

  try {
    const db = drizzle(sqlite);
    migrate(db, {
      migrationsFolder: path.join(process.cwd(), "drizzle"),
    });
    // Persist
    const data = sqlite.export();
    fs.writeFileSync(resolved, Buffer.from(data));
    console.log(`Migrations applied to ${resolved}.`);
  } finally {
    sqlite.close();
  }
}

// CLI entry point: `tsx scripts/migrate.ts`
if (isMain(import.meta.url)) {
  runMigrations().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
