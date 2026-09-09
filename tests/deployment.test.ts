import assert from "node:assert/strict";
import { describe, it } from "node:test";
import path from "node:path";
import { DatabaseConfigurationError, publicDatabaseError, resolveDatabaseConfig } from "../src/db/config";
import { assertDeploymentConfig } from "../src/lib/deployment";

const remote = { DATABASE_URL: "libsql://test-db.example.turso.io", DATABASE_AUTH_TOKEN: "test-token-not-a-credential" };
describe("Vercel / hosted SQLite configuration", () => {
  it("keeps blank local DATABASE_URL compatible with the existing .env", () => {
    assert.deepEqual(resolveDatabaseConfig({}), { kind: "local", filename: path.resolve("data/app.db") });
    assert.equal(resolveDatabaseConfig({ DATABASE_URL: "./another.db" }).kind, "local");
  });
  it("uses a remote URL and a separate, server-only token", () => {
    assert.deepEqual(resolveDatabaseConfig(remote), { kind: "remote", url: remote.DATABASE_URL, authToken: remote.DATABASE_AUTH_TOKEN });
    assert.equal(resolveDatabaseConfig({ ...remote, DATABASE_URL: "https://test-db.example.turso.io" }).kind, "remote");
  });
  it("supports Turso integration variable names and an intentionally blank local URL", () => {
    assert.deepEqual(resolveDatabaseConfig({ DATABASE_URL: "", TURSO_DATABASE_URL: remote.DATABASE_URL, TURSO_AUTH_TOKEN: remote.DATABASE_AUTH_TOKEN, VERCEL: "1" }), { kind: "remote", url: remote.DATABASE_URL, authToken: remote.DATABASE_AUTH_TOKEN });
  });
  for (const value of [undefined, "", "./data/app.db", "/tmp/app.db", "file:///var/task/data/app.db"]) {
    it(`rejects local or temporary storage on Vercel: ${value ?? "unset"}`, () => {
      assert.throws(() => resolveDatabaseConfig({ VERCEL: "1", DATABASE_URL: value }), /permanent hosted SQLite storage/);
    });
  }
  for (const token of [undefined, "", "  ", "your-token", "masked***", "a\nb"]) {
    it("rejects missing or placeholder database tokens", () => {
      assert.throws(() => resolveDatabaseConfig({ ...remote, DATABASE_AUTH_TOKEN: token }), /DATABASE_AUTH_TOKEN/);
    });
  }
  for (const url of ["libsql://user:private-secret@example.com", "https://example.com?token=private-secret", "https://example.com/#private-secret", "https://example.com/not-a-db-url", "libsql://"]) {
    it("rejects unsafe/malformed URLs without leaking their contents", () => {
      assert.throws(() => resolveDatabaseConfig({ ...remote, DATABASE_URL: url }), (error: unknown) => {
        assert.ok(error instanceof DatabaseConfigurationError); assert.ok(!error.message.includes("private-secret")); return true;
      });
    });
  }
  it("never exposes raw provider errors to the browser", () => {
    assert.ok(!publicDatabaseError(new Error("token=private-secret")).includes("private-secret"));
  });
  it("requires a non-demo session secret for Vercel", () => {
    for (const SESSION_SECRET of [undefined, "", "demo", "vidyasetu-sih-demo-secret", "replace-with-a-long-random-secret-in-production"]) {
      assert.throws(() => assertDeploymentConfig({ ...remote, VERCEL: "1", SESSION_SECRET }), /SESSION_SECRET/);
    }
    assert.doesNotThrow(() => assertDeploymentConfig({ ...remote, VERCEL: "1", SESSION_SECRET: "test-only-long-secret-12345678901234567890" }));
    assert.doesNotThrow(() => assertDeploymentConfig({}));
  });
});
