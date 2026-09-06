import { createClient } from "@libsql/client/web";
import type { Client } from "@libsql/client";
import type { DatabaseConfig } from "./config";
import { openSqliteClient, withBusyRetries } from "./sqlite-client";

/** The HTTP-only driver keeps native SQLite bindings out of Vercel execution. */
export function openDatabaseClient(config: DatabaseConfig): Client {
  return config.kind === "remote"
    ? withBusyRetries(createClient({ url: config.url, authToken: config.authToken, intMode: "number" }))
    : openSqliteClient(config.filename);
}
