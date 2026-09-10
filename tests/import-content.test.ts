import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// The bulk uploader runs `tsx scripts/import-content.ts <csv>` against a CSV
// exported from the faculty Excel sheet. These checks run the real script as a
// subprocess against a throwaway database, the way an operator would, so the
// documented process cannot silently break.

const dir = mkdtempSync(join(tmpdir(), "pragyan-import-"));
const dbPath = join(dir, "test.db");
const csvPath = join(dir, "content.csv");

writeFileSync(
  csvPath,
  [
    "class,subject,chapter,type,title,url,duration_sec,slides_url,slides_title,author_name,content,file_type,verify",
    "8,science,2,video,Crop Production — overview,https://www.youtube.com/watch?v=dQw4w9WgXcQ,742,,,,Ms. Anita Sharma,,,",
    "8,science,2,video,Crop Production — overview,https://youtu.be/dQw4w9WgXcQ,,,,,Ms. Anita Sharma,,,",
    "8,science,2,note,Crop Production — chapter notes,https://drive.google.com/file/d/1aBcD3fGhIjKlMnOpQrSt/view,,,,,Ms. Anita Sharma,Revision summary,pdf,yes",
    "9,mathematics,1,note,Number Systems — handout,https://drive.google.com/open?id=1aBcD3fGhIjKlMnOpQ,,,,,Mr. R. Kumar,,pdf,",
  ].join("\n"),
);

function run(args: string[]): string {
  return execFileSync("npx", ["tsx", "scripts/import-content.ts", ...args], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: dbPath, DEBUG: "" },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

after(() => rmSync(dir, { recursive: true, force: true }));

describe("bulk content importer", () => {
  it("previews without writing on --dry-run", () => {
    const out = run([csvPath, "--dry-run"]);
    assert.match(out, /\[dry run\] Would import: 1 video\(s\), 2 note\(s\)/);
    assert.match(out, /No changes were written/);
  });

  it("imports, dedupes identical links and is idempotent", () => {
    const out = run([csvPath]);
    assert.match(out, /Importing: 1 video\(s\), 2 note\(s\)/);
    assert.match(out, /1 duplicate or already present, skipped/);
    assert.match(out, /Class 8 science ch 2/);
    assert.match(out, /Class 9 mathematics ch 1/);

    const again = run([csvPath]);
    assert.match(again, /Nothing new to import/);
  });

  it("rejects bad rows without importing anything", () => {
    const badPath = join(dir, "bad.csv");
    writeFileSync(
      badPath,
      [
        "class,subject,chapter,type,title,url",
        "8,science,2,video,Not a lecture,https://vimeo.com/123456",
        "8,science,2,note,Not a drive file,https://example.com/x.pdf",
      ].join("\n"),
    );
    let failed = false;
    try {
      run([badPath]);
    } catch (error) {
      failed = true;
      const stderr = (error as { stderr?: string }).stderr ?? "";
      assert.match(stderr, /must be a YouTube link/);
      assert.match(stderr, /must be a Google Drive file link/);
      assert.match(stderr, /nothing was imported/i);
    }
    assert.ok(failed, "the importer should exit non-zero on invalid rows");
  });
});
