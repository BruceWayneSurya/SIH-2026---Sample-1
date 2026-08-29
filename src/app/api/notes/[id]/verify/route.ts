import { db } from "@/db";
import { notes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getActiveUser } from "@/lib/session";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getActiveUser();
  if (!user)
    return Response.json({ error: "Please log in first." }, { status: 401 });
  if (user.role !== "faculty")
    return Response.json(
      { error: "Only faculty members can verify notes." },
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
