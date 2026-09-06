import path from "node:path";
import { fileURLToPath } from "node:url";

/** One path resolver for Next.js, migrations, seeding and Drizzle Kit. */
export function resolveSqlitePath(value = process.env.DATABASE_URL, cwd = process.cwd()): string {
  const input = value?.trim() || "./data/app.db";
  const invalid = () => new Error(
    "DATABASE_URL must be a SQLite file path or a file:// URL. Leave it blank to use ./data/app.db.",
  );
  if (input.includes("\0") || input === ":memory:" || input === "file::memory:") throw invalid();

  if (input.startsWith("file:")) {
    try {
      if (input.startsWith("file://")) {
        const url = new URL(input);
        if (url.search || url.hash) throw invalid();
        return path.resolve(cwd, fileURLToPath(url));
      }
      // Also accept common SQLite shorthand such as file:./data/app.db.
      const filename = input.slice(5);
      if (!filename || /[?#]/.test(filename)) throw invalid();
      return path.resolve(cwd, decodeURIComponent(filename));
    } catch {
      throw invalid();
    }
  }

  if (!path.isAbsolute(input) && /^[a-z][a-z\d+.-]*:/i.test(input)) throw invalid();
  return path.resolve(cwd, input);
}
