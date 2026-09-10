/**
 * Teacher content pipeline: transcript/PDF in → notes, outcome-tagged MCQs and
 * a translation out, for faculty review before anything reaches a learner.
 *
 * Design decisions that matter for a government deployment:
 *
 *   • **Nothing publishes itself.** A job lands in `ready` and a teacher has to
 *     press publish; only then do notes, questions and sources appear on the
 *     chapter. Faculty remain the gate.
 *   • **Every generated question carries a learning-outcome code** and is
 *     validated (four distinct options, an in-range key, an explanation) or the
 *     whole batch is rejected — a malformed bank would corrupt the mastery map.
 *   • **A keyless path exists.** With no `GROQ_API_KEY`, the pipeline still
 *     produces notes, an extractive question draft and a passage index, so the
 *     upload → review → publish loop can be demonstrated without a key, and the
 *     UI says plainly which parts need the model. The keyless questions are
 *     cloze deletions of the teacher's *own* sentences — extracted, never
 *     invented — and are labelled that way for review.
 */

import { AiServiceError, completeGroqChat, getGroqConfig, type GroqConfig } from "../ai/groq-client";
import { languageName, type Language } from "../i18n/config";
import { paragraphize } from "./pdf";
import { tokenize } from "../rag/tokenize";
import type { OutcomeRow } from "../queries-learning";

export const TARGET_LANGUAGES: { code: Language; label: string }[] = [
  { code: "te", label: "Telugu (తెలుగు)" },
  { code: "hi", label: "Hindi (हिन्दी)" },
  { code: "ta", label: "Tamil (தமிழ்)" },
  { code: "kn", label: "Kannada (ಕನ್ನಡ)" },
  { code: "ml", label: "Malayalam (മലയാളം)" },
];

export type GeneratedQuestion = {
  qtext: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  loCode: string | null;
};

export type GeneratedContent = {
  notes: string;
  questions: GeneratedQuestion[];
  translation: { language: string; text: string } | null;
  outcomes: { code: string; concept: string; statement: string }[];
  model?: string;
  degraded?: boolean;
  degradedReason?: string;
  passages: string[];
};

export const MAX_SOURCE_CHARS = 24_000;

export function clampSource(text: string): string {
  const clean = text.replace(/\u0000/g, "").replace(/[ \t]{2,}/g, " ").trim();
  return clean.length > MAX_SOURCE_CHARS ? clean.slice(0, MAX_SOURCE_CHARS) : clean;
}

export function generationPrompt(input: {
  classNo: number;
  subjectName: string;
  chapterNum: number;
  chapterTitle: string;
  outcomes: OutcomeRow[];
  count: number;
  targetLanguage: Language | null;
  sourceText: string;
}): string {
  const outcomeList = input.outcomes.length
    ? input.outcomes
        .map((outcome) => `${outcome.code} = ${outcome.concept} — ${outcome.statement}`)
        .join("\n")
    : "(no curated outcomes yet — return an empty outcome list)";
  const translation = input.targetLanguage
    ? `Also translate the notes into ${languageName(input.targetLanguage)} and put them in "translation".`
    : `Set "translation" to null.`;

  return [
    `You are preparing classroom material for NCERT Class ${input.classNo} ${input.subjectName}, chapter ${input.chapterNum}: "${input.chapterTitle}".`,
    "The teacher has supplied the source material below. Use ONLY that material. Do not add outside facts.",
    "Return ONE JSON object and nothing else, with this exact shape:",
    `{"notes":"<revision notes, 150-350 words, plain text with short headings>","questions":[{"qtext":"...","options":["...","...","...","..."],"correctIndex":0,"explanation":"...","loCode":"<one of the outcome codes, or null>"}],"translation":{"language":"<code>","text":"<the notes in the target language>"}}`,
    `Create exactly ${input.count} multiple-choice questions, each with four distinct options, exactly one correct answer, and a one-sentence explanation. Tag every question with the outcome code it assesses.`,
    `Learning outcomes available:\n${outcomeList}`,
    translation,
    "Do not invent page numbers, exam-year citations or learning-outcome codes that are not in the list above.",
    `SOURCE MATERIAL:\n"""\n${clampSource(input.sourceText)}\n"""`,
  ].join("\n\n");
}

/** Parse and fully validate model output; a bad batch never reaches the DB. */
export function parseGeneratedContent(raw: string, outcomes: OutcomeRow[], count: number): {
  notes: string;
  questions: GeneratedQuestion[];
  translation: { language: string; text: string } | null;
} {
  const invalid = (detail: string) =>
    new AiServiceError(`The generated material failed validation (${detail}). Try again, or paste cleaner text.`, 502);
  let parsed: unknown;
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  try {
    parsed = JSON.parse(start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned);
  } catch {
    throw invalid("not JSON");
  }
  if (!parsed || typeof parsed !== "object") throw invalid("not an object");
  const body = parsed as Record<string, unknown>;

  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 8_000) : "";
  if (notes.length < 80) throw invalid("notes too short");

  const rawQuestions = Array.isArray(body.questions) ? body.questions : [];
  if (rawQuestions.length === 0) throw invalid("no questions");

  const codes = new Set(outcomes.map((outcome) => outcome.code));
  const questions: GeneratedQuestion[] = rawQuestions.slice(0, count).map((entry, index) => {
    if (!entry || typeof entry !== "object") throw invalid(`question ${index + 1}`);
    const question = entry as Record<string, unknown>;
    const qtext = typeof question.qtext === "string" ? question.qtext.trim() : "";
    if (!qtext || qtext.length > 1_500) throw invalid(`question ${index + 1} text`);
    const options = Array.isArray(question.options) ? question.options : [];
    if (options.length !== 4 || options.some((option) => typeof option !== "string" || !option.trim()))
      throw invalid(`question ${index + 1} options`);
    const trimmed = options.map((option) => (option as string).trim().slice(0, 500));
    if (new Set(trimmed).size !== 4) throw invalid(`question ${index + 1} duplicate options`);
    const correctIndex = Number(question.correctIndex);
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3)
      throw invalid(`question ${index + 1} answer key`);
    const explanation = typeof question.explanation === "string" ? question.explanation.trim().slice(0, 2_000) : "";
    if (!explanation) throw invalid(`question ${index + 1} explanation`);
    const loCode =
      typeof question.loCode === "string" && codes.has(question.loCode) ? question.loCode : null;
    return { qtext, options: trimmed, correctIndex, explanation, loCode };
  });
  if (questions.length !== count) throw invalid(`expected ${count} questions, received ${questions.length}`);

  let translation: { language: string; text: string } | null = null;
  const rawTranslation = body.translation;
  if (rawTranslation && typeof rawTranslation === "object") {
    const entry = rawTranslation as Record<string, unknown>;
    const text = typeof entry.text === "string" ? entry.text.trim().slice(0, 12_000) : "";
    const language = typeof entry.language === "string" ? entry.language.slice(0, 8) : "";
    if (text.length > 40) translation = { language, text };
  }

  return { notes, questions, translation };
}

/**
 * Keyless question drafting.
 *
 * Every question below is a cloze deletion of a sentence the teacher supplied:
 * the stem is the sentence with the key term removed, the key is that term, the
 * distractors are other key terms from the same document, and the explanation is
 * the original sentence. Nothing is inferred, generated or guessed — which is
 * exactly why it can run with no model, and why the publish screen asks a human
 * to read it. Sentences that cannot yield four distinct options are skipped
 * rather than padded.
 */
export function extractiveQuestions(
  sourceText: string,
  outcomes: OutcomeRow[],
  count: number,
): GeneratedQuestion[] {
  const passages = paragraphize(sourceText);
  const sentences = passages
    .flatMap((passage) => passage.split(/(?<=[.!?])\s+/))
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter((sentence) => {
      const words = sentence.split(" ");
      return words.length >= 6 && words.length <= 42 && /[a-z]/i.test(sentence);
    });

  const candidates: { sentence: string; term: string; loCode: string | null; score: number }[] = [];
  for (const sentence of sentences) {
    for (const term of termsIn(sentence)) {
      if (!sentence.toLowerCase().includes(term.toLowerCase())) continue;
      const loCode = tagOutcome(sentence, outcomes);
      candidates.push({ sentence, term, loCode, score: score(term, sentence, loCode, sentences) });
    }
  }
  if (candidates.length === 0) return [];
  candidates.sort((a, b) => b.score - a.score);

  // Distractors: other extracted terms first, then the document's own frequent
  // content words, so a text with only one definition sentence still yields a
  // four-option question instead of being silently dropped.
  const seen = new Map<string, string>();
  for (const term of [...candidates.map((entry) => entry.term), ...topTerms(passages)]) {
    const key = term.toLowerCase();
    if (!seen.has(key)) seen.set(key, term);
  }
  const vocabulary = [...seen.values()];
  const questions: GeneratedQuestion[] = [];
  const usedTerms = new Set<string>();
  for (const candidate of candidates) {
    if (questions.length >= count) break;
    const key = candidate.term.toLowerCase();
    if (usedTerms.has(key)) continue;
    const distractors = vocabulary
      .filter(
        (term) =>
          term.toLowerCase() !== key &&
          !candidate.sentence.toLowerCase().includes(term.toLowerCase()),
      )
      .slice(0, 3);
    if (distractors.length < 3) continue;
    const blank = candidate.sentence.replace(
      new RegExp(escapeRegExp(candidate.term), "i"),
      "__________",
    );
    if (!blank.includes("__________")) continue;
    const options = [candidate.term, ...distractors];
    // Deterministic rotation so the answer is not always in the same slot.
    const shift = questions.length % 4;
    const rotated = [...options.slice(shift), ...options.slice(0, shift)];
    questions.push({
      qtext: `Complete the sentence from your source: “${blank}”`,
      options: rotated,
      correctIndex: rotated.indexOf(candidate.term),
      explanation: `From the uploaded material: “${candidate.sentence}”`,
      loCode: candidate.loCode,
    });
    usedTerms.add(key);
  }
  return questions;
}

/** Frequent content words in the document, used only as plausible distractors. */
function topTerms(passages: string[], limit = 16): string[] {
  const counts = new Map<string, number>();
  for (const passage of passages)
    for (const token of new Set(tokenize(passage)))
      if (token.length >= 4 && !/^\d+$/.test(token)) counts.set(token, (counts.get(token) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([token]) => token);
}

/** Words that start a clause rather than name a thing. */
const CLAUSE_OPENERS = new Set([
  "when", "this", "that", "these", "those", "there", "it", "they", "why", "so",
  "also", "however", "which", "who", "what", "if", "then", "because", "and", "or",
  "but", "as", "since", "while", "after", "before", "in", "on", "at", "for", "with",
]);

const VERB_WORDS = new Set([
  "is", "are", "was", "were", "be", "being", "been", "has", "have", "had", "does",
  "do", "did", "can", "could", "should", "would", "will", "may", "might", "must",
  "gives", "give", "given", "called", "means", "refers", "get", "gets", "matter",
  "matters", "makes", "make", "takes", "take", "helps", "help", "includes", "include",
  "occurs", "happen", "happens", "depends", "depend", "tells", "tell", "records",
  "shows", "show", "uses", "use", "need", "needs", "cannot", "should", "would",
]);

/**
 * Candidate key terms inside one sentence: the subject before a colon, or the
 * subject of an "X is/are …" definition. A term is a short noun phrase — the
 * filters below reject clauses like "When heat and light" that would otherwise
 * produce an unanswerable question.
 */
function termsIn(sentence: string): string[] {
  const found: string[] = [];
  const colon = sentence.match(/^([^:]{3,70}):/);
  if (colon && colon[1].trim().split(/\s+/).length <= 4) found.push(colon[1]);
  const pattern = /(?:^|[.;]\s+)(?:the\s+|a\s+|an\s+)?([A-Za-z][^,;:]{2,60}?)\s+(?:is|are|means|refers to)\b/g;
  for (const match of sentence.matchAll(pattern)) found.push(match[1]);
  const direct = sentence.match(/^(?:the\s+|a\s+|an\s+)?([A-Za-z][^,;:]{2,60}?)\s+(?:is|are|means|refers to)\b/i);
  if (direct) found.push(direct[1]);
  return [...new Set(found.map(cleanTerm).filter(looksLikeTerm))];
}

function looksLikeTerm(value: string): boolean {
  if (!value || value.length < 3 || value.length > 60) return false;
  const words = value.split(" ").filter(Boolean);
  if (words.length === 0 || words.length > 5) return false;
  const first = words[0].toLowerCase();
  if (CLAUSE_OPENERS.has(first)) return false;
  return words.every(
    (word) => !VERB_WORDS.has(word.toLowerCase().replace(/[^a-z]/g, "")) && word.length <= 24,
  );
}

/** Prefer terms the outcome map already knows, then terms the source repeats. */
function score(
  term: string,
  sentence: string,
  loCode: string | null,
  sentences: string[],
): number {
  const key = term.toLowerCase();
  let value = loCode ? 4 : 0;
  value += sentences.filter((entry) => entry.toLowerCase().includes(key)).length;
  value += Math.min(3, term.split(" ").length);
  if (sentence.length > 60) value += 1;
  return value;
}

function cleanTerm(value: string): string {
  return value
    .replace(/^(?:the|a|an|and|or)\s+/i, "")
    .replace(/\s+/g, " ")
    .replace(/[.\s]+$/, "")
    .slice(0, 60)
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The outcome whose concept or keywords appear most in the sentence. */
function tagOutcome(sentence: string, outcomes: OutcomeRow[]): string | null {
  const words = new Set(tokenize(sentence));
  let best: { code: string; hits: number } | null = null;
  for (const outcome of outcomes) {
    const terms = [outcome.concept, ...(outcome.keywords ?? [])]
      .flatMap((term) => tokenize(term ?? ""))
      .filter((token) => token.length > 3);
    const hits = terms.filter((token) => words.has(token)).length;
    if (hits > 0 && (!best || hits > best.hits)) best = { code: outcome.code, hits };
  }
  return best?.code ?? null;
}

/**
 * Keyless fallback: index the material, draft notes from the teacher's own
 * leading sentences and extract cloze questions from it. Honest about what it is
 * — no invented facts, no model-authored questions.
 */
export function extractiveDraft(input: {
  sourceText: string;
  outcomes: OutcomeRow[];
}): GeneratedContent {
  const passages = paragraphize(input.sourceText);
  const keywords = new Map<string, number>();
  for (const passage of passages)
    for (const token of new Set(tokenize(passage)))
      keywords.set(token, (keywords.get(token) ?? 0) + 1);
  const themes = [...keywords.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([token]) => token);

  const questions = extractiveQuestions(input.sourceText, input.outcomes, 20);
  const notes = [
    `Source indexed: ${passages.length} passage${passages.length === 1 ? "" : "s"}.`,
    themes.length ? `Recurring terms: ${themes.join(", ")}.` : "",
    "",
    ...passages.slice(0, 6).map((passage) => `• ${passage.slice(0, 240)}`),
    "",
    questions.length
      ? `${questions.length} draft question${questions.length === 1 ? "" : "s"} below are cloze deletions of your own sentences — read them before publishing.`
      : "No question could be extracted from this text (it has no definition-style sentences); set GROQ_API_KEY to have questions written for you.",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    notes,
    questions,
    translation: null,
    outcomes: input.outcomes.map((outcome) => ({
      code: outcome.code,
      concept: outcome.concept,
      statement: outcome.statement,
    })),
    degraded: true,
    degradedReason:
      "No AI key is configured on this deployment. The source was indexed and drafted from your own text; question generation is disabled rather than faked.",
    passages,
  };
}

export async function generateContent(input: {
  classNo: number;
  subjectName: string;
  chapterNum: number;
  chapterTitle: string;
  outcomes: OutcomeRow[];
  count: number;
  targetLanguage: Language | null;
  sourceText: string;
  config: GroqConfig | null;
  fetcher?: typeof fetch;
}): Promise<GeneratedContent> {
  const passages = paragraphize(input.sourceText);
  if (!input.config) return { ...extractiveDraft(input), passages };

  const prompt = generationPrompt(input);
  const reply = await completeGroqChat(
    [{ role: "user", content: prompt }],
    input.config,
    input.fetcher ?? fetch,
    { maxTokens: 4_096, context: `Class ${input.classNo} ${input.subjectName} · ${input.chapterTitle}` },
  );
  const parsed = parseGeneratedContent(reply, input.outcomes, input.count);
  return {
    ...parsed,
    outcomes: input.outcomes.map((outcome) => ({
      code: outcome.code,
      concept: outcome.concept,
      statement: outcome.statement,
    })),
    model: input.config.model,
    passages,
  };
}

/** Config or null, so callers can pick the keyless path without try/catch. */
export function optionalGroqConfig(): GroqConfig | null {
  try {
    return getGroqConfig({
      GROQ_API_KEY: process.env.GROQ_API_KEY,
      GROQ_MODEL: process.env.GROQ_MODEL,
    });
  } catch (error) {
    if (error instanceof AiServiceError && error.status === 503) return null;
    throw error;
  }
}
