/**
 * The tutor service: one place that decides what Pragyan may say.
 *
 * Order of operations (all enforced here, not in the prompt alone):
 *   1. scope guard   — off-syllabus questions get a polite, determined refusal
 *   2. retrieval     — passages are pulled from the chapter's indexed sources
 *   3. evidence gate — no evidence ⇒ "I can't find this in your chapter"
 *   4. composition   — the model writes, or the deterministic local path does
 *   5. leak guard    — a Socratic hint below step 3 cannot contain the answer
 *
 * The return value always carries the citations that the UI renders as
 * "NCERT p. 62, para 3" chips, and those citations are built from chunks that
 * were actually retrieved — there is no code path that invents a reference.
 */

import type { ChatMessage } from "../ai/groq-client";
import { AiServiceError, completeGroqChat, getGroqConfig } from "../ai/groq-client";
import {
  completeGroqVision,
  getVisionModel,
  validateImageDataUrl,
  type ImagePayload,
} from "../ai/multimodal";
import type { Language } from "../i18n/config";
import { detectOutOfScope, type ScopeVerdict } from "./scope";
import {
  buildPhotoSystemPrompt,
  buildSystemPrompt,
  localExplanation,
  localHint,
  splitFollowUp,
  withholdFinalAnswer,
  type GroundedReply,
  type HintLevel,
  type TutorMode,
} from "./socratic";
import type { Citation, Retrieval } from "../rag/retrieve";
import type { OutcomeRow } from "../queries-learning";

export type TutorRequest = {
  mode: TutorMode;
  chapterId: number;
  classNo: number;
  subjectSlug: string;
  subjectName: string;
  chapterTitle: string;
  outcomes: OutcomeRow[];
  messages: ChatMessage[];
  hintLevel?: HintLevel;
  language: Language;
  image?: unknown;
  /** Correct options of the chapter's bank; used only by the leak guard. */
  bank?: { qtext: string; correctText: string }[];
};

export type TutorResult = GroundedReply & {
  mode: TutorMode;
  scope: ScopeVerdict;
  /** Retrieval scores, so the dashboard can show why a source was chosen. */
  evidence: { label: string; score: number; chunkId: number }[];
  /** True when sources were too weak to answer and the tutor said so. */
  insufficientEvidence: boolean;
  image?: { approxBytes: number; mimeType: string };
};

export type TutorDeps = {
  retrieve: (query: string) => Promise<Retrieval[]>;
  language: Language;
};

function lastUserMessage(messages: ChatMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1)
    if (messages[index].role === "user") return messages[index].content;
  return "";
}

/** Query used for retrieval: the learner's words plus the immediately prior turn. */
export function retrievalQuery(messages: ChatMessage[]): string {
  const last = lastUserMessage(messages);
  const previous = messages.length > 1 ? messages[messages.length - 2] : null;
  if (previous && previous.role === "user") return `${previous.content} ${last}`.slice(0, 800);
  return last.slice(0, 800);
}

export function buildSocraticBank(
  questions: { qtext: string; options: string[]; correctIndex: number }[],
): { qtext: string; correctText: string }[] {
  return questions.map((question) => ({
    qtext: question.qtext,
    correctText: question.options[question.correctIndex] ?? "",
  }));
}

export async function runTutor(
  request: TutorRequest,
  deps: TutorDeps,
): Promise<TutorResult> {
  const mode: TutorMode = request.mode;
  const hintLevel: HintLevel = request.hintLevel ?? 1;
  const userText = lastUserMessage(request.messages);

  const scope = detectOutOfScope(userText, {
    classNo: request.classNo,
    subjectSlug: request.subjectSlug,
    subjectName: request.subjectName,
    chapterTitle: request.chapterTitle,
    outcomes: request.outcomes,
  });

  // 1 · scope: refuse before spending a single token.
  if (scope.status !== "in_scope") {
    return {
      reply: `${scope.message}\n\n${scope.suggestion}`,
      citations: [],
      hintLevel,
      followUp: scope.suggestion,
      withheld: false,
      source: "local-index",
      degraded: true,
      degradedReason: "Out-of-syllabus question — answered by the scope guard.",
      mode,
      scope,
      evidence: [],
      insufficientEvidence: false,
    };
  }

  // 2 · retrieval over the chapter's source set (textbook first, by authority).
  const query = mode === "photo" ? `${userText} working mistake` : retrievalQuery(request.messages);
  const results = await deps.retrieve(query);
  const citations: Citation[] = results.slice(0, 3).map((result) => result.citation);
  const evidence = results.map((result) => ({
    label: result.citation.label,
    score: result.score,
    chunkId: result.chunk.id,
  }));

  // 3 · evidence gate
  if (results.length === 0) {
    return {
      reply: [
        `I can't find this in your Class ${request.classNo} chapter "${request.chapterTitle}", so I won't guess at it.`,
        request.outcomes.length
          ? `In this chapter I can help with: ${request.outcomes
              .slice(0, 4)
              .map((outcome) => outcome.concept.toLowerCase())
              .join(", ")}.`
          : "Ask me about something in this chapter and I will show you the exact paragraph.",
      ].join(" "),
      citations: [],
      hintLevel,
      followUp: request.outcomes[0]
        ? `Try: “help me understand ${request.outcomes[0].concept.toLowerCase()}”.`
        : null,
      withheld: false,
      source: "local-index",
      degraded: true,
      degradedReason: "No indexed passage matched — the tutor did not answer.",
      mode,
      scope,
      evidence,
      insufficientEvidence: true,
    };
  }

  const config = safeGroqConfig();
  const passages = results;

  // 4a · photo mode first: the model must read the page before it can guide.
  if (mode === "photo" && request.image !== undefined) {
    const image = validateImageDataUrl(request.image);
    if (config) {
      const raw = await completeGroqVision(
        {
          image,
          systemPrompt: buildPhotoSystemPrompt({
            classNo: request.classNo,
            subjectName: request.subjectName,
            chapterTitle: request.chapterTitle,
            outcomes: request.outcomes,
            passages,
            language: deps.language,
            mode: "photo",
            hintLevel,
            learnerText: userText,
            withheldAnswers: (request.bank ?? []).map((entry) => entry.correctText),
          }),
          userText:
            userText ||
            "Read my working, find the first step that is wrong, and give me a hint without telling me the answer.",
        },
        config,
        { model: getVisionModel({ GROQ_VISION_MODEL: process.env.GROQ_VISION_MODEL }) },
      );
      const guarded = withholdFinalAnswer(raw, request.bank ?? [], hintLevel, "photo");
      const split = splitFollowUp(guarded.text);
      return {
        reply: split.reply,
        citations,
        hintLevel,
        followUp: split.followUp,
        withheld: guarded.withheld,
        source: "model",
        degraded: false,
        mode,
        scope,
        evidence,
        insufficientEvidence: false,
        image: { approxBytes: image.approxBytes, mimeType: image.mimeType },
      };
    }
    // No vision model configured: say so plainly and still move the learner on.
    const hint = localHint({ query, passages, outcomes: request.outcomes, hintLevel, chapterTitle: request.chapterTitle });
    return {
      ...hint,
      reply: [
        "I can't read photos on this deployment (no vision model is configured), so I won't pretend to see your page.",
        "Type the line you are stuck on, or check it yourself against this: ",
        `“${passages[0].snippet}” (${passages[0].citation.label}).`,
      ].join(" "),
      mode,
      scope,
      evidence,
      insufficientEvidence: false,
      image: { approxBytes: image.approxBytes, mimeType: image.mimeType },
    };
  }

  // 4b · text composition, with a deterministic fallback when no key is set.
  if (!config) {
    if (mode === "explain" && request.outcomes.length > 0) {
      const outcome = pickOutcome(query, request.outcomes, passages);
      const local = localExplanation({ outcome, passages });
      return { ...local, mode, scope, evidence, insufficientEvidence: false };
    }
    const local = localHint({
      query,
      passages,
      outcomes: request.outcomes,
      hintLevel,
      chapterTitle: request.chapterTitle,
    });
    return { ...local, mode, scope, evidence, insufficientEvidence: false };
  }

  const raw = await completeGroqChat(
    request.messages,
    config,
    fetch,
    {
      language: deps.language,
      systemPromptOverride: buildSystemPrompt({
        classNo: request.classNo,
        subjectName: request.subjectName,
        chapterTitle: request.chapterTitle,
        outcomes: request.outcomes,
        passages,
        language: deps.language,
        mode,
        hintLevel,
        learnerText: userText,
        withheldAnswers: (request.bank ?? []).map((entry) => entry.correctText),
      }),
    },
  );
  const guarded = withholdFinalAnswer(raw, request.bank ?? [], hintLevel, mode);
  const split = splitFollowUp(guarded.text);
  return {
    reply: split.reply,
    citations,
    hintLevel,
    followUp: split.followUp,
    withheld: guarded.withheld,
    source: "model",
    degraded: false,
    mode,
    scope,
    evidence,
    insufficientEvidence: false,
  };
}

function pickOutcome(
  query: string,
  outcomes: OutcomeRow[],
  passages: Retrieval[],
): OutcomeRow {
  const lower = query.toLowerCase();
  const direct = outcomes.find((outcome) =>
    outcome.keywords.some((keyword) => lower.includes(keyword.toLowerCase())),
  );
  if (direct) return direct;
  const fromSource = outcomes.find((outcome) =>
    passages.some((passage) =>
      outcome.keywords.some((keyword) =>
        passage.chunk.text.toLowerCase().includes(keyword.toLowerCase()),
      ),
    ),
  );
  return fromSource ?? outcomes[0];
}

/** Config or null — a missing key switches the deterministic local path on. */
function safeGroqConfig() {
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

export function tutorErrorResponse(error: unknown): Response {
  const known = error instanceof AiServiceError;
  return Response.json(
    {
      error: known ? error.message : "Could not complete the tutor request.",
      /** The UI shows this so a learner knows the tutor did not fail silently. */
      retryable: !known || error.status >= 500,
    },
    {
      status: known ? error.status : 500,
      headers: { "Cache-Control": "no-store", ...(known && error.status === 429 ? { "Retry-After": "60" } : {}) },
    },
  );
}

export type { ImagePayload };
