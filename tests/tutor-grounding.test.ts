import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectOutOfScope } from "../src/lib/tutor/scope";
import {
  buildSystemPrompt,
  localHint,
  splitFollowUp,
  withholdFinalAnswer,
  type HintLevel,
} from "../src/lib/tutor/socratic";
import { citationLabel, type Retrieval, type SourceChunk } from "../src/lib/rag/retrieve";
import type { LearningOutcome } from "../src/lib/outcomes/taxonomy";

/**
 * The two promises a judge will try to break: the tutor must refuse questions
 * from a later class, and a hint must not contain the answer. Both are decided
 * in code, before any model is called, so both are testable here.
 */

const chapter = {
  chapterTitle: "Combustion and Flame",
  classNo: 8,
  subjectSlug: "science",
  subjectName: "Science",
  outcomes: [] as LearningOutcome[],
  language: "en" as const,
};

const outcome = {
  code: "LO-8-SCI-06-03",
  concept: "Ignition temperature",
  statement: "Explains ignition temperature with an example.",
  definition: "The lowest temperature at which a substance catches fire and starts burning.",
  textbookPage: 62,
  kind: "concept",
  diagram: null,
  misconceptions: ["Thinks the ignition temperature is the boiling point of the substance"],
  keywords: ["ignition temperature", "matchstick"],
  parent: null,
} as unknown as LearningOutcome;

const chunk = (overrides: Partial<SourceChunk>): SourceChunk =>
  ({
    id: 9,
    documentId: 1,
    chapterId: 179,
    seq: 3,
    page: 62,
    para: 3,
    heading: "What is combustion?",
    text: "The lowest temperature at which a substance catches fire is its ignition temperature.",
    kind: "ncert_textbook",
    authority: "ncert",
    docTitle: "Combustion and Flame",
    attribution: "NCERT Class 8 Science",
    ...overrides,
  }) as SourceChunk;

const passage = (overrides: Partial<SourceChunk> = {}): Retrieval => {
  const source = chunk(overrides);
  return {
    chunk: source,
    score: 4.2,
    citation: {
      chunkId: source.id,
      label: citationLabel(source),
      page: source.page,
      para: source.para,
      docTitle: source.docTitle,
      kind: source.kind,
      authority: source.authority,
      href: `/source/${source.id}`,
    },
    snippet: source.text,
    matchedTerms: ["ignition", "temperature"],
  };
};

describe("scope guard", () => {
  it("refuses a topic NCERT introduces in a later class", () => {
    const verdict = detectOutOfScope("How do I solve a quadratic equation by factorisation?", chapter);
    assert.equal(verdict.status, "above_class");
    assert.equal(verdict.topicClass, 10);
    assert.match(verdict.message, /Class 10/);
    assert.match(verdict.suggestion, /chapter|combustion/i);
  });

  it("refuses a question that names a later class out loud", () => {
    const verdict = detectOutOfScope("Can you explain this Class 11 topic?", chapter);
    assert.equal(verdict.status, "above_class");
    assert.equal(verdict.topicClass, 11);
  });

  it("answers questions that belong to the chapter", () => {
    for (const question of [
      "Why does a matchstick catch fire quickly but a log of wood does not?",
      "What are the three conditions needed for combustion?",
      "Explain the zones of a candle flame.",
    ])
      assert.equal(detectOutOfScope(question, chapter).status, "in_scope", question);
  });

  it("does not refuse a Class 8 topic just because a senior word appears in it", () => {
    // "temperature" appears in Class 11 thermodynamics, but this is Class 8.
    assert.equal(
      detectOutOfScope("What is the ignition temperature of kerosene?", chapter).status,
      "in_scope",
    );
  });
});

describe("Socratic hint guard", () => {
  it("removes a sentence that gives the answer away before the last hint step", () => {
    const bank = [
      {
        qtext: "The lowest temperature at which a substance catches fire is called —",
        correctText: "ignition temperature",
      },
    ];
    const leaky =
      "Think about what happens when you strike a match. The answer is ignition temperature. What did you notice?";
    const guarded = withholdFinalAnswer(leaky, bank, 1);
    assert.equal(guarded.withheld, true);
    assert.ok(!guarded.text.includes("The answer is ignition temperature"));
    assert.match(guarded.text, /What did you notice\?/);

    const finalLevel = withholdFinalAnswer(leaky, bank, 3);
    assert.equal(finalLevel.withheld, false, "at hint 3 the worked step is allowed");
  });

  it("leaves a reply alone when it only uses the answer as part of a question", () => {
    const bank = [{ qtext: "…", correctText: "ignition temperature" }];
    const reply = "Which of these is the ignition temperature telling you about — the fuel or the heat?";
    const guarded = withholdFinalAnswer(reply, bank, 1);
    assert.equal(guarded.withheld, true, "the phrase is still a leak, so it is reported");
    assert.ok(guarded.text.length > 0);
  });

  it("builds a hint from indexed passages with a citation and no answer", () => {
    const hint = localHint({
      query: "Why does a log of wood take longer to catch fire?",
      passages: [passage()],
      outcomes: [outcome],
      hintLevel: 1 as HintLevel,
      chapterTitle: "Combustion and Flame",
    });
    assert.equal(hint.citations[0].label, "NCERT p. 62, para 3");
    assert.equal(hint.citations[0].href, "/source/9");
    assert.equal(hint.source, "local-index");
    assert.equal(hint.degraded, true);
    assert.ok(hint.followUp && hint.followUp.length > 0, "every hint ends with one thing to reply");
    assert.ok(
      !/the answer is|correct option is/i.test(hint.reply),
      "a local hint never states the answer",
    );
  });

  it("splits the follow-up question off the body so the UI can render it separately", () => {
    const { reply, followUp } = splitFollowUp("Here is the rule.\n\nNext: which step failed?");
    assert.equal(reply, "Here is the rule.");
    assert.equal(followUp, "which step failed?");
  });
});

describe("tutor system prompt", () => {
  it("tells the model to use only numbered sources and to keep the answer from the learner", () => {
    const prompt = buildSystemPrompt({
      ...chapter,
      outcomes: [outcome],
      passages: [passage()],
      mode: "socratic",
      hintLevel: 1,
      withheldAnswers: ["ignition temperature"],
    });
    assert.match(prompt, /ONLY the numbered sources/i);
    assert.match(prompt, /NEVER state the final answer/i);
    assert.match(prompt, /NCERT p\. 62, para 3|ignition temperature/i);
  });
});
