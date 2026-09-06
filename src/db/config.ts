import path from "node:path";
import { fileURLToPath } from "node:url";

export class DatabaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseConfigurationError";
  }
}

export type DatabaseEnvironment = {
  [key: string]: string | undefined;
  DATABASE_URL?: string;
  DATABASE_AUTH_TOKEN?: string;
  TURSO_DATABASE_URL?: string;
  TURSO_AUTH_TOKEN?: string;
  VERCEL?: string;
};

export type DatabaseConfig =
  | { kind: "local"; filename: string }
  | { kind: "remote"; url: string; authToken: string };

/** One local path resolver for the app and all database CLIs. */
export function resolveSqlitePath(value = process.env.DATABASE_URL, cwd = process.cwd()): string {
  const input = value?.trim() || "./data/app.db";
  const invalid = () => new DatabaseConfigurationError(
    "DATABASE_URL must be a SQLite file path or a file:// URL. Leave it blank to use ./data/app.db locally.",
  );
  if (input.includes("\0") || input === ":memory:" || input === "file::memory:") throw invalid();

  if (input.startsWith("file:")) {
    try {
      const url = input.startsWith("file://") ? new URL(input) : null;
      if (url?.search || url?.hash) throw invalid();
      const filename = url ? fileURLToPath(url) : decodeURIComponent(input.slice(5));
      if (!filename || filename.includes("\0") || (!url && /[?#]/.test(filename))) throw invalid();
      return path.resolve(cwd, filename);
    } catch {
      throw invalid();
    }
  }
  if (!path.isAbsolute(input) && /^[a-z][a-z\d+.-]*:/i.test(input)) throw invalid();
  return path.resolve(cwd, input);
}

/** Vercel needs a shared, durable database; never silently fall back to /tmp. */
export function resolveDatabaseConfig(env: DatabaseEnvironment = process.env, cwd = process.cwd()): DatabaseConfig {
  const value = env.DATABASE_URL?.trim() || env.TURSO_DATABASE_URL?.trim() || "";
  if (/^(libsql|https):/i.test(value)) {
    let url: URL;
    try { url = new URL(value); } catch {
      throw new DatabaseConfigurationError("Set a valid hosted SQLite URL in DATABASE_URL (libsql:// or https://).");
    }
    if (!url.hostname || url.username || url.password || url.search || url.hash || (url.pathname && url.pathname !== "/")) {
      throw new DatabaseConfigurationError("Use the hosted SQLite database URL without credentials, query parameters or a path. Put the token in DATABASE_AUTH_TOKEN.");
    }
    const authToken = env.DATABASE_AUTH_TOKEN?.trim() || env.TURSO_AUTH_TOKEN?.trim();
    if (!authToken || /[\r\n*]/.test(authToken) || /^(replace-|your-)/i.test(authToken)) {
      throw new DatabaseConfigurationError("Set DATABASE_AUTH_TOKEN (or TURSO_AUTH_TOKEN) in the server's environment settings, then redeploy.");
    }
    return { kind: "remote", url: url.href, authToken };
  }
  if (env.VERCEL === "1") {
    throw new DatabaseConfigurationError(
      "Vercel requires permanent hosted SQLite storage. Set DATABASE_URL to your libsql:// database URL and DATABASE_AUTH_TOKEN in Vercel Environment Variables, then redeploy. Local files and /tmp are not shared storage.",
    );
  }
  return { kind: "local", filename: resolveSqlitePath(value, cwd) };
}

export function publicDatabaseError(error: unknown): string {
  return error instanceof DatabaseConfigurationError
    ? error.message
    : "The learning database is unavailable. Check the hosted database connection and credentials in the server settings, then try again.";
}
