import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parsePracticeQuiz, studyPrompt, validateStudyRequest } from "../src/lib/ai/study";

const question = { question: "What is needed for combustion?", options: ["Oxygen", "Ice", "Sand", "Salt"], correctIndex: 0, explanation: "Oxygen supports combustion." };
describe("chapter AI study tools", () => {
  it("validates bounded chapter requests and known modes", () => {
    assert.deepEqual(validateStudyRequest({ chapterId: 3, mode: "summary" }), { chapterId: 3, mode: "summary", topic: "", count: 5 });
    for (const count of [3, 5, 7, 10]) assert.equal(validateStudyRequest({ chapterId: 1, mode: "quiz", count }).count, count);
    for (const body of [null, [], {}, { chapterId: 0, mode: "summary" }, { chapterId: 1, mode: "invalid" }, { chapterId: 1, mode: "summary", topic: "x".repeat(241) }, { chapterId: 1, mode: "quiz", count: 100 }, { chapterId: 1, mode: "quiz", count: "5" }]) {
      assert.throws(() => validateStudyRequest(body));
    }
  });
  it("scopes prompts to server-selected NCERT context and labels practice honestly", () => {
    const prompt = studyPrompt({ chapterId: 1, mode: "quiz", topic: "Flame zones", count: 3 }, "Class 8 Science · Combustion and Flame");
    assert.match(prompt, /Class 8 Science/); assert.match(prompt, /Flame zones/); assert.match(prompt, /exactly 3/); assert.match(prompt, /not official PYQs/);
  });
  it("accepts valid JSON or fenced JSON without evaluating model content", () => {
    const json = JSON.stringify({ questions: [question, question, question] });
    assert.equal(parsePracticeQuiz(json, 3).length, 3);
    assert.equal(parsePracticeQuiz(`\`\`\`json\n${json}\n\`\`\``, 3)[0].correctIndex, 0);
    const html = { ...question, question: "<script>alert('not executed')</script>" };
    assert.equal(parsePracticeQuiz(JSON.stringify({ questions: [html] }), 1)[0].question, html.question);
  });
  it("rejects incomplete, oversized, or incorrectly keyed model output", () => {
    const invalid = ["not json", JSON.stringify({ questions: [] }), JSON.stringify({ questions: [{ ...question, correctIndex: 4 }] }), JSON.stringify({ questions: [{ ...question, options: ["A", "A", "B", "C"] }] }), JSON.stringify({ questions: [{ ...question, question: "x".repeat(1501) }] }), JSON.stringify({ questions: [{ ...question, explanation: "" }] })];
    for (const reply of invalid) assert.throws(() => parsePracticeQuiz(reply, 1), /incomplete/);
  });
});
