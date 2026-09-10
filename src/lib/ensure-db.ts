import { databaseConnection, databaseKind } from "../db";
import { publicDatabaseError } from "../db/config";
import { migrateDatabase } from "../db/migrate";
import { seedDemoDatabase } from "../db/seed";
import { seedLearningContent } from "../db/seed-learning";

const globals = globalThis as typeof globalThis & {
  __pragyanEnsureDb?: { connection: typeof databaseConnection; promise: Promise<void> };
};

/** Migrate/seed once per connection, preserving existing shared data. */
export function ensureDemoDatabase(): Promise<void> {
  if (globals.__pragyanEnsureDb?.connection !== databaseConnection) {
    const promise = (async () => {
      await migrateDatabase();
      const seeded = await seedDemoDatabase();
      // Outcome graph, RAG corpus, class notebooks and the Class 8 roster are
      // additive and idempotent, so an existing school database gains the
      // mastery map without losing a single stored attempt.
      const learning = await seedLearningContent();
      console.info(
        `[db] ${databaseKind} SQLite ready (${seeded ? "demo data added" : "existing data preserved"}; ` +
          (learning.skipped
            ? "learning content already present"
            : `learning content seeded: ${learning.outcomes} outcomes, ${learning.documents} sources, ` +
              `${learning.chunks} passages, ${learning.tagged} questions tagged, ${learning.roster} roster students`)+")",
      );
    })().catch((error) => {
      globals.__pragyanEnsureDb = undefined;
      console.error("[db]", publicDatabaseError(error));
      throw error;
    });
    globals.__pragyanEnsureDb = { connection: databaseConnection, promise };
  }
  return globals.__pragyanEnsureDb.promise;
}
