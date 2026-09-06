import { drizzle } from "drizzle-orm/libsql";
import type { Client } from "@libsql/client";
import { resolveSqlitePath } from "./config";
import { openSqliteClient } from "./sqlite-client";

export const databasePath = resolveSqlitePath();

const globalForDb = globalThis as typeof globalThis & {
  __vsSqlite?: { path: string; client: Client; ready?: Promise<void> };
};

// Reuse the connection pool and initialization promise across Next.js HMR and
// server bundles. A blank DATABASE_URL is intentional, not a PostgreSQL URL.
if (!globalForDb.__vsSqlite || globalForDb.__vsSqlite.path !== databasePath || globalForDb.__vsSqlite.client.closed) {
  globalForDb.__vsSqlite = { path: databasePath, client: openSqliteClient(databasePath) };
}
const connection = globalForDb.__vsSqlite;
export const client = connection.client;
export const db = drizzle(client);

export function initializeDatabase(): Promise<void> {
  if (!connection.ready) {
    connection.ready = (async () => {
      // WAL permits reads while a vote/upload transaction is committing.
      await client.execute("PRAGMA journal_mode = WAL");
      await client.execute("PRAGMA foreign_keys = ON");
    })().catch((error) => {
      connection.ready = undefined;
      throw error;
    });
  }
  return connection.ready;
}
