import { drizzle } from "drizzle-orm/libsql";
import type { Client } from "@libsql/client";
import { resolveDatabaseConfig, type DatabaseConfig } from "./config";
import { openDatabaseClient } from "./connection";

// Resolving configuration must not crash module imports or the public landing
// page. Connections are opened on the first DB operation, never during build.
let configuration: DatabaseConfig | undefined;
let configurationError: unknown;
try { configuration = resolveDatabaseConfig(); } catch (error) { configurationError = error; }
export const databaseConfig = configuration;
export const databasePath = configuration?.kind === "local" ? configuration.filename : undefined;
export const databaseKind = configuration?.kind ?? "unconfigured";

const globals = globalThis as typeof globalThis & {
  __pragyanConnection?: { identity: string; client?: Client; ready?: Promise<void> };
};
// This identity remains server-side; it is never logged or returned to a client.
const identity = JSON.stringify(configuration ?? { kind: "unconfigured" });
if (!globals.__pragyanConnection || globals.__pragyanConnection.identity !== identity || globals.__pragyanConnection.client?.closed) {
  globals.__pragyanConnection = { identity };
}
const connection = globals.__pragyanConnection;
export const databaseConnection = connection;

function getClient(): Client {
  if (!configuration) throw configurationError;
  return connection.client ??= openDatabaseClient(configuration);
}

// Drizzle's async driver needs a Client synchronously. A lazy proxy lets public
// pages/builds run without opening files, loading native code, or doing network IO.
export const client = new Proxy({} as Client, {
  get(_target, property) {
    if (property === "then") return undefined;
    if (property === "closed") return connection.client?.closed ?? false;
    if (property === "protocol") return configuration?.kind === "remote" ? "http" : "file";
    if (property === "close") return () => connection.client?.close();
    return (...args: unknown[]) => {
      const real = getClient();
      const method = Reflect.get(real, property, real);
      return typeof method === "function" ? method.apply(real, args) : method;
    };
  },
});
export const db = drizzle(client);

export function initializeDatabase(): Promise<void> {
  if (!connection.ready) {
    connection.ready = (async () => {
      getClient();
      if (configuration?.kind === "local") {
        await client.execute("PRAGMA journal_mode = WAL");
        await client.execute("PRAGMA foreign_keys = ON");
      }
      // The hosted service manages connection pragmas. Never try to change its
      // journal mode or create a local replica inside a serverless function.
    })().catch((error) => {
      connection.ready = undefined;
      throw error;
    });
  }
  return connection.ready;
}
