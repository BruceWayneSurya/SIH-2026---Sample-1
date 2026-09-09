import { AiServiceError } from "./groq-client";

export type StudyMode = "summary" | "key-points" | "explain" | "quiz";
export type StudyRequest = { chapterId: number; mode: StudyMode; topic: string; count: number };
export type PracticeQuestion = { question: string; options: string[]; correctIndex: number; explanation: string };

export function validateStudyRequest(body: unknown): StudyRequest {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new AiServiceError("Send a study request.", 400);
  const input = body as Record<string, unknown>;
  if (!Number.isSafeInteger(input.chapterId) || Number(input.chapterId) < 1) throw new AiServiceError("Choose a valid chapter.", 400);
  if (!["summary", "key-points", "explain", "quiz"].includes(String(input.mode))) throw new AiServiceError("Choose summary, key-points, explain, or quiz.", 400);
  if (input.topic !== undefined && (typeof input.topic !== "string" || input.topic.length > 240)) throw new AiServiceError("Keep the sub-topic under 240 characters.", 400);
  const count = input.count ?? 5;
  if (input.mode === "quiz" && ![3, 5, 7, 10].includes(count as number)) throw new AiServiceError("Choose 3, 5, 7, or 10 questions.", 400);
  return { chapterId: Number(input.chapterId), mode: input.mode as StudyMode, topic: String(input.topic ?? "").trim(), count: Number(count) };
}

export function studyPrompt(request: StudyRequest, chapter: string): string {
  const scope = `${chapter}. ${request.topic ? `Sub-topic requested by the learner: ${request.topic}` : "Cover the whole chapter."}`;
  if (request.mode === "quiz") return `Create exactly ${request.count} original practice MCQs for ${scope}\nReturn only a JSON object in this shape: {"questions":[{"question":"...","options":["...","...","...","..."],"correctIndex":0,"explanation":"..."}]}. Each question must have exactly four distinct options and one correct answer, indexed 0 through 3. Include an age-appropriate explanation. These are AI practice questions, not official PYQs. Do not include markdown fences or reasoning outside the JSON.`;
  const instruction = { summary: "Write concise revision notes", "key-points": "List the key facts, definitions and common exam mistakes", explain: "Explain the topic simply with one everyday example and step-by-step reasoning appropriate for a student" }[request.mode];
  return `${instruction} for ${scope} Use short headings and plain-text bullets. Stay within about 500 words. Do not invent PYQ citations. Remind the learner to cross-check important facts with their NCERT text or teacher.`;
}

/** Treat model output as untrusted data. Never render HTML or execute it. */
export function parsePracticeQuiz(reply: string, expectedCount: number): PracticeQuestion[] {
  const invalid = () => new AiServiceError("The AI quiz was incomplete. Please try generating it again.", 502);
  let parsed: unknown;
  try { parsed = JSON.parse(reply.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")); }
  catch { throw invalid(); }
  const questions = parsed && typeof parsed === "object" && "questions" in parsed ? parsed.questions : null;
  if (!Array.isArray(questions) || questions.length !== expectedCount) throw invalid();
  return questions.map((q): PracticeQuestion => {
    if (!q || typeof q.question !== "string" || !q.question.trim() || q.question.length > 1_500 ||
      !Array.isArray(q.options) || q.options.length !== 4 ||
      q.options.some((o: unknown) => typeof o !== "string" || !o.trim() || o.length > 500) ||
      new Set(q.options.map((o: string) => o.trim())).size !== 4 ||
      !Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3 ||
      typeof q.explanation !== "string" || !q.explanation.trim() || q.explanation.length > 3_000) throw invalid();
    return { question: q.question.trim(), options: q.options.map((o: string) => o.trim()), correctIndex: q.correctIndex, explanation: q.explanation.trim() };
  });
}
