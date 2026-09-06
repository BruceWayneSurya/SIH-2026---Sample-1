import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmod, mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { it } from "node:test";

it("imports server modules on a read-only Vercel filesystem without opening a local database", async () => {
  await mkdir(".cache", { recursive: true });
  const directory = await mkdtemp(path.resolve(".cache", "vercel-readonly-"));
  const moduleUrl = pathToFileURL(path.resolve("src/db/index.ts")).href;
  try {
    await chmod(directory, 0o555);
    const output = execFileSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", `
      process.chdir(${JSON.stringify(directory)});
      const imported = await import(${JSON.stringify(moduleUrl)});
      const db = imported.default ?? imported;
      if (db.databaseKind !== 'unconfigured') throw new Error('Unexpected storage fallback');
      console.log('import succeeded');
      try { await db.client.execute('select 1'); throw new Error('Unexpected database success'); }
      catch (error) {
        if (!error.message.includes('permanent hosted SQLite')) throw error;
        console.log('configuration error is actionable');
      }
    `], { cwd: process.cwd(), encoding: "utf8", timeout: 15_000, env: {
      ...process.env, VERCEL: "1", DATABASE_URL: "", DATABASE_AUTH_TOKEN: "", TURSO_DATABASE_URL: "", TURSO_AUTH_TOKEN: "",
    } });
    assert.match(output, /import succeeded/);
    assert.match(output, /configuration error is actionable/);
    assert.deepEqual(await readdir(directory), []);
  } finally { await chmod(directory, 0o755); await rm(directory, { recursive: true, force: true }); }
});
