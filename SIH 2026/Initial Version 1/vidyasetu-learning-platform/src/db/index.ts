import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * Matches the default in drizzle.config.json and scripts/seed.ts so the demo
 * runs with zero configuration on a local machine. Set DATABASE_URL to
 * override (e.g. a hosted PostgreSQL instance).
 */
const DEFAULT_DATABASE_URL =
  "postgresql://postgres:postgres@127.0.0.1:5432/app_db";

const databaseUrl = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;

if (!process.env.DATABASE_URL && process.env.NODE_ENV !== "production") {
  console.warn(
    "[db] DATABASE_URL is not set — falling back to the local demo database " +
      "at 127.0.0.1:5432/app_db. Run `npm run db:setup` to create and seed it.",
  );
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

/**
 * The pool is created lazily-friendly: `new Pool()` never connects until the
 * first query, so importing this module can't crash the app (or the login
 * page) when the database is temporarily unavailable. Routes surface a
 * friendly error instead.
 */
export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
