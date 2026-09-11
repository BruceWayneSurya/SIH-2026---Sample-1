import path from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { client, db, initializeDatabase } from "./index";
import { ensureSchemaColumns } from "./ensure-columns";

export async function migrateDatabase(): Promise<void> {
  await initializeDatabase();
  // Historical PostgreSQL migrations in drizzle/ are deliberately not applied.
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle", "sqlite") });
  // Adopt older SQLite files: add missing columns, retire stale ones.
  const changed = await ensureSchemaColumns(client);
  if (changed.length) console.info(`[db] schema columns updated: ${changed.join(", ")}`);
}
