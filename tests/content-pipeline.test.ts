import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractiveQuestions,
  parseGeneratedContent,
} from "../src/lib/content/generate";
import { buildRevisionSheet, renderRevisionSvg, wrapText } from "../src/lib/revision/sheet";
import type { LearningOutcome } from "../src/lib/outcomes/taxonomy";

/**
 * Two claims of the content pipeline: a keyless deployment still produces
 * *reviewable* questions extracted from the teacher's own text, and a model reply
 * that does not satisfy the contract is rejected instead of silently corrupting
 * the chapter's question bank.
 */

const outcome = (code: string, concept: string, keywords: string[], misconceptions: string[]) =>
  ({
    code,
    concept,
    statement: `${concept} statement`,
    definition: `${concept} definition`,
    textbookPage: 62,
    kind: "concept",
    diagram: null,
    misconceptions,
    keywords,
    parent: null,
  }) as unknown as LearningOutcome;

const OUTCOMES = [
  outcome("LO-8-SCI-06-01", "Combustion", ["combustion", "oxygen"], ["Thinks burning needs only fuel"]),
  outcome("LO-8-SCI-06-03", "Ignition temperature", ["ignition temperature", "matchstick"], ["Thinks it is the boiling point"]),
];

const SOURCE = `Combustion is a chemical process in which a substance reacts with oxygen and gives off heat.
The substances that burn are combustible, and those that do not are non-combustible.
Ignition temperature is the lowest temperature at which a substance starts to burn. A matchstick lights easily because its ignition temperature is low.
Calorific value is the amount of heat energy released on burning one kilogram of a fuel.`;

describe("keyless question extraction", () => {
  it("turns the teacher's own definition sentences into answerable questions", () => {
    const questions = extractiveQuestions(SOURCE, OUTCOMES, 20);
    assert.ok(questions.length >= 2, `expected extracted questions, got ${questions.length}`);
    for (const question of questions) {
      assert.equal(question.options.length, 4);
      assert.equal(new Set(question.options.map((option) => option.toLowerCase())).size, 4);
      assert.ok(question.correctIndex >= 0 && question.correctIndex <= 3);
      assert.ok(question.explanation.includes("uploaded material"));
      assert.ok(question.qtext.includes("__________"));
      // The answer must be a term that really is in the sentence it blanks out.
      assert.ok(question.explanation.toLowerCase().includes(question.options[question.correctIndex].toLowerCase()));
    }
  });

  it("tags the question to the outcome whose keywords the sentence uses", () => {
    const questions = extractiveQuestions(SOURCE, OUTCOMES, 20);
    const ignition = questions.find((question) =>
      question.explanation.toLowerCase().includes("lowest temperature"),
    );
    assert.ok(ignition, "the ignition-temperature sentence should yield a question");
    assert.equal(ignition?.loCode, "LO-8-SCI-06-03");
  });

  it("returns nothing rather than inventing when there is nothing to extract", () => {
    assert.deepEqual(extractiveQuestions("Here are some words but no definition at all.", OUTCOMES, 5), []);
  });

  it("never exceeds the requested count", () => {
    assert.ok(extractiveQuestions(SOURCE, OUTCOMES, 1).length <= 1);
  });
});

describe("model output validation", () => {
  const good = JSON.stringify({
    notes: "x".repeat(120),
    questions: [
      {
        qtext: "Which gas supports combustion?",
        options: ["Nitrogen", "Oxygen", "Carbon dioxide", "Helium"],
        correctIndex: 1,
        explanation: "Oxygen supports combustion; nitrogen does not.",
        loCode: "LO-8-SCI-06-01",
      },
    ],
  });

  it("accepts a well-formed bank, including a fenced JSON reply", () => {
    const parsed = parseGeneratedContent(`\`\`\`json\n${good}\n\`\`\``, OUTCOMES, 1);
    assert.equal(parsed.questions.length, 1);
    assert.equal(parsed.questions[0].loCode, "LO-8-SCI-06-01");
  });

  it("rejects a bank that would corrupt the mastery map", () => {
    const base = JSON.parse(good) as {
      notes: string;
      questions: Record<string, unknown>[];
    };
    const withQuestion = (patch: Record<string, unknown>) =>
      JSON.stringify({ ...base, questions: [{ ...base.questions[0], ...patch }] });

    assert.throws(() => parseGeneratedContent("not json at all", OUTCOMES, 1), /quiz|JSON|incomplete/i);
    assert.throws(
      () => parseGeneratedContent(withQuestion({ options: ["Oxygen", "Oxygen", "Nitrogen", "Helium"] }), OUTCOMES, 1),
      /option/i,
    );
    assert.throws(
      () => parseGeneratedContent(withQuestion({ correctIndex: 9 }), OUTCOMES, 1),
      /answer/i,
    );
    assert.throws(
      () => parseGeneratedContent(withQuestion({ explanation: "" }), OUTCOMES, 1),
      /explanation/i,
    );
    // An unknown outcome code is not fatal: it is dropped to null, never trusted.
    const unknown = parseGeneratedContent(withQuestion({ loCode: "LO-99-XXX-99-99" }), OUTCOMES, 1);
    assert.equal(unknown.questions[0].loCode, null);
  });
});

describe("one-page revision sheet", () => {
  const sheet = buildRevisionSheet({
    classNo: 8,
    subjectName: "Science",
    chapterNum: 6,
    chapterTitle: "Combustion and Flame",
    book: "Science · Class 8",
    outcomes: OUTCOMES,
    questions: [
      {
        qtext: "Ignition temperature is the temperature at which a substance…",
        options: ["melts", "starts to burn", "boils", "freezes"],
        correctIndex: 1,
        loCode: "LO-8-SCI-06-03",
        trap: "Thinks it is the boiling point",
      },
    ],
    sources: ["NCERT Science, Chapter 6", "Ms. Anita's verified note"],
    now: new Date("2026-09-10T00:00:00.000Z"),
  });

  it("keeps every curated outcome on one page", () => {
    assert.equal(sheet.outcomes.length, OUTCOMES.length);
    assert.equal(sheet.coverage.outcomes, OUTCOMES.length);
    assert.equal(sheet.coverage.questions, 1);
    assert.match(sheet.chapterLabel, /Class 8/);
    assert.match(sheet.title, /Combustion and Flame/);
  });

  it("renders an A4 SVG with the chapter, its outcomes and its sources", () => {
    const svg = renderRevisionSvg(sheet);
    assert.match(svg, /^<svg[^>]+width="595"[^>]+height="842"/);
    assert.ok(svg.includes("Combustion and Flame"));
    assert.ok(svg.includes("Ignition temperature"));
    assert.ok(svg.includes("Ms. Anita"));
    assert.ok(!svg.includes("<script"), "a printable sheet carries no scripts");
  });

  it("truncates long text instead of overflowing the page", () => {
    const lines = wrapText("word ".repeat(400), 60, 3);
    assert.equal(lines.length, 3);
    assert.ok(lines.every((line) => line.length <= 61));
  });
});
