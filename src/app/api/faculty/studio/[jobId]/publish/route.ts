import "server-only";
import { and, count, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  chapters,
  classNotebookItems,
  classNotebooks,
  contentJobs,
  learningOutcomes,
  mcqQuestions,
  notes,
  sourceChunks,
  sourceDocuments,
} from "@/db/schema";
import { withDatabase } from "@/lib/database-route";
import { getActiveUser } from "@/lib/session";
import { canModerateNotes } from "@/lib/faculty-email";
import { paragraphize } from "@/lib/content/pdf";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Publish a reviewed job into the chapter.
 *
 * One action, five effects, all reversible by editing the chapter later:
 *   1. draft learning outcomes become real rows (marked `faculty_approved`)
 *   2. the notes become a faculty-verified community note
 *   3. the source text is chunked into the RAG index as a high-authority source
 *   4. the validated MCQ bank is added, each question tagged to an outcome
 *   5. the job is marked published and added to the class notebook
 *
 * Idempotent: publishing twice returns the original result instead of
 * duplicating a question bank.
 */
async function handlePOST(
  _req: Request,
  ctx: { params: Promise<{ jobId: string }> },
) {
  const user = await getActiveUser();
  if (!user) return Response.json({ error: "Sign-in required." }, { status: 401 });
  if (user.role !== "faculty")
    return Response.json({ error: "Only faculty can publish material." }, { status: 403 });
  if (!canModerateNotes(user))
    return Response.json(
      {
        error:
          "Publishing creates faculty-verified material, so your institutional email must be verified first.",
      },
      { status: 403 },
    );

  const { jobId } = await ctx.params;
  const id = Number(jobId);
  if (!Number.isSafeInteger(id) || id < 1)
    return Response.json({ error: "Invalid job." }, { status: 400 });

  const [job] = await db.select().from(contentJobs).where(eq(contentJobs.id, id)).limit(1);
  if (!job) return Response.json({ error: "Job not found." }, { status: 404 });

  const [chapter] = await db
    .select()
    .from(chapters)
    .where(eq(chapters.id, job.chapterId))
    .limit(1);
  if (!chapter) return Response.json({ error: "Chapter not found." }, { status: 404 });

  if (job.status === "published")
    return Response.json({
      ok: true,
      alreadyPublished: true,
      publishedAt: job.publishedAt,
      chapterId: chapter.id,
    });

  const payload = job.payload ?? {};
  const outcomeDrafts = payload.outcomes ?? [];
  const questions = payload.questions ?? [];

  // 1 · learning outcomes (only the codes that do not exist yet)
  const codes = outcomeDrafts.map((outcome) => outcome.code);
  const existing = codes.length
    ? await db
        .select({ code: learningOutcomes.code })
        .from(learningOutcomes)
        .where(inArray(learningOutcomes.code, codes))
    : [];
  const existingCodes = new Set(existing.map((row) => row.code));
  const newOutcomes = outcomeDrafts.filter((outcome) => !existingCodes.has(outcome.code));
  if (newOutcomes.length) {
    await db.insert(learningOutcomes).values(
      newOutcomes.map((outcome, index) => ({
        code: outcome.code,
        classNo: chapter.classNo,
        subjectSlug: chapter.subjectSlug,
        chapterNum: chapter.num,
        parentCode: index === 0 ? null : newOutcomes[0].code,
        orderIndex: index + 1,
        concept: outcome.concept,
        statement: outcome.statement,
        definition: "",
        kind: "concept" as const,
        sourceStatement: "Drafted with AI assistance in the faculty studio and approved by faculty.",
        sourceDoc: `Faculty-approved draft · ${user.name}`,
        sourcePage: null,
        textbookPage: null,
        keywords: outcome.concept.toLowerCase().split(/[^a-z]+/).filter((word) => word.length > 3),
        misconceptions: [],
        diagram: "none",
        origin: "faculty_approved",
      })),
    );
    const allCodes = [
      ...(chapter.outcomeIds ?? []),
      ...newOutcomes.map((outcome) => outcome.code),
    ];
    await db
      .update(chapters)
      .set({ outcomeIds: [...new Set(allCodes)] })
      .where(eq(chapters.id, chapter.id));
  }

  // 2 · the notes, as a faculty-verified community note
  const noteTitle = `${chapter.title} — notes from ${job.sourceName || "faculty material"}`;
  const [existingNote] = await db
    .select({ id: notes.id })
    .from(notes)
    .where(and(eq(notes.chapterId, chapter.id), eq(notes.title, noteTitle)))
    .limit(1);
  const noteId =
    existingNote?.id ??
    (
      await db
        .insert(notes)
        .values({
          chapterId: chapter.id,
          title: noteTitle,
          content: payload.notes ?? "",
          fileType: "text",
          authorId: user.id,
          authorName: user.name,
          facultyVerified: true,
          verifiedByName: user.name,
        })
        .returning({ id: notes.id })
    )[0]?.id;

  // 3 · the source text joins the RAG index at faculty-verified authority
  const docKey = `job-${job.id}`;
  const [existingDoc] = await db
    .select({ id: sourceDocuments.id })
    .from(sourceDocuments)
    .where(and(eq(sourceDocuments.chapterId, chapter.id), eq(sourceDocuments.docKey, docKey)))
    .limit(1);
  let documentId = existingDoc?.id ?? null;
  let sourcesIndexed = 0;
  if (!documentId) {
    const [created] = await db
      .insert(sourceDocuments)
      .values({
        chapterId: chapter.id,
        docKey,
        title: noteTitle,
        attribution: `${user.name} (faculty, verified)`,
        kind: "faculty_note",
        authority: "faculty_verified",
        status: "published",
        noteId: noteId ?? null,
        uploadedById: user.id,
        uploadedByName: user.name,
      })
      .returning({ id: sourceDocuments.id });
    documentId = created?.id ?? null;
    // The same text the teacher published is what gets indexed — the
    // transcript when there is one (audio/video jobs), otherwise the source —
    // capped at the same 200 chunks the offline pack and retrieval use.
    const passages = paragraphize(job.transcript || job.sourceText).slice(0, 200);
    if (documentId && passages.length) {
      await db.insert(sourceChunks).values(
        passages.map((text, index) => ({
          documentId: documentId as number,
          chapterId: chapter.id,
          seq: index + 1,
          page: null,
          para: index + 1,
          heading: null,
          text,
        })),
      );
      sourcesIndexed = passages.length;
    }
  } else {
    const [indexed] = await db
      .select({ n: count() })
      .from(sourceChunks)
      .where(eq(sourceChunks.documentId, documentId));
    sourcesIndexed = indexed?.n ?? 0;
  }

  // 4 · the validated question bank enters the chapter's assessment
  let questionsAdded = 0;
  if (questions.length) {
    const existingBank = await db
      .select({ qtext: mcqQuestions.qtext })
      .from(mcqQuestions)
      .where(eq(mcqQuestions.chapterId, chapter.id));
    const present = new Set(existingBank.map((row) => row.qtext.trim().toLowerCase()));
    const fresh = questions.filter(
      (question) => !present.has(question.qtext.trim().toLowerCase()),
    );
    if (fresh.length) {
      await db.insert(mcqQuestions).values(
        fresh.map((question) => ({
          chapterId: chapter.id,
          qtext: question.qtext,
          options: question.options,
          correctIndex: question.correctIndex,
          explanation: question.explanation,
          isPyq: false,
          pyqTag: "Faculty studio",
          loCode: question.loCode ?? null,
        })),
      );
      questionsAdded = fresh.length;
    }
  }

  // 5 · published + in the class notebook for every learner in the class
  await db
    .update(contentJobs)
    .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
    .where(eq(contentJobs.id, job.id));

  const [notebook] = await db
    .select({ id: classNotebooks.id })
    .from(classNotebooks)
    .where(eq(classNotebooks.chapterId, chapter.id))
    .limit(1);
  const notebookId =
    notebook?.id ??
    (
      await db
        .insert(classNotebooks)
        .values({
          chapterId: chapter.id,
          classNo: chapter.classNo,
          subjectSlug: chapter.subjectSlug,
          title: `${user.name}'s Class ${chapter.classNo} ${chapter.subjectName} notebook — ${chapter.title}`,
          curatorId: user.id,
          curatorName: user.name,
        })
        .onConflictDoNothing()
        .returning({ id: classNotebooks.id })
    )[0]?.id;
  if (notebookId && noteId) {
    const [already] = await db
      .select({ id: classNotebookItems.id })
      .from(classNotebookItems)
      .where(
        and(
          eq(classNotebookItems.notebookId, notebookId),
          eq(classNotebookItems.noteId, noteId),
        ),
      )
      .limit(1);
    if (!already)
      await db.insert(classNotebookItems).values({
        notebookId,
        kind: "note",
        title: noteTitle,
        noteId,
        sourceDocumentId: documentId,
        addedById: user.id,
        addedByName: user.name,
      });
  }

  return Response.json(
    {
      ok: true,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      noteId,
      questionsAdded,
      outcomesAdded: newOutcomes.length,
      sourcesIndexed,
      notebook: notebookId ?? null,
      publishedAt: new Date().toISOString(),
      link: `/class/${chapter.classNo}/${chapter.subjectSlug}/${chapter.slug}`,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export const POST = withDatabase(handlePOST);
