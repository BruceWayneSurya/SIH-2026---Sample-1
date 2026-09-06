import "dotenv/config";
import { client } from "../src/db";
import { ensureDemoDatabase } from "../src/lib/ensure-db";

ensureDemoDatabase()
  .catch((error) => {
    console.error("Database setup failed:", error);
    process.exitCode = 1;
  })
  .finally(() => client.close());
