import "dotenv/config";
import { client, databaseKind } from "../src/db";
import { publicDatabaseError } from "../src/db/config";
import { migrateDatabase } from "../src/db/migrate";

migrateDatabase()
  .then(() => console.log(`SQLite migrations applied: ${databaseKind} database`))
  .catch((error) => {
    console.error("Database migration failed:", publicDatabaseError(error));
    process.exitCode = 1;
  })
  .finally(() => client.close());
