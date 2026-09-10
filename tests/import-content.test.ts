import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// The bulk uploader runs `tsx scripts/import-content.ts <csv>` against a CSV
// exported from the faculty Excel sheet — for videos/notes and for quiz
// questions. These checks run the real script as a subprocess against a
// throwaway database, the way an operator would, so the documented process
// cannot silently break.

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

// ── Quiz-question sheet ────────────────────────────────────────────────
// Columns: class,subject,chapter,type,question,option_a…option_d,answer,
// explanation,pyq,marks,rubric,model_answer — built per-row so the tests
// never depend on hand-counted commas.
const QUESTION_HEADER =
  "class,subject,chapter,type,question,option_a,option_b,option_c,option_d,answer,explanation,pyq,marks,rubric,model_answer";

const csvCell = (v: string) =>
  /[",]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;

function qrow(o: {
  cls: string;
  subject: string;
  chapter: string;
  type: string;
  question: string;
  a?: string;
  b?: string;
  c?: string;
  d?: string;
  answer?: string;
  explanation?: string;
  pyq?: string;
  marks?: string;
  rubric?: string;
  model?: string;
}): string {
  return [
    o.cls,
    o.subject,
    o.chapter,
    o.type,
    o.question,
    o.a ?? "",
    o.b ?? "",
    o.c ?? "",
    o.d ?? "",
    o.answer ?? "",
    o.explanation ?? "",
    o.pyq ?? "",
    o.marks ?? "",
    o.rubric ?? "",
    o.model ?? "",
  ]
    .map(csvCell)
    .join(",");
}

const questionsPath = join(dir, "questions.csv");
writeFileSync(
  questionsPath,
  [
    QUESTION_HEADER,
    // answer given as a letter, tagged as a previous-year question
    qrow({
      cls: "8",
      subject: "science",
      chapter: "2",
      type: "mcq",
      question: "Which of the following is a rabi crop?",
      a: "Wheat",
      b: "Maize",
      c: "Cotton",
      d: "Rice",
      answer: "B",
      explanation: "Rabi crops are sown in winter; wheat is a rabi crop.",
      pyq: "CBSE 2023",
    }),
    // same question again, answer given as the option text — must dedupe
    qrow({
      cls: "8",
      subject: "science",
      chapter: "2",
      type: "mcq",
      question: "Which of the following is a rabi crop?",
      a: "Wheat",
      b: "Maize",
      c: "Cotton",
      d: "Rice",
      answer: "Wheat",
      explanation: "duplicate of the row above",
    }),
    // answer given as a 1-based number
    qrow({
      cls: "8",
      subject: "science",
      chapter: "2",
      type: "mcq",
      question: "The process of loosening and turning of the soil is called —",
      a: "Sowing",
      b: "Ploughing",
      c: "Irrigation",
      d: "Harvesting",
      answer: "2",
      explanation: "Ploughing loosens and aerates the soil.",
    }),
    qrow({
      cls: "8",
      subject: "mathematics",
      chapter: "1",
      type: "subjective",
      question: "Add: (−3/4) + 5/4. Show your steps.",
      marks: "2",
      rubric: "Find the common denominator|1; Correct answer 2/4 = 1/2|1",
      model: "(−3 + 5)/4 = 2/4 = 1/2.",
    }),
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

describe("bulk question importer", () => {
  it("previews questions without writing on --dry-run", () => {
    const out = run([questionsPath, "--dry-run"]);
    assert.match(
      out,
      /\[dry run\] Would import: 0 video\(s\), 0 note\(s\), 2 MCQ\(s\), 1 subjective question\(s\)/,
    );
    assert.match(out, /1 duplicate or already present, skipped/);
    assert.match(out, /No changes were written/);
  });

  it("imports questions in all answer formats and is idempotent", () => {
    const out = run([questionsPath]);
    assert.match(
      out,
      /Importing: 0 video\(s\), 0 note\(s\), 2 MCQ\(s\), 1 subjective question\(s\)/,
    );
    assert.match(out, /\[mcq {2}\] Which of the following is a rabi crop\?/);
    assert.match(out, /2 MCQs after this import/);
    assert.match(out, /Rational Numbers.*\(2 marks\)/);

    const again = run([questionsPath]);
    assert.match(again, /Nothing new to import/);
  });

  it("mixes question rows into a materials sheet", () => {
    const mixedPath = join(dir, "mixed.csv");
    writeFileSync(
      mixedPath,
      [
        "class,subject,chapter,type,title,url,question,option_a,option_b,option_c,option_d,answer,explanation,marks,rubric,model_answer",
        "9,science,2,video,Cell — overview,https://www.youtube.com/watch?v=dQw4w9WgXcQ,,,,,,,,,,,,",
        "9,science,2,mcq,,,\"The cell was discovered by —\",Robert Hooke,Louis Pasteur,Charles Darwin,Carl Linnaeus,Robert Hooke,\"Hooke observed cork cells in 1665.\",,,,",
      ].join("\n"),
    );
    const out = run([mixedPath]);
    assert.match(
      out,
      /Importing: 1 video\(s\), 0 note\(s\), 1 MCQ\(s\), 0 subjective question\(s\)/,
    );
  });

  it("rejects bad question rows without importing anything", () => {
    const badPath = join(dir, "bad-questions.csv");
    writeFileSync(
      badPath,
      [
        QUESTION_HEADER,
        qrow({
          cls: "8",
          subject: "science",
          chapter: "2",
          type: "mcq",
          question: "Answer letter out of range",
          a: "Wheat",
          b: "Maize",
          c: "Mustard",
          d: "Barley",
          answer: "E",
          explanation: "x",
        }),
        qrow({
          cls: "8",
          subject: "science",
          chapter: "2",
          type: "mcq",
          question: "Missing option",
          a: "Wheat",
          b: "Maize",
          d: "Barley",
          answer: "B",
          explanation: "x",
        }),
        qrow({
          cls: "8",
          subject: "mathematics",
          chapter: "1",
          type: "subjective",
          question: "Marks not 2/3/5",
          marks: "4",
          model: "answer",
        }),
        qrow({
          cls: "8",
          subject: "mathematics",
          chapter: "1",
          type: "subjective",
          question: "No model answer",
          marks: "5",
        }),
      ].join("\n"),
    );
    let failed = false;
    try {
      run([badPath]);
    } catch (error) {
      failed = true;
      const stderr = (error as { stderr?: string }).stderr ?? "";
      assert.match(stderr, /"answer" must be the option letter/);
      assert.match(stderr, /need all four choices/);
      assert.match(stderr, /"marks" must be 2, 3 or 5/);
      assert.match(stderr, /"model_answer" is required/);
      assert.match(stderr, /nothing was imported/i);
    }
    assert.ok(failed, "the importer should exit non-zero on invalid questions");
  });
});
