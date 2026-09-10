/**
 * Socratic tutor engine.
 *
 * Three rules are enforced in code, not only in the prompt:
 *
 *  1. **Hints before answers.** A three-step ladder ("notice → rule → next
 *     step") ends with a question, and `withholdFinalAnswer()` strips a sentence
 *     that leaks a known correct option while the learner is below step 3.
 *  2. **Nothing is said without a source.** The caller passes the retrieved
 *     passages in; prose is only composed when retrieval cleared the evidence
 *     gate, and every citation chip is built from a chunk that exists.
 *  3. **It works with no API key.** `localHint()` composes a genuine Socratic
 *     hint from the index and the outcome's known misconceptions, so the loop is
 *     demoable offline, in a school with no connectivity, or after a quota runs
 *     out.
 */

import type { Citation, Retrieval } from "../rag/retrieve";
import type { LearningOutcome } from "../outcomes/taxonomy";
import type { Language } from "../i18n/config";
import { languageName } from "../i18n/config";

export type TutorMode = "socratic" | "explain" | "photo" | "answer";

/** 1 = notice, 2 = the rule, 3 = the next step (still not the answer). */
export type HintLevel = 1 | 2 | 3;

export const HINT_LADDER: Record<HintLevel, { title: string; intent: string }> = {
  1: {
    title: "Help me notice",
    intent:
      "Ask one orienting question about the quantities or words in the learner's work. Do not state any rule yet.",
  },
  2: {
    title: "Show me the rule",
    intent:
      "Quote the relevant rule, definition or formula from the sources, then ask the learner what it implies for their step.",
  },
  3: {
    title: "Give me the next step",
    intent:
      "Work one step of the reasoning from the sources and hand the final step back to the learner as a question.",
  },
};

export type TutorBank = { qtext: string; correctText: string };

export type GroundedReply = {
  reply: string;
  citations: Citation[];
  hintLevel: HintLevel;
  followUp: string | null;
  /** True when the answer had to be trimmed to avoid giving the answer away. */
  withheld: boolean;
  /** Where the prose came from — shown as a badge in the UI. */
  source: "model" | "local-index";
  /** True when the model is unavailable and the deterministic path ran. */
  degraded: boolean;
  degradedReason?: string;
};

export type PromptContext = {
  classNo: number;
  subjectName: string;
  chapterTitle: string;
  outcomes: LearningOutcome[];
  passages: Retrieval[];
  language: Language;
  mode: TutorMode;
  hintLevel: HintLevel;
  /** Learner typed this alongside a photo. */
  learnerText?: string;
  /** Known correct options for the questions in play (never sent to the model). */
  withheldAnswers: string[];
};

/** Show the model exactly what it is allowed to rely on (and nothing else). */
function sourceBlock(passages: Retrieval[]): string {
  if (passages.length === 0) return "SOURCES: (none retrieved)";
  return [
    "SOURCES (the only material you may use; cite the label after each claim):",
    ...passages.map(
      (passage, index) =>
        `[S${index + 1}] ${passage.citation.label} — ${passage.chunk.text}`,
    ),
  ].join("\n");
}

export function buildSystemPrompt(context: PromptContext): string {
  const outcomeBlock = context.outcomes
    .map((outcome) => `- ${outcome.code} ${outcome.concept}: ${outcome.statement}`)
    .join("\n");
  const ladder = HINT_LADDER[context.hintLevel];
  const modeRules: Record<TutorMode, string> = {
    socratic: [
      "MODE: Socratic. Guide, never solve.",
      `Hint step ${context.hintLevel} of 3 — ${ladder.title}. ${ladder.intent}`,
      "End your reply with exactly one question that the learner can answer in a sentence.",
      "NEVER state the final answer, the correct option, or the value the learner has to find. If asked for it, name what they must check instead.",
    ].join(" "),
    explain: [
      "MODE: Explain. Teach the concept in short paragraphs with one everyday example, then check understanding with one question.",
    ].join(" "),
    photo: [
      "MODE: Photo help. You are reading a photograph of the learner's textbook page or handwritten working.",
      "First give a one-line transcription of the relevant line only if you are confident; if the image is unreadable, say so instead of guessing.",
      "Then name the first incorrect step (or say the step is correct), and give a hint that leads to the correction — never the corrected final answer.",
    ].join(" "),
    answer: [
      "MODE: Model answer. A teacher or the learner's own review needs the full worked answer; give it, then cite the sources.",
    ].join(" "),
  };

  return [
    `You are Pragyan, the NCERT tutor inside a Government of India learning portal. You are speaking to a Class ${context.classNo} learner in ${context.subjectName}, chapter "${context.chapterTitle}".`,
    "You may use ONLY the numbered sources below. If the sources do not cover the question, say plainly that you cannot find it in this chapter and suggest where it is taught — never fill the gap from memory.",
    "Be warm, brief and age-appropriate. Use simple sentences. Plain text only: no HTML, no markdown tables.",
    outcomeBlock
      ? `The chapter's NCERT learning outcomes:\n${outcomeBlock}`
      : "This chapter has no curated outcome map yet; keep answers inside the chapter's own scope.",
    sourceBlock(context.passages),
    modeRules[context.mode],
    `Write in ${languageName(context.language)}. Keep mathematical symbols, formulas and identifiers unchanged.`,
    "Finish with a line that starts with 'Next:' giving one small action for the learner.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Prompt for the multimodal (photo) call — the image is attached separately. */
export function buildPhotoSystemPrompt(context: PromptContext): string {
  return buildSystemPrompt({ ...context, mode: "photo" });
}

/**
 * Deterministic answer-leak guard.
 *
 * In Socratic mode below step 3 a sentence that reproduces a known correct
 * option is replaced, whatever the model intended. This is the difference
 * between "we asked the model not to" and "the product does not do it".
 */
export function withholdFinalAnswer(
  reply: string,
  bank: TutorBank[],
  hintLevel: HintLevel,
  mode: TutorMode = "socratic",
): { text: string; withheld: boolean } {
  if (mode === "answer" || hintLevel >= 3 || bank.length === 0)
    return { text: reply, withheld: false };
  const sentences = reply.split(/(?<=[.!?])\s+/);
  let withheld = false;
  const cleaned = sentences.map((sentence) => {
    const normalized = sentence.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    const leak = bank.find((entry) => {
      const option = entry.correctText
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return option.length >= 4 && normalized.includes(option);
    });
    if (!leak) return sentence;
    withheld = true;
    return "I am not going to hand you the answer — that is your step to take.";
  });
  return { text: cleaned.join(" "), withheld };
}

/** Pull the optional "Next:" line out of a reply so the UI can style it. */
export function splitFollowUp(reply: string): { reply: string; followUp: string | null } {
  const match = reply.match(/(?:^|\n)\s*Next:\s*([\s\S]+)$/i);
  if (!match) return { reply: reply.trim(), followUp: null };
  return {
    reply: reply.slice(0, match.index).trim(),
    followUp: match[1].trim(),
  };
}

/* --------------------------- keyless fallback --------------------------- */

function firstClause(text: string, maxWords = 18): string {
  const words = text.split(/\s+/).slice(0, maxWords).join(" ");
  return words.replace(/[,;:]$/, "");
}

/**
 * A real hint, composed from the index and the outcome map, with no model call.
 * Used when GROQ_API_KEY is absent or the provider fails — the learner still
 * gets a step forward instead of an error box.
 */
export function localHint(input: {
  query: string;
  passages: Retrieval[];
  outcomes: LearningOutcome[];
  hintLevel: HintLevel;
  chapterTitle: string;
}): GroundedReply {
  const { query, passages, outcomes, hintLevel, chapterTitle } = input;
  const best = passages[0] ?? null;
  const matchedOutcome =
    outcomes.find((outcome) =>
      outcome.keywords.some((keyword) =>
        query.toLowerCase().includes(keyword.toLowerCase()),
      ),
    ) ?? outcomes[0] ?? null;

  const citations = passages.slice(0, 2).map((passage) => passage.citation);
  const label = best?.citation.label ?? `your ${chapterTitle} chapter`;
  const misconception = matchedOutcome?.misconceptions[0];
  const excerpt = best ? firstClause(best.snippet, 16) : "";

  const bodies: Record<HintLevel, string> = {
    1: [
      `Let's find it together instead of me telling you.`,
      matchedOutcome
        ? `Your question is really about **${matchedOutcome.concept}**.`
        : `Your question sits inside "${chapterTitle}".`,
      excerpt
        ? `Look at this line from ${label}: “${excerpt}…”. Which word in your own working does that line disagree with?`
        : `First write down what the question gives you and what it asks you to find. Which of the two is missing?`,
    ].join(" "),
    2: [
      `Here is the rule, from ${label}.`,
      excerpt ? `“${excerpt}…”` : "",
      misconception
        ? `Watch out — the common mistake here is thinking that ${misconception.replace(/\.$/, "").toLowerCase()}. Does your step do that?`
        : `Read your last line again with that rule in front of you. Where does it stop matching the rule?`,
    ]
      .filter(Boolean)
      .join(" "),
    3: [
      `Next step only, then you finish it. Rewrite your line using ${label}: ${excerpt ? `“${excerpt}…”` : (matchedOutcome?.statement ?? "")}`,
      `Then do the same for the step after it and tell me the two lines you get. I will check them, not solve them for you.`,
    ].join(" "),
  };

  return {
    reply: bodies[hintLevel],
    citations,
    hintLevel,
    followUp:
      hintLevel === 1
        ? "Reply with what you notice and I will give you the rule next."
        : "Reply with your next line and I will check your reasoning.",
    withheld: false,
    source: "local-index",
    degraded: true,
    degradedReason:
      "AI generation is not configured, so this hint was composed from the chapter's own indexed passages.",
  };
}

/** Deterministic explanation used by "explain" mode without a model. */
export function localExplanation(input: {
  outcome: LearningOutcome;
  passages: Retrieval[];
}): GroundedReply {
  const { outcome, passages } = input;
  const body = [
    `**${outcome.concept}** — ${outcome.definition}`,
    passages.length
      ? `Textbook line: “${firstClause(passages[0].snippet, 22)}…” (${passages[0].citation.label})`
      : "",
    `Where people go wrong: ${outcome.misconceptions[0] ?? "rushing the last step."}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  return {
    reply: body,
    citations: passages.slice(0, 2).map((passage) => passage.citation),
    hintLevel: 3,
    followUp: `Start with this: ${outcome.keywords.slice(0, 3).join(", ")}. Which one explains the example in your book?`,
    withheld: false,
    source: "local-index",
    degraded: true,
    degradedReason: "AI generation is not configured; this is the curated outcome text.",
  };
}
