import "dotenv/config";
import { client, databasePath } from "../src/db";
import { migrateDatabase } from "../src/db/migrate";

migrateDatabase()
  .then(() => console.log(`SQLite migrations applied: ${databasePath}`))
  .catch((error) => {
    console.error("Database migration failed:", error);
    process.exitCode = 1;
  })
  .finally(() => client.close());
