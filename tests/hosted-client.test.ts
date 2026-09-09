import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { it } from "node:test";
import { openDatabaseClient } from "../src/db/connection";

it("uses the hosted HTTP driver, sends auth only as a header, and never loads a native SQLite binding", async () => {
  const original = globalThis.fetch;
  const token = "test-token-not-a-real-credential";
  const seen: { url: string; authorization: string | null; body: string }[] = [];
  // Emulate only the public Hrana execute/close response contract; no live
  // provider, credentials, external API calls, or persistence claim is involved.
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    const body = await request.text();
    seen.push({ url: request.url, authorization: request.headers.get("authorization"), body });
    const payload = JSON.parse(body);
    return Response.json({ baton: null, base_url: null, results: payload.requests.map((item: { type: string }) => ({
      type: "ok", response: item.type === "execute" ? {
        type: "execute", result: { cols: [{ name: "answer", decltype: "INTEGER" }], rows: [[{ type: "integer", value: "42" }]], affected_row_count: 0, last_insert_rowid: null },
      } : { type: "close" },
    })) });
  };
  const client = openDatabaseClient({ kind: "remote", url: "libsql://test-db.example.turso.io", authToken: token });
  try {
    const result = await client.execute("SELECT 42 AS answer");
    assert.equal(result.rows[0].answer, 42);
    assert.ok(seen.length > 0);
    for (const request of seen) {
      assert.match(request.url, /^https:\/\/test-db\.example\.turso\.io\//);
      assert.equal(request.authorization, `Bearer ${token}`);
      assert.ok(!request.url.includes(token)); assert.ok(!request.body.includes(token));
    }
    const require = createRequire(import.meta.url);
    assert.ok(!Object.keys(require.cache).some((filename) => /libsql.*\.node$/.test(filename)));
  } finally { client.close(); globalThis.fetch = original; }
});
