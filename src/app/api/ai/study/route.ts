import "server-only";
import { completeGroqChat, validateAiLanguage } from "@/lib/ai/groq-client";
import { aiErrorResponse, authorizeAi, chapterContext } from "@/lib/ai/server";
import {
  parsePracticeQuiz,
  studyPrompt,
  validateStudyRequest,
} from "@/lib/ai/study";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const input = validateStudyRequest(body);
    const language = validateAiLanguage(body.language);
    const config = await authorizeAi();
    const context = await chapterContext(input.chapterId);
    const reply = await completeGroqChat(
      [{ role: "user", content: studyPrompt(input, context) }],
      config,
      fetch,
      { context, language, maxTokens: input.mode === "quiz" ? 4_096 : 2_048 },
    );
    return Response.json(
      input.mode === "quiz"
        ? { ok: true, questions: parsePracticeQuiz(reply, input.count) }
        : { ok: true, reply },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return aiErrorResponse(error);
  }
}
