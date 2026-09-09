import { withDatabase } from "@/lib/database-route";
import { db } from "@/db";
import { notes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getActiveUser } from "@/lib/session";
import { canModerateNotes } from "@/lib/faculty-email";

async function handlePOST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getActiveUser();
  if (!user)
    return Response.json({ error: "Please log in first." }, { status: 401 });
  if (!canModerateNotes(user))
    return Response.json(
      {
        error:
          user.role !== "faculty"
            ? "Only faculty members can verify notes."
            : "Your faculty account is pending institutional review, so note verification is not available yet.",
      },
      { status: 403 },
    );

  const { id } = await ctx.params;
  const noteId = Number(id);
  const body = await req.json().catch(() => ({} as { verified?: boolean }));
  const verified = !!body.verified;

  const [row] = await db
    .update(notes)
    .set({
      facultyVerified: verified,
      verifiedByName: verified ? user.name : null,
    })
    .where(eq(notes.id, noteId))
    .returning({ id: notes.id });

  if (!row)
    return Response.json({ error: "Note not found." }, { status: 404 });
  return Response.json({ ok: true, facultyVerified: verified });
}

export const POST = withDatabase(handlePOST);

export const runtime = "nodejs";
export const maxDuration = 60;
