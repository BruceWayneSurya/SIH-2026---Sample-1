import { mkdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createClient, type Client } from "@libsql/client";

/**
 * libSQL's local driver is synchronous underneath its async API. A native busy
 * timeout would block the event loop while another request needs it to commit.
 * Yield between lock retries instead. Failed BEGIN IMMEDIATE calls are retried
 * before a transaction callback runs; a callback is never replayed.
 */
export async function retrySqliteBusy<T>(operation: () => Promise<T>, timeoutMs = 5_000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let delay = 10;
  for (;;) {
    try {
      return await operation();
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
      const busy = code.startsWith("SQLITE_BUSY") || code === "TRANSACTION_ACTIVE";
      if (!busy || Date.now() >= deadline) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, 100);
    }
  }
}

export function openSqliteClient(filename: string): Client {
  mkdirSync(path.dirname(filename), { recursive: true });
  const raw = createClient({ url: pathToFileURL(filename).href, intMode: "number", timeout: 0 });
  const retryable = new Set(["execute", "batch", "transaction", "migrate"]);

  // Bind methods to the original client: the driver uses private class fields.
  return new Proxy(raw, {
    get(target, property) {
      const value = Reflect.get(target, property, target);
      if (typeof value !== "function") return value;
      const call = value.bind(target);
      if (typeof property === "string" && retryable.has(property)) {
        return (...args: unknown[]) => retrySqliteBusy(() => call(...args));
      }
      return call;
    },
  });
}
