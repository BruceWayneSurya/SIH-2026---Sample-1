import { databaseConnection, databaseKind } from "../db";
import { publicDatabaseError } from "../db/config";
import { migrateDatabase } from "../db/migrate";
import { seedDemoDatabase } from "../db/seed";

const globals = globalThis as typeof globalThis & {
  __pragyanEnsureDb?: { connection: typeof databaseConnection; promise: Promise<void> };
};

/** Migrate/seed once per connection, preserving existing shared data. */
export function ensureDemoDatabase(): Promise<void> {
  if (globals.__pragyanEnsureDb?.connection !== databaseConnection) {
    const promise = (async () => {
      await migrateDatabase();
      const seeded = await seedDemoDatabase();
      console.info(`[db] ${databaseKind} SQLite ready (${seeded ? "demo data added" : "existing data preserved"})`);
    })().catch((error) => {
      globals.__pragyanEnsureDb = undefined;
      console.error("[db]", publicDatabaseError(error));
      throw error;
    });
    globals.__pragyanEnsureDb = { connection: databaseConnection, promise };
  }
  return globals.__pragyanEnsureDb.promise;
}
