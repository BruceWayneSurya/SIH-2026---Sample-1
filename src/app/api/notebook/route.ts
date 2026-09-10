import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { chapters, classNotebookItems, classNotebooks, notes, sourceDocuments } from "@/db/schema";
import { withDatabase } from "@/lib/database-route";
import { getActiveUser } from "@/lib/session";
import { canModerateNotes } from "@/lib/faculty-email";

export const runtime = "nodejs";
export const maxDuration = 60;

const KINDS = ["note", "pdf", "youtube", "worksheet", "link"] as const;
type Kind = (typeof KINDS)[number];

/**
 * Class notebooks — a teacher curates the chapter's source set once and every
 * learner in the class gets the same grounded tutor.
 *
 *   POST   /api/notebook  { chapterId, kind, title, url?, noteId? }
 *   DELETE /api/notebook?itemId=…
 *
 * Items added here are what the tutor is allowed to quote, so curation is not
 * decoration: removing a source removes it from the tutor's evidence.
 */
async function handlePOST(req: Request) {
  const user = await getActiveUser();
  if (!user) return Response.json({ error: "Sign-in required." }, { status: 401 });
  if (user.role !== "faculty" || !canModerateNotes(user))
    return Response.json(
      { error: "Only verified faculty can curate a class notebook." },
      { status: 403 },
    );

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: "Send JSON." }, { status: 400 });

  const chapterId = Number(body.chapterId);
  const kind = String(body.kind ?? "link") as Kind;
  const title = String(body.title ?? "").trim().slice(0, 200);
  const url = body.url ? String(body.url).trim().slice(0, 500) : null;
  const noteId = body.noteId ? Number(body.noteId) : null;

  if (!Number.isSafeInteger(chapterId) || chapterId < 1)
    return Response.json({ error: "Choose a chapter." }, { status: 400 });
  if (!KINDS.includes(kind)) return Response.json({ error: "Unknown item kind." }, { status: 400 });
  if (!title) return Response.json({ error: "Give the item a title." }, { status: 400 });
  if (url && !/^https?:\/\//.test(url) && !url.startsWith("/"))
    return Response.json({ error: "Links must start with https:// ." }, { status: 400 });

  const [chapter] = await db.select().from(chapters).where(eq(chapters.id, chapterId)).limit(1);
  if (!chapter) return Response.json({ error: "Chapter not found." }, { status: 404 });

  if (noteId) {
    const [note] = await db
      .select({ id: notes.id, chapterId: notes.chapterId })
      .from(notes)
      .where(eq(notes.id, noteId))
      .limit(1);
    if (!note || note.chapterId !== chapter.id)
      return Response.json({ error: "That note is not from this chapter." }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: classNotebooks.id })
    .from(classNotebooks)
    .where(eq(classNotebooks.chapterId, chapter.id))
    .limit(1);
  const notebookId =
    existing?.id ??
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
  if (!notebookId) return Response.json({ error: "Could not open the notebook." }, { status: 500 });

  // Indexing keeps the promise that anything in the notebook can be cited.
  let sourceDocumentId: number | null = null;
  if (kind === "worksheet" || kind === "pdf") {
    const docKey = `notebook-${notebookId}-${kind}-${title.slice(0, 40).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const [doc] = await db
      .insert(sourceDocuments)
      .values({
        chapterId: chapter.id,
        docKey,
        title,
        attribution: `${user.name} (faculty)`,
        kind: kind === "worksheet" ? "worksheet" : "faculty_note",
        authority: "faculty_verified",
        url,
        status: "published",
        uploadedById: user.id,
        uploadedByName: user.name,
      })
      .onConflictDoUpdate({
        target: [sourceDocuments.chapterId, sourceDocuments.docKey],
        set: { title, url },
      })
      .returning({ id: sourceDocuments.id });
    sourceDocumentId = doc?.id ?? null;
  }

  const [item] = await db
    .insert(classNotebookItems)
    .values({
      notebookId,
      kind,
      title,
      url,
      noteId,
      sourceDocumentId,
      addedById: user.id,
      addedByName: user.name,
    })
    .returning();

  await db
    .update(classNotebooks)
    .set({ updatedAt: new Date() })
    .where(eq(classNotebooks.id, notebookId));

  return Response.json({ ok: true, notebookId, item }, { headers: { "Cache-Control": "no-store" } });
}

async function handleDELETE(req: Request) {
  const user = await getActiveUser();
  if (!user) return Response.json({ error: "Sign-in required." }, { status: 401 });
  if (user.role !== "faculty" || !canModerateNotes(user))
    return Response.json({ error: "Only verified faculty can curate a class notebook." }, { status: 403 });

  const itemId = Number(new URL(req.url).searchParams.get("itemId"));
  if (!Number.isSafeInteger(itemId) || itemId < 1)
    return Response.json({ error: "Invalid item." }, { status: 400 });

  const [item] = await db
    .select()
    .from(classNotebookItems)
    .where(eq(classNotebookItems.id, itemId))
    .limit(1);
  if (!item) return Response.json({ ok: true, removed: 0 });

  await db.delete(classNotebookItems).where(eq(classNotebookItems.id, itemId));
  if (item.sourceDocumentId)
    // Unpublishing removes it from the tutor's evidence set as well.
    await db
      .update(sourceDocuments)
      .set({ status: "pending_review" })
      .where(
        and(
          eq(sourceDocuments.id, item.sourceDocumentId),
          eq(sourceDocuments.authority, "faculty_verified"),
        ),
      );

  return Response.json({ ok: true, removed: 1 }, { headers: { "Cache-Control": "no-store" } });
}

export const POST = withDatabase(handlePOST);
export const DELETE = withDatabase(handleDELETE);
