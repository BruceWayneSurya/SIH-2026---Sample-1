import { db } from "@/db";
import { noteVotes, notes, xpEvents } from "@/db/schema";
import { and, count, eq } from "drizzle-orm";
import { getActiveUser } from "@/lib/session";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getActiveUser();
  if (!user)
    return Response.json({ error: "Please log in first." }, { status: 401 });

  const { id } = await ctx.params;
  const noteId = Number(id);
  if (!Number.isInteger(noteId))
    return Response.json({ error: "Invalid note." }, { status: 400 });

  const [note] = await db.select().from(notes).where(eq(notes.id, noteId)).limit(1);
  if (!note)
    return Response.json({ error: "Note not found." }, { status: 404 });

  const [existing] = await db
    .select({ id: noteVotes.id })
    .from(noteVotes)
    .where(and(eq(noteVotes.noteId, noteId), eq(noteVotes.userId, user.id)))
    .limit(1);

  let voted: boolean;
  if (existing) {
    await db.delete(noteVotes).where(eq(noteVotes.id, existing.id));
    voted = false;
  } else {
    await db
      .insert(noteVotes)
      .values({ noteId, userId: user.id })
      .onConflictDoNothing();
    voted = true;
  }

  const [c] = await db
    .select({ n: count() })
    .from(noteVotes)
    .where(eq(noteVotes.noteId, noteId));
  const upvotes = c.n;

  let reward = 0;
  if (voted && upvotes >= 10 && !note.rewarded && note.authorId) {
    await db.update(notes).set({ rewarded: true }).where(eq(notes.id, noteId));
    await db.insert(xpEvents).values({
      userId: note.authorId,
      type: "note_upvotes",
      amount: 50,
      refType: "note",
      refId: noteId,
      note: `Note reached 10+ upvotes — "${note.title}"`,
    });
    reward = 50;
  }

  return Response.json({ ok: true, upvotes, voted, reward });
}
