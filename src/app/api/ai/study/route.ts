import "server-only";
import { completeGroqChat, validateAiLanguage } from "@/lib/ai/groq-client";
import { aiErrorResponse, authorizeAi, chapterContext } from "@/lib/ai/server";
import { recordLearningActivityBestEffort } from "@/lib/analytics/record";
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
    const { config, userId } = await authorizeAi();
    const context = await chapterContext(input.chapterId);
    const reply = await completeGroqChat(
      [{ role: "user", content: studyPrompt(input, context) }],
      config,
      fetch,
      { context, language, maxTokens: input.mode === "quiz" ? 4_096 : 2_048 },
    );
    // Analytics: an AI study generation counts as a learning activity.
    await recordLearningActivityBestEffort({
      userId,
      chapterId: input.chapterId,
      aiSessions: 1,
    });
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
