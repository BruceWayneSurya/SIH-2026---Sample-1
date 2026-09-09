import { withDatabase } from "@/lib/database-route";
import { db } from "@/db";
import { noteVotes, notes, xpEvents } from "@/db/schema";
import { and, count, eq } from "drizzle-orm";
import { getActiveUser } from "@/lib/session";

async function handlePOST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getActiveUser();
  if (!user)
    return Response.json({ error: "Please log in first." }, { status: 401 });

  const { id } = await ctx.params;
  const noteId = Number(id);
  if (!Number.isInteger(noteId) || noteId <= 0 || noteId > 2_147_483_647)
    return Response.json({ error: "Invalid note." }, { status: 400 });

  // The UI sends the desired state so retries/double clicks cannot undo a vote.
  // Keep body-less POSTs as a toggle for compatibility with existing clients.
  let requestedVote: boolean | undefined;
  try {
    const raw = await req.text();
    if (raw.trim()) {
      const body = JSON.parse(raw);
      if (typeof body?.voted !== "boolean") throw new Error("Invalid vote state");
      requestedVote = body.voted;
    }
  } catch {
    return Response.json({ error: "Send a valid voted boolean." }, { status: 400 });
  }

  try {
    const result = await db.transaction(async (tx) => {
      // libSQL begins a SQLite IMMEDIATE write transaction before this callback.
      // Counting, toggling and the one-time XP reward therefore commit together,
      // even when several classmates vote at once (no PostgreSQL row locks).
      const [note] = await tx
        .select()
        .from(notes)
        .where(eq(notes.id, noteId))
        .limit(1);
      if (!note) return null;

      const voteFilter = and(eq(noteVotes.noteId, noteId), eq(noteVotes.userId, user.id));
      const [existing] = await tx
        .select({ id: noteVotes.id })
        .from(noteVotes)
        .where(voteFilter)
        .limit(1);
      const voted = requestedVote ?? !existing;

      if (voted && !existing) {
        await tx.insert(noteVotes).values({ noteId, userId: user.id }).onConflictDoNothing();
      } else if (!voted && existing) {
        await tx.delete(noteVotes).where(voteFilter);
      }

      const [c] = await tx
        .select({ n: count() })
        .from(noteVotes)
        .where(eq(noteVotes.noteId, noteId));
      const upvotes = c.n;

      let reward = 0;
      if (voted && upvotes >= 10 && !note.rewarded && note.authorId !== null) {
        await tx.update(notes).set({ rewarded: true }).where(eq(notes.id, noteId));
        await tx.insert(xpEvents).values({
          userId: note.authorId,
          type: "note_upvotes",
          amount: 50,
          refType: "note",
          refId: noteId,
          note: `Note reached 10+ upvotes — "${note.title}"`,
        });
        reward = 50;
      }

      return { ok: true, upvotes, voted, reward };
    });

    if (!result) {
      return Response.json({ error: "Note not found." }, { status: 404 });
    }
    return Response.json(result);
  } catch (error) {
    console.error("[notes:vote]", error);
    return Response.json(
      { error: "Could not save your vote. Please try again." },
      { status: 500 },
    );
  }
}

export const POST = withDatabase(handlePOST);

export const runtime = "nodejs";
export const maxDuration = 60;
