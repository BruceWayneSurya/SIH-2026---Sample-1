import { databasePath } from "../db";
import { migrateDatabase } from "../db/migrate";
import { seedDemoDatabase } from "../db/seed";

const g = globalThis as typeof globalThis & {
  __vsEnsureDb?: Promise<void>;
};

/** Create/migrate SQLite and seed a fresh database; never reset existing data. */
export function ensureDemoDatabase(): Promise<void> {
  if (!g.__vsEnsureDb) {
    g.__vsEnsureDb = (async () => {
      await migrateDatabase();
      const seeded = await seedDemoDatabase();
      console.log(`[db] SQLite ready: ${databasePath}${seeded ? " (demo data added)" : " (existing data preserved)"}`);
    })().catch((error) => {
      g.__vsEnsureDb = undefined;
      console.error("[db] SQLite setup failed", error);
      throw error;
    });
  }
  return g.__vsEnsureDb;
}
