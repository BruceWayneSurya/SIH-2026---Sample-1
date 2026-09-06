import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, it } from "node:test";
import { resolveSqlitePath } from "../src/db/config";

const cwd = path.resolve(".cache", "sqlite-config");

describe("SQLite DATABASE_URL", () => {
  it("defaults an unset variable to the project data directory", () => {
    const previous = process.env.DATABASE_URL;
    try {
      delete process.env.DATABASE_URL;
      assert.equal(resolveSqlitePath(undefined, cwd), path.join(cwd, "data", "app.db"));
    } finally {
      if (previous === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previous;
    }
  });
  for (const value of ["", "  ", "\n\t"]) {
    it(`defaults a blank ${JSON.stringify(value)} to data/app.db`, () => {
      assert.equal(resolveSqlitePath(value, cwd), path.join(cwd, "data", "app.db"));
    });
  }
  it("resolves relative file names from the project root", () => {
    assert.equal(resolveSqlitePath("./data/custom.db", cwd), path.join(cwd, "data", "custom.db"));
    assert.equal(resolveSqlitePath("another.db", cwd), path.join(cwd, "another.db"));
  });
  it("preserves absolute file paths", () => {
    const file = path.join(cwd, "absolute.db");
    assert.equal(resolveSqlitePath(file, cwd), file);
  });
  it("handles file:// URLs, escaped filenames, and file: shorthand", () => {
    const file = path.join(cwd, "revision notes #1.db");
    assert.equal(resolveSqlitePath(pathToFileURL(file).href, cwd), file);
    assert.equal(resolveSqlitePath("file:./data/app.db", cwd), path.join(cwd, "data", "app.db"));
    assert.equal(resolveSqlitePath("file:data/app.db", cwd), path.join(cwd, "data", "app.db"));
  });
  for (const input of [
    "postgresql://user:private-password@localhost/db",
    "https://example.com/app.db",
    "file://remote-server/app.db",
    "file:///data/app.db?mode=memory",
    "file:///data/app.db#fragment",
    "file:",
    ":memory:",
    "file::memory:",
    "bad\0name.db",
  ]) {
    it(`rejects invalid/persistent-database-incompatible input ${input.split(":")[0]}`, () => {
      assert.throws(() => resolveSqlitePath(input, cwd), (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /SQLite file path/);
        assert.ok(!error.message.includes("private-password"));
        return true;
      });
    });
  }
});
