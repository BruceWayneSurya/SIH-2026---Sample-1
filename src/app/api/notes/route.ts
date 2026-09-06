import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { chapters, notes } from "@/db/schema";
import { validateNoteUpload } from "@/lib/note-upload";
import { getActiveUser } from "@/lib/session";

export async function POST(req: Request) {
  const user = await getActiveUser();
  if (!user)
    return Response.json({ error: "Please log in first." }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Invalid form data." }, { status: 400 });
  }

  const result = validateNoteUpload(form);
  if (result.error !== undefined) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  const { chapterId, title, content, file, fileType, fileName } = result.data;
  let { fileUrl } = result.data;
  let uploadedPath: string | null = null;

  try {
    const [chapter] = await db
      .select({ id: chapters.id })
      .from(chapters)
      .where(eq(chapters.id, chapterId))
      .limit(1);
    if (!chapter) {
      return Response.json({ error: "Chapter not found." }, { status: 404 });
    }

    if (file) {
      const dir = path.join(process.cwd(), "public", "uploads");
      await mkdir(dir, { recursive: true });
      const safeName = `n${randomUUID()}-${fileName}`;
      uploadedPath = path.join(dir, safeName);
      await writeFile(uploadedPath, Buffer.from(await file.arrayBuffer()), { flag: "wx" });
      fileUrl = `/uploads/${safeName}`;
    }

    const [row] = await db
      .insert(notes)
      .values({
        chapterId,
        title,
        content,
        fileName,
        fileUrl,
        fileType,
        authorId: user.id,
        authorName: user.name,
      })
      .returning({ id: notes.id });

    return Response.json({ ok: true, id: row.id }, { status: 201 });
  } catch (error) {
    // Don't leave orphaned local files if the database insert failed.
    if (uploadedPath) await unlink(uploadedPath).catch(() => undefined);
    console.error("[notes:upload]", error);
    return Response.json(
      { error: "Could not publish your note. Please try again." },
      { status: 500 },
    );
  }
}
