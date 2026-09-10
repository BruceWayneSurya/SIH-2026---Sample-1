import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { chapters, contentJobs } from "@/db/schema";
import { withDatabase } from "@/lib/database-route";
import { getActiveUser } from "@/lib/session";
import { canModerateNotes } from "@/lib/faculty-email";
import { getChapterOutcomes } from "@/lib/queries-learning";
import { outcomeCode, type LearningOutcome } from "@/lib/outcomes/taxonomy";
import {
  clampSource,
  extractiveDraft,
  generateContent,
  optionalGroqConfig,
  TARGET_LANGUAGES,
} from "@/lib/content/generate";
import { extractPdfText } from "@/lib/content/pdf";
import { AiServiceError } from "@/lib/ai/groq-client";
import { isLanguage, type Language } from "@/lib/i18n/config";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_PDF_BYTES = 12_000_000;

/**
 * Teacher content pipeline.
 *
 *   POST /api/faculty/studio           (JSON)     { chapterId, text, targetLanguage?,
 *                                                   count?, outcomes?: ["…", "…"] }
 *   POST /api/faculty/studio           (FormData) file=PDF|audio + same fields
 *
 * Produces a `content_jobs` row in `ready` with notes, outcome-tagged MCQs and a
 * translation. Nothing reaches learners until a teacher publishes it.
 *
 * For a chapter with no curated outcome map — Social Science 0/23, Maths 1/15 —
 * the teacher may supply outcome statements; they are stored with
 * `origin: faculty_approved` and tagged on screen as such, so the difference
 * between an NCERT-published outcome and a teacher's draft is always visible.
 */
async function handlePOST(req: Request) {
  const user = await getActiveUser();
  if (!user) return Response.json({ error: "Sign-in required." }, { status: 401 });
  if (user.role !== "faculty")
    return Response.json(
      { error: "Only faculty accounts can add material to a chapter." },
      { status: 403 },
    );

  const contentType = req.headers.get("content-type") ?? "";
  let payload: {
    chapterId: number;
    text: string;
    count: number;
    targetLanguage: Language | null;
    outcomes: string[];
    sourceKind: "text" | "pdf" | "photo" | "audio";
    sourceName: string;
    transcript?: string;
  };

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    const chapterId = Number(form.get("chapterId"));
    const kind = String(form.get("kind") ?? "pdf") as "pdf" | "audio";
    const outcomeLines = String(form.get("outcomes") ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 12);
    const targetLanguageRaw = String(form.get("targetLanguage") ?? "");
    const count = Number(form.get("count") ?? 20);

    if (!(file instanceof File))
      return Response.json({ error: "Attach a PDF or an audio recording." }, { status: 400 });

    const bytes = new Uint8Array(await file.arrayBuffer());
    let text = "";
    let transcript: string | undefined;
    let sourceName = file.name || "upload";

    if (kind === "audio") {
      const { transcribeGroqAudio, getAudioModel, validateAudioUpload } = await import(
        "@/lib/ai/multimodal"
      );
      validateAudioUpload({ bytes: bytes.byteLength, mimeType: file.type || null, name: sourceName });
      const config = optionalGroqConfig();
      if (!config)
        throw new AiServiceError(
          "Lecture transcription needs GROQ_API_KEY on the server. You can still paste the lecture text instead.",
          503,
        );
      transcript = await transcribeGroqAudio(
        {
          bytes,
          fileName: sourceName.endsWith(".webm") ? sourceName : `${sourceName}.webm`,
          mimeType: file.type || "audio/webm",
        },
        config,
        { model: getAudioModel({ GROQ_AUDIO_MODEL: process.env.GROQ_AUDIO_MODEL }) },
      );
      text = transcript;
      sourceName = `Recording · ${sourceName}`;
    } else {
      if (bytes.byteLength > MAX_PDF_BYTES)
        throw new AiServiceError("PDFs must be under 12 MB.", 413);
      const extraction = extractPdfText(bytes);
      if (extraction.unreadable)
        throw new AiServiceError(
          extraction.reason ??
            "That PDF could not be read. Paste the text, or photograph a page and use the photo path.",
          422,
        );
      text = extraction.text;
      sourceName = `${file.name || "document.pdf"} (${extraction.pages || "?"} pages)`;
    }

    payload = {
      chapterId,
      text,
      count,
      targetLanguage: isLanguage(targetLanguageRaw) ? targetLanguageRaw : null,
      outcomes: outcomeLines,
      sourceKind: kind === "audio" ? "audio" : "pdf",
      sourceName,
      transcript,
    };
  } else {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return Response.json({ error: "Send JSON or a file." }, { status: 400 });
    const outcomeLines = Array.isArray(body.outcomes)
      ? body.outcomes.map((line) => String(line).trim()).filter(Boolean).slice(0, 12)
      : String(body.outcomes ?? "")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .slice(0, 12);
    payload = {
      chapterId: Number(body.chapterId),
      text: String(body.text ?? ""),
      count: Math.min(20, Math.max(3, Number(body.count ?? 20))),
      targetLanguage: isLanguage(body.targetLanguage) ? body.targetLanguage : null,
      outcomes: outcomeLines,
      sourceKind: "text",
      sourceName: String(body.sourceName ?? "Pasted text").slice(0, 160),
    };
  }

  if (!Number.isSafeInteger(payload.chapterId) || payload.chapterId < 1)
    throw new AiServiceError("Choose a chapter.", 400);
  const source = clampSource(payload.text);
  if (source.length < 200)
    throw new AiServiceError(
      "The material is too short to build a chapter pack. Add at least a few paragraphs.",
      400,
    );

  const [chapter] = await db
    .select()
    .from(chapters)
    .where(eq(chapters.id, payload.chapterId))
    .limit(1);
  if (!chapter) throw new AiServiceError("Chapter not found.", 404);

  // Curated outcomes win; otherwise the teacher's own draft statements are used.
  const curated = await getChapterOutcomes(chapter.classNo, chapter.subjectSlug, chapter.num);
  const outcomes: LearningOutcome[] = curated.length
    ? curated
    : payload.outcomes.map((statement, index) => ({
        code: outcomeCode(chapter.classNo, chapter.subjectSlug, chapter.num, index + 1),
        classNo: chapter.classNo,
        subjectSlug: chapter.subjectSlug,
        chapterNum: chapter.num,
        parent: index === 0 ? null : outcomeCode(chapter.classNo, chapter.subjectSlug, chapter.num, 1),
        order: index + 1,
        concept: statement.split(/[.:—-]/)[0].trim().slice(0, 90) || `Outcome ${index + 1}`,
        statement,
        definition: "",
        kind: "concept" as const,
        sourceStatement: "Drafted by faculty in the content studio; awaiting subject-expert sign-off.",
        sourceDoc: `Faculty draft · ${user.name}`,
        sourcePage: 0,
        textbookPage: 0,
        keywords: statement
          .toLowerCase()
          .split(/[^a-z]+/)
          .filter((word) => word.length > 4)
          .slice(0, 8),
        misconceptions: [],
        diagram: "none" as const,
      }));

  const config = optionalGroqConfig();
  const generated = await generateContent({
    classNo: chapter.classNo,
    subjectName: chapter.subjectName,
    chapterNum: chapter.num,
    chapterTitle: chapter.title,
    outcomes,
    count: payload.count,
    targetLanguage: payload.targetLanguage,
    sourceText: source,
    config,
  });

  const [job] = await db
    .insert(contentJobs)
    .values({
      chapterId: chapter.id,
      createdById: user.id,
      createdByName: user.name,
      sourceKind: payload.sourceKind,
      sourceName: payload.sourceName,
      sourceText: source,
      transcript: payload.transcript ?? null,
      status: "ready",
      targetLanguage: payload.targetLanguage ?? "te",
      payload: {
        notes: generated.notes,
        questions: generated.questions,
        translation: generated.translation,
        outcomes: generated.outcomes,
        model: generated.model,
        degraded: generated.degraded,
      },
    })
    .returning();

  return Response.json(
    {
      ok: true,
      job: {
        id: job.id,
        chapterId: job.chapterId,
        chapterTitle: chapter.title,
        sourceKind: job.sourceKind,
        sourceName: job.sourceName,
        status: job.status,
        degraded: generated.degraded ?? false,
        degradedReason: generated.degradedReason ?? null,
        model: generated.model ?? null,
        passages: generated.passages.length,
        notes: generated.notes,
        questions: generated.questions,
        translation: generated.translation,
        outcomes: generated.outcomes,
        newOutcomes: curated.length === 0,
      },
      targetLanguages: TARGET_LANGUAGES,
      /** Shown to the teacher: this is a draft until they publish it. */
      requiresReview: true,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export const POST = withDatabase(handlePOST);
