import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { resolveSqlitePath } from "./src/db/config";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle/sqlite",
  dbCredentials: { url: resolveSqlitePath() },
});
