import { CLASSES } from "../curriculum";
import {
  DEFAULT_LANGUAGE,
  isLanguage,
  languageName,
  type Language,
} from "../i18n/config";

/**
 * Notation the portal's renderer understands.
 *
 * The reader draws fractions, scripts, radicals, symbols and environments from
 * a LaTeX subset; anything outside it reaches the student as raw backslashes.
 * Asking for this subset is what makes an equation render instead of leak.
 */
const MATHS_INSTRUCTION =
  "For mathematics, write LaTeX for this subset and nothing else: \\frac{a}{b}, x^{2}, x_{i}, \\sqrt{x}, " +
  "symbol commands such as \\times \\pm \\leq \\pi \\theta, and \\begin{aligned}/\\begin{cases}/\\begin{pmatrix} " +
  "environments for multi-line working. Wrap inline maths in single $ and display maths in $$. " +
  "Do not use \\begin{equation}, \\label, \\tag, unicode superscripts, or code fences for maths.";

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type GroqConfig = { apiKey: string; model: string };

export class AiServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AiServiceError";
  }
}

/** Only allow the six UI languages; never interpolate arbitrary prompt instructions. */
export function validateAiLanguage(value: unknown): Language {
  if (value === undefined) return DEFAULT_LANGUAGE;
  if (!isLanguage(value))
    throw new AiServiceError(
      "Choose a supported language: English, Telugu, Hindi, Tamil, Kannada, or Malayalam.",
      400,
    );
  return value;
}

// Environment values are supplied ONLY by the server route. This module never
// reads browser storage or exposes configuration in a response.
export function getGroqConfig(env: {
  GROQ_API_KEY?: string;
  GROQ_MODEL?: string;
}): GroqConfig {
  const apiKey = env.GROQ_API_KEY?.trim();
  if (!apiKey || apiKey.includes("*") || apiKey === "your-groq-key-here") {
    throw new AiServiceError(
      "AI is not configured. Set GROQ_API_KEY in .env locally or Vercel Environment Variables, then restart or redeploy.",
      503,
    );
  }
  return { apiKey, model: env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile" };
}

export function validateChatMessages(body: unknown): ChatMessage[] {
  const messages =
    body && typeof body === "object" && "messages" in body
      ? body.messages
      : null;
  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    messages.length > 20
  ) {
    throw new AiServiceError("Send between 1 and 20 chat messages.", 400);
  }
  let total = 0;
  const validated = messages.map((message): ChatMessage => {
    if (
      !message ||
      (message.role !== "user" && message.role !== "assistant") ||
      typeof message.content !== "string" ||
      !message.content.trim() ||
      message.content.length > 4_000
    ) {
      throw new AiServiceError(
        "Each message needs a user/assistant role and 1–4,000 characters of text.",
        400,
      );
    }
    total += message.content.length;
    return { role: message.role, content: message.content.trim() };
  });
  if (total > 16_000 || validated[validated.length - 1].role !== "user") {
    throw new AiServiceError(
      "Keep the conversation under 16,000 characters and end with a user question.",
      400,
    );
  }
  return validated;
}

/** OpenAI-compatible Groq request; no SDK or browser-visible key is required. */
export async function completeGroqChat(
  messages: ChatMessage[],
  config: GroqConfig,
  fetcher: typeof fetch = fetch,
  options: {
    context?: string;
    maxTokens?: 2_048 | 4_096;
    language?: Language;
  } = {},
): Promise<string> {
  let response: Response;
  try {
    response = await fetcher(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            {
              role: "system",
              content: `You are Pragyan, a learning assistant for the NCERT curriculum, Classes ${CLASSES[0]} to ${CLASSES[CLASSES.length - 1]}. Explain concepts clearly in age-appropriate language. Be honest when uncertain. Never claim generated practice is an official PYQ. Write learner-facing explanations, questions, and answer options in ${languageName(options.language ?? DEFAULT_LANGUAGE)} unless the learner explicitly requests another language. Keep JSON field names, numeric answer indices, identifiers, and URLs unchanged. ${MATHS_INSTRUCTION} ${options.context ? `Current chapter: ${options.context}.` : ""}`,
            },
            ...messages,
          ],
          stream: false,
          max_completion_tokens: options.maxTokens ?? 2_048,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
      },
    );
  } catch (error) {
    const timeout =
      error instanceof Error &&
      ["AbortError", "TimeoutError"].includes(error.name);
    throw new AiServiceError(
      timeout
        ? "The AI request timed out. Please try again."
        : "Could not reach the AI service. Please try again.",
      timeout ? 504 : 502,
    );
  }

  // Do not forward provider error bodies: they can contain request/config data.
  if (!response.ok) {
    if (response.status === 429)
      throw new AiServiceError(
        "The AI service is busy. Please try again shortly.",
        429,
      );
    if (response.status === 401 || response.status === 403) {
      throw new AiServiceError(
        "The AI service credentials need attention. Check GROQ_API_KEY on the server.",
        503,
      );
    }
    if (response.status === 400 || response.status === 404) {
      throw new AiServiceError(
        "The configured AI model could not be used. Check GROQ_MODEL on the server.",
        502,
      );
    }
    throw new AiServiceError(
      "The AI service is temporarily unavailable. Please try again.",
      502,
    );
  }
  const body = await response.json().catch(() => null);
  const reply = body?.choices?.[0]?.message?.content;
  if (typeof reply !== "string" || !reply.trim()) {
    throw new AiServiceError(
      "The AI service returned an empty response. Please try again.",
      502,
    );
  }
  return reply.trim();
}
