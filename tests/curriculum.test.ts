import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CLASSES,
  SUBJECTS,
  chapterSlug,
  classLabel,
  classNumber,
  getChapters,
  validClass,
  validSubject,
} from "../src/lib/curriculum";

describe("class coverage", () => {
  it("publishes Class 6 through 10 for every subject", () => {
    assert.deepEqual([...CLASSES], [6, 7, 8, 9, 10]);
    for (const classNo of CLASSES) {
      for (const subject of SUBJECTS) {
        const list = getChapters(classNo, subject.slug);
        assert.ok(list.length > 0, `Class ${classNo} · ${subject.slug} is empty`);
        const slugs = new Set<string>();
        for (const [index, row] of list.entries()) {
          assert.ok(row.title.trim().length > 0, `empty title in Class ${classNo}`);
          const slug = chapterSlug(row, index);
          assert.ok(slug.length > 0, `empty slug for: ${row.title}`);
          assert.match(slug, /^[a-z0-9-]+$/, `bad slug for: ${row.title}`);
          assert.equal(slugs.has(slug), false, `duplicate slug ${slug} in Class ${classNo} ${subject.slug}`);
          slugs.add(slug);
        }
      }
    }
  });

  it("validates class and subject inputs from routes and forms", () => {
    for (const value of ["6", "7", "8", "9", "10"]) assert.equal(validClass(value), true, value);
    for (const value of ["5", "11", "0", "", "eight", "7abc"])
      assert.equal(validClass(value), false, value);

    assert.equal(classNumber("9"), 9);
    assert.equal(classNumber(10), 10);
    assert.equal(classNumber(" 6 "), 6);
    for (const value of [null, undefined, "", "11", 5.5, NaN, {}, []])
      assert.equal(classNumber(value), null, String(value));

    assert.equal(validSubject("science"), true);
    assert.equal(validSubject("astrology"), false);
    assert.equal(classLabel(10), "Class 10");
  });

  it("keeps the secondary classes aligned with their NCERT books", () => {
    const c10Science = getChapters(10, "science");
    assert.equal(c10Science[0].title, "Chemical Reactions and Equations");
    assert.equal(c10Science.at(-1)?.title, "Our Environment");

    const c10Maths = getChapters(10, "mathematics");
    assert.equal(c10Maths[0].title, "Real Numbers");
    assert.equal(c10Maths.at(-1)?.title, "Probability");

    // Social science stays split by book, so history and economics both appear.
    const c10Social = getChapters(10, "social-science");
    const books = new Set(c10Social.map((row) => row.book));
    assert.ok(
      [...books].some((book) => book?.startsWith("History")),
      "Class 10 history missing",
    );
    assert.ok(
      [...books].some((book) => book?.startsWith("Economics")),
      "Class 10 economics missing",
    );

    const c6Science = getChapters(6, "science");
    assert.equal(c6Science[0].book, "Curiosity");
    assert.equal(c6Science[0].title, "The Wonderful World of Science");

    const c9Maths = getChapters(9, "mathematics");
    assert.equal(c9Maths[0].title, "Orienting Yourself: The Use of Coordinates");
  });
});
