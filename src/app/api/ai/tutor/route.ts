import "server-only";
import { withDatabase } from "@/lib/database-route";
import { getActiveUser } from "@/lib/session";
import { authorizeAi } from "@/lib/ai/server";
import { getChapterOutcomes, getMasteryQuestions, getRetrieval } from "@/lib/queries-learning";
import { runTutor, tutorErrorResponse, type TutorRequest } from "@/lib/tutor/service";
import type { HintLevel, TutorMode } from "@/lib/tutor/socratic";
import { validateChatMessages, validateAiLanguage, AiServiceError } from "@/lib/ai/groq-client";
import { chapters } from "@/db/schema";
import { db } from "@/db";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODES: TutorMode[] = ["socratic", "explain", "photo", "answer"];

/**
 * The grounded, Socratic tutor.
 *
 *   POST /api/ai/tutor
 *   { chapterId, mode: "socratic"|"explain"|"photo", hintLevel: 1|2|3,
 *     language, messages: [{role, content}], image?: "data:image/jpeg;base64,…" }
 *
 * Every reply carries `citations` — the passages the answer was drawn from —
 * and `scope`, so the client can show the polite refusal when a question is
 * outside the syllabus instead of a hallucinated answer.
 */
async function handlePOST(req: Request) {
  const user = await getActiveUser();
  if (!user) return Response.json({ error: "Sign-in required." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    throw new AiServiceError("Invalid request.", 400);
  }

  const chapterId = Number(body.chapterId);
  if (!Number.isSafeInteger(chapterId) || chapterId < 1)
    throw new AiServiceError("Choose a valid chapter.", 400);
  const mode = String(body.mode ?? "socratic") as TutorMode;
  if (!MODES.includes(mode)) throw new AiServiceError("Choose socratic, explain or photo mode.", 400);
  const hintLevel = Number(body.hintLevel ?? 1);
  if (![1, 2, 3].includes(hintLevel)) throw new AiServiceError("Hint level must be 1, 2 or 3.", 400);
  const language = validateAiLanguage(body.language);
  const messages = validateChatMessages(body);

  const rateLimit = await authorizeAi().catch((error) => {
    // A missing key must not disable the grounded, keyless path.
    if (error instanceof AiServiceError && error.status === 503) return null;
    throw error;
  });

  const [chapter] = await db.select().from(chapters).where(eq(chapters.id, chapterId)).limit(1);
  if (!chapter) throw new AiServiceError("Chapter not found.", 404);

  const [outcomes, questions] = await Promise.all([
    getChapterOutcomes(chapter.classNo, chapter.subjectSlug, chapter.num),
    getMasteryQuestions(chapterId),
  ]);

  const request: TutorRequest = {
    mode,
    chapterId,
    classNo: chapter.classNo,
    subjectSlug: chapter.subjectSlug,
    subjectName: chapter.subjectName,
    chapterTitle: chapter.title,
    outcomes,
    messages,
    hintLevel: hintLevel as HintLevel,
    language,
    image: body.image,
    bank: questions
      .slice(0, 200)
      .map((question) => ({
        qtext: question.qtext,
        correctText: question.options[question.correctIndex] ?? "",
      })),
  };

  const result = await runTutor(request, {
    language,
    retrieve: async (query) => {
      const { results } = await getRetrieval(chapterId, query, { k: 5 });
      return results;
    },
  });

  return Response.json(
    {
      ok: true,
      ...result,
      rateLimited: rateLimit === null,
      hintLadder: [
        { level: 1, title: "Help me notice" },
        { level: 2, title: "Show me the rule" },
        { level: 3, title: "Give me the next step" },
      ],
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request) {
  try {
    return await withDatabase(handlePOST)(req);
  } catch (error) {
    return tutorErrorResponse(error);
  }
}
