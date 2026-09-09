import path from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { client, db, initializeDatabase } from "./index";
import { ensureSchemaColumns } from "./ensure-columns";

export async function migrateDatabase(): Promise<void> {
  await initializeDatabase();
  // Historical PostgreSQL migrations in drizzle/ are deliberately not applied.
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle", "sqlite") });
  // Adopt SQLite files created before a column was introduced.
  const added = await ensureSchemaColumns(client);
  if (added.length) console.info(`[db] added missing columns: ${added.join(", ")}`);
}
