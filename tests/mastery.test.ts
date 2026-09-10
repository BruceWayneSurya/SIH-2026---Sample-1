import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cellFor,
  classMastery,
  groupMisconceptions,
  levelFor,
  masteryTone,
  outcomeHeadline,
  studentMastery,
  type MasteryQuestion,
} from "../src/lib/outcomes/mastery";
import type { LearningOutcome } from "../src/lib/outcomes/taxonomy";

/**
 * The mastery engine is the claim the whole teacher dashboard rests on:
 * "31 of 45 students haven't understood ignition temperature" has to be a count
 * of stored answers, not a number written by hand. These tests pin the rules.
 */

const outcome = (code: string, concept: string, page: number): LearningOutcome =>
  ({
    code,
    concept,
    statement: `${concept} statement`,
    definition: `${concept} definition`,
    textbookPage: page,
    kind: "concept",
    diagram: null,
    misconceptions: [`Confuses ${concept} with something else`],
    keywords: [concept.toLowerCase()],
    parent: null,
  }) as unknown as LearningOutcome;

const OUTCOMES = [outcome("LO-8-SCI-06-01", "Combustion", 60), outcome("LO-8-SCI-06-03", "Ignition temperature", 62)];

const QUESTIONS: MasteryQuestion[] = [
  { id: 1, qtext: "Combustion is…", options: ["A", "B", "C", "D"], correctIndex: 1, loCode: "LO-8-SCI-06-01" },
  { id: 2, qtext: "Burning needs…", options: ["A", "B", "C", "D"], correctIndex: 3, loCode: "LO-8-SCI-06-01" },
  { id: 3, qtext: "Ignition temperature is…", options: ["A", "B", "C", "D"], correctIndex: 0, loCode: "LO-8-SCI-06-03", trapIndex: 3, trap: "Thinks it is the boiling point" },
  { id: 4, qtext: "A matchstick lights because…", options: ["A", "B", "C", "D"], correctIndex: 2, loCode: "LO-8-SCI-06-03" },
  { id: 5, qtext: "Untagged question", options: ["A", "B", "C", "D"], correctIndex: 0, loCode: null },
];

describe("mastery thresholds", () => {
  it("treats no attempt as not started, 80% as secure and below half as needs help", () => {
    assert.equal(levelFor(0, 0), "not_started");
    assert.equal(levelFor(1, 1), "secure");
    assert.equal(levelFor(0.8, 5), "secure");
    assert.equal(levelFor(0.79, 5), "developing");
    assert.equal(levelFor(0.5, 4), "developing");
    assert.equal(levelFor(0.49, 4), "needs_help");
  });

  it("never punishes absence: an unanswered outcome stays grey", () => {
    const mastery = studentMastery(QUESTIONS, null, OUTCOMES);
    assert.equal(mastery.notStartedCount, 2);
    assert.equal(mastery.secureCount, 0);
    assert.equal(cellFor(mastery, "LO-8-SCI-06-03").level, "not_started");
  });
});

describe("student mastery", () => {
  it("ignores untagged questions and unanswered slots, and records the wrong option", () => {
    // answers: q1 right, q2 wrong, q3 wrong on the named trap, q4 right, q5 skipped
    const mastery = studentMastery(QUESTIONS, { userId: 7, answers: [1, 0, 3, 2, -1] }, OUTCOMES);
    const ignition = cellFor(mastery, "LO-8-SCI-06-03");
    assert.equal(ignition.attempted, 2);
    assert.equal(ignition.correct, 1);
    assert.equal(ignition.level, "developing");
    assert.equal(ignition.misses[0].questionId, 3);
    assert.equal(ignition.misses[0].misconception, "Thinks it is the boiling point");
    assert.equal(cellFor(mastery, "LO-8-SCI-06-01").level, "developing");
    assert.equal(mastery.answersTotal, 4, "the skipped slot is not an answer");
  });

  it("raises confidence with the number of mapped questions", () => {
    const one = studentMastery([QUESTIONS[2]], { userId: 1, answers: [0] }, OUTCOMES);
    assert.equal(cellFor(one, "LO-8-SCI-06-03").confidence, "low");
    const two = studentMastery(QUESTIONS, { userId: 1, answers: [1, 3, 0, 2, 0] }, OUTCOMES);
    assert.equal(cellFor(two, "LO-8-SCI-06-03").confidence, "medium");
  });
});

describe("class mastery", () => {
  const attempts = [
    { userId: 1, answers: [1, 3, 0, 2, 0] }, // secure on both
    { userId: 2, answers: [1, 0, 3, 1, 0] }, // ignition: 0 of 2 → needs help
    { userId: 3, answers: [1, 3, 3, 1, 0] }, // ignition: 0 of 2 → needs help
  ];

  it("counts the learners who have not understood an outcome and lists evidence", () => {
    const view = classMastery([{ userId: 1 }, { userId: 2 }, { userId: 3 }], QUESTIONS, attempts, OUTCOMES);
    const ignition = view.outcomes.find((entry) => entry.code === "LO-8-SCI-06-03");
    assert.ok(ignition);
    assert.equal(ignition.secure, 1);
    assert.equal(ignition.needsHelp, 2);
    assert.equal(ignition.notUnderstood, 2);
    assert.equal(ignition.evidence.length, 2, "two questions carry this outcome");
    assert.match(outcomeHeadline(ignition), /^2 of 3 students haven't understood ignition temperature\.$/i);
    // The learner outside the roster must not appear in the count.
    const narrow = classMastery([{ userId: 1 }], QUESTIONS, attempts, OUTCOMES);
    assert.equal(narrow.attemptedStudents, 1);
  });

  it("surfaces the most common wrong option per outcome", () => {
    const view = classMastery([{ userId: 1 }, { userId: 2 }, { userId: 3 }], QUESTIONS, attempts, OUTCOMES);
    const ignition = view.outcomes.find((entry) => entry.code === "LO-8-SCI-06-03");
    assert.ok(ignition);
    assert.ok(ignition.topMistake, "the class's most common wrong option is named");
    assert.equal(ignition.topMistake?.count, 2);
    assert.equal(ignition.topMistake?.misconception, "Thinks it is the boiling point");
    assert.ok(
      view.priority.length >= 1,
      "the teacher gets a worklist ordered by how badly the class did",
    );
  });

  it("clusters learners by the wrong idea, not by score", () => {
    const view = classMastery([{ userId: 1 }, { userId: 2 }, { userId: 3 }], QUESTIONS, attempts, OUTCOMES);
    const ignition = view.outcomes.find((entry) => entry.code === "LO-8-SCI-06-03");
    assert.ok(ignition);
    const clusters = groupMisconceptions(ignition, view.students);
    assert.ok(clusters.length >= 1);
    assert.equal(clusters[0].count, 2);
    assert.deepEqual(clusters[0].students.sort(), [2, 3]);
    assert.match(clusters[0].reteach, /page 62/);
    // Secure and absent learners never appear in a cluster.
    const students = clusters.flatMap((cluster) => cluster.students);
    assert.ok(!students.includes(1));
  });
});

describe("mastery tone", () => {
  it("maps every level to a colour class the heatmap can use", () => {
    for (const level of ["secure", "developing", "needs_help", "not_started"] as const) {
      const tone = masteryTone(level);
      assert.ok(tone.cell && tone.chip && tone.dot && tone.label);
    }
  });
});
