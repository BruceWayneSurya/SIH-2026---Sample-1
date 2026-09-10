import "server-only";
import {
  AiServiceError,
  validateAiLanguage,
  validateChatMessages,
} from "@/lib/ai/groq-client";
import { aiErrorResponse, authorizeAi } from "@/lib/ai/server";
import { getChapter, getChapterList } from "@/lib/queries";
import { getChapterOutcomes, getMasteryQuestions, getRetrieval } from "@/lib/queries-learning";
import { runTutor, type TutorRequest } from "@/lib/tutor/service";
import type { HintLevel, TutorMode } from "@/lib/tutor/socratic";
import { withDatabase } from "@/lib/database-route";
import { getActiveUser } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 60;

type ChatBody = {
  chapterId?: number;
  chapterPath?: string;
  mode?: TutorMode;
  hintLevel?: HintLevel;
  language?: string;
} & Record<string, unknown>;

const MODES: TutorMode[] = ["socratic", "explain", "photo", "answer"];

/**
 * The single chat endpoint behind every AI surface in the portal.
 *
 *   POST /api/ai/chat
 *   { chapterId | chapterPath: "8/science/combustion-and-flame",
 *     messages: [{ role, content }], mode?, hintLevel?, language? }
 *
 * If it cannot identify a chapter, it does not answer from memory: it returns a
 * polite "choose a chapter first" reply with the chapter list, because an
 * ungrounded answer is exactly the failure mode this portal exists to avoid.
 * When the chapter is known, the reply always carries `citations` pointing at
 * the indexed passages it was built from, and `scope` for out-of-syllabus
 * questions.
 */
async function handlePOST(req: Request) {
  const user = await getActiveUser();

  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    throw new AiServiceError("Invalid request.", 400);
  }

  const messages = validateChatMessages(body);
  const language = validateAiLanguage(body.language);
  const mode = (body.mode ?? "explain") as TutorMode;
  if (!MODES.includes(mode)) throw new AiServiceError("Choose a valid tutor mode.", 400);
  const hintLevel = Number(body.hintLevel ?? 1);
  if (![1, 2, 3].includes(hintLevel)) throw new AiServiceError("Hint level must be 1, 2 or 3.", 400);

  const chapter = await resolveChapter(body, user?.className ?? null);
  if (!chapter) return ungroundedResponse(user?.className ?? null, language);

  await authorizeAi().catch((error) => {
    // A missing key must not disable the grounded, keyless path.
    if (error instanceof AiServiceError && error.status === 503) return null;
    throw error;
  });

  const [outcomes, questions] = await Promise.all([
    getChapterOutcomes(chapter.classNo, chapter.subjectSlug, chapter.num),
    getMasteryQuestions(chapter.id),
  ]);

  const request: TutorRequest = {
    mode,
    chapterId: chapter.id,
    classNo: chapter.classNo,
    subjectSlug: chapter.subjectSlug,
    subjectName: chapter.subjectName,
    chapterTitle: chapter.title,
    outcomes,
    messages,
    hintLevel: hintLevel as HintLevel,
    language,
    image: body.image,
    bank: questions.slice(0, 200).map((question) => ({
      qtext: question.qtext,
      correctText: question.options[question.correctIndex] ?? "",
    })),
  };

  const result = await runTutor(request, {
    language,
    retrieve: async (query) => (await getRetrieval(chapter.id, query, { k: 5 })).results,
  });

  return Response.json(
    {
      ok: true,
      grounded: true,
      chapter: {
        id: chapter.id,
        title: chapter.title,
        classNo: chapter.classNo,
        subjectSlug: chapter.subjectSlug,
        href: `/class/${chapter.classNo}/${chapter.subjectSlug}/${chapter.slug}`,
      },
      ...result,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * A chapter may arrive as an id, or as the portal path the learner is already
 * on (`/class/8/science/combustion-and-flame`) so the floating tutor grounds
 * itself without the page having to pass anything.
 */
async function resolveChapter(body: ChatBody, classNo: number | null) {
  const id = Number(body.chapterId);
  if (Number.isSafeInteger(id) && id >= 1) {
    const byId = await dbChapterById(id);
    if (byId) return byId;
  }
  const path = typeof body.chapterPath === "string" ? body.chapterPath : "";
  const match = path.match(/(\d+)\/([a-z-]+)\/([a-z0-9-]+)/i);
  if (!match) return null;
  const [, cls, subject, slug] = match;
  if (classNo !== null && Number(cls) !== classNo) return null;
  return getChapter(Number(cls), subject.toLowerCase(), slug.toLowerCase());
}

async function dbChapterById(id: number) {
  const { db } = await import("@/db");
  const { chapters } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const [row] = await db.select().from(chapters).where(eq(chapters.id, id)).limit(1);
  return row ?? null;
}

/**
 * No chapter in context: say so, and offer the chapters the learner can open.
 * This is deliberately not a generic chatbot fallback.
 */
async function ungroundedResponse(classNo: number | null, language: string) {
  const suggestions: { title: string; href: string }[] = [];
  if (classNo) {
    for (const subject of ["science", "mathematics"]) {
      const list = await getChapterList(classNo, subject, null);
      for (const chapter of list.filter((entry) => entry.mcqCount > 0 || entry.videoCount > 0).slice(0, 3))
        suggestions.push({
          title: `Class ${classNo} ${subject === "science" ? "Science" : "Maths"} · ${chapter.title}`,
          href: `/class/${classNo}/${subject}/${chapter.slug}`,
        });
    }
  }
  return Response.json(
    {
      ok: true,
      grounded: false,
      reply:
        "I answer only from the passages we have indexed for a chapter, so I need to know which chapter you are working on. Open a chapter and ask again — the answer will come with the textbook page and paragraph it is based on.",
      citations: [],
      hintLevel: 1,
      followUp: "Open a chapter and ask the same question there.",
      withheld: false,
      source: "local-index" as const,
      degraded: true,
      degradedReason: "No chapter context, so no answer was generated.",
      insufficientEvidence: true,
      scope: { status: "no_chapter", message: "", suggestion: "" },
      evidence: [],
      suggestions,
      language,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request) {
  try {
    return await withDatabase(handlePOST)(req);
  } catch (error) {
    return aiErrorResponse(error);
  }
}
