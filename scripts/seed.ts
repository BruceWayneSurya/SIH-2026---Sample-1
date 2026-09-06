import "dotenv/config";
import { publicDatabaseError } from "../src/db/config";
import { client } from "../src/db";
import { ensureDemoDatabase } from "../src/lib/ensure-db";

ensureDemoDatabase()
  .catch((error) => {
    console.error("Database setup failed:", publicDatabaseError(error));
    process.exitCode = 1;
  })
  .finally(() => client.close());
