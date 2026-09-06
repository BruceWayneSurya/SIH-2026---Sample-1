import "server-only";
import {
  AiServiceError,
  completeGroqChat,
  validateChatMessages,
  validateAiLanguage,
} from "@/lib/ai/groq-client";
import { aiErrorResponse, authorizeAi, chapterContext } from "@/lib/ai/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const messages = validateChatMessages(body);
    const language = validateAiLanguage(body.language);
    if (
      body.chapterId !== undefined &&
      (!Number.isSafeInteger(body.chapterId) || body.chapterId < 1)
    ) {
      throw new AiServiceError("Choose a valid chapter.", 400);
    }
    const config = await authorizeAi();
    const context = body.chapterId
      ? await chapterContext(body.chapterId)
      : undefined;
    const reply = await completeGroqChat(messages, config, fetch, {
      context,
      language,
    });
    return Response.json(
      { ok: true, reply },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return aiErrorResponse(error);
  }
}
