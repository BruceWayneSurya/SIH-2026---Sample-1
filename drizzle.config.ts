import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { resolveDatabaseConfig } from "./src/db/config";

const config = resolveDatabaseConfig();
const shared = { schema: "./src/db/schema.ts", out: "./drizzle/sqlite" };

export default config.kind === "remote"
  ? defineConfig({ ...shared, dialect: "turso", dbCredentials: { url: config.url, authToken: config.authToken } })
  : defineConfig({ ...shared, dialect: "sqlite", dbCredentials: { url: config.filename } });
