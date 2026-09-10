import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AUTHORITY_WEIGHT,
  authorityWeight,
  citation,
  citationLabel,
  retrieve,
  type SourceChunk,
} from "../src/lib/rag/retrieve";

/**
 * "Faculty-verified notes rank above student notes" is a product promise, so it
 * is pinned here: identical text from two sources must come back in authority
 * order, and every citation must be a link that exists.
 */

const chunk = (overrides: Partial<SourceChunk>): SourceChunk =>
  ({
    id: 1,
    documentId: 1,
    chapterId: 179,
    seq: 1,
    page: 62,
    para: 1,
    heading: "Ignition temperature",
    text: "Ignition temperature is the lowest temperature at which a substance catches fire and starts burning.",
    kind: "ncert_textbook",
    authority: "ncert",
    docTitle: "Combustion and Flame",
    attribution: "NCERT Class 8 Science",
    ...overrides,
  }) as SourceChunk;

const TEXT =
  "A large log of wood does not catch fire immediately because it must reach its ignition temperature, while a thin shaving reaches the same ignition temperature quickly.";

const VERIFIED = chunk({
  id: 23,
  kind: "faculty_note",
  authority: "faculty_verified",
  docTitle: "Combustion — teaching notes",
  page: null,
});
const STUDENT = chunk({ id: 41, kind: "student_note", authority: "student", page: null });

describe("authority weighting", () => {
  it("orders ncert > faculty-verified > faculty > student", () => {
    assert.ok(AUTHORITY_WEIGHT.ncert > AUTHORITY_WEIGHT.faculty_verified);
    assert.ok(AUTHORITY_WEIGHT.faculty_verified > AUTHORITY_WEIGHT.faculty);
    assert.ok(AUTHORITY_WEIGHT.faculty > AUTHORITY_WEIGHT.student);
  });

  it("keeps a peer note retrievable but below the verified one", () => {
    const verified = authorityWeight({ authority: "faculty_verified", kind: "faculty_note" });
    const peer = authorityWeight({ authority: "student", kind: "student_note" });
    assert.ok(peer > 0, "a peer note is not censored, only ranked");
    assert.ok(verified > peer);
  });
});

describe("retrieval", () => {
  it("returns the textbook first for a textbook question", () => {
    const results = retrieve(
      [
        chunk({ id: 9, text: TEXT }),
        chunk({ ...VERIFIED, text: TEXT }),
        chunk({ ...STUDENT, text: TEXT }),
      ],
      "Why does a log of wood not catch fire immediately?",
    );
    assert.equal(results.length, 3);
    assert.equal(results[0].chunk.authority, "ncert");
    assert.equal(results[1].chunk.authority, "faculty_verified");
    assert.equal(results[2].chunk.authority, "student");
    assert.ok(results[0].score >= results[1].score);
  });

  it("returns nothing for an unrelated query instead of the whole chapter", () => {
    const results = retrieve([chunk({ id: 9, text: TEXT })], "photosynthesis in green leaves");
    assert.deepEqual(results, []);
  });

  it("labels a citation the way the chip shows it, and links to the passage", () => {
    const citable = citation(chunk({ id: 9, page: 62, para: 3 }));
    assert.equal(citable.label, "NCERT p. 62, para 3");
    assert.equal(citable.href, "/source/9");
    assert.equal(citationLabel(chunk({ ...VERIFIED })), "Verified note · para 1");
    assert.equal(citationLabel(chunk({ ...STUDENT, page: 4 })), "Class note · p. 4");
  });

  it("keeps the document title for the tooltip without bloating the chip", () => {
    const citable = citation(chunk({ ...VERIFIED }));
    assert.match(citable.docTitle, /teaching notes/);
    assert.ok(citable.label.length <= 24);
  });
});
