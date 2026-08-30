import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { db } from "@/server/db";
import { notes } from "@/server/db/schema";
import { getActiveUser } from "@/server/auth/session";

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

  const chapterId = Number(form.get("chapterId"));
  const title = String(form.get("title") ?? "").trim();
  const content = String(form.get("content") ?? "").trim();
  const file = form.get("file");

  if (!Number.isInteger(chapterId) || chapterId <= 0)
    return Response.json({ error: "Missing chapter." }, { status: 400 });
  if (title.length < 4)
    return Response.json({ error: "Please give your notes a title (min 4 characters)." }, { status: 400 });

  let fileType: "text" | "pdf" | "image" = "text";
  let fileUrl: string | null = null;
  let fileName: string | null = null;

  if (file && typeof file !== "string" && file.size > 0) {
    fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
    const lower = fileName.toLowerCase();
    if (lower.endsWith(".pdf")) fileType = "pdf";
    else if (/\.(png|jpe?g|webp)$/.test(lower)) fileType = "image";
    else
      return Response.json(
        { error: "Only PDF and image files can be uploaded." },
        { status: 400 },
      );
    if (file.size > 8 * 1024 * 1024)
      return Response.json({ error: "File too large (max 8 MB)." }, { status: 400 });
    const bytes = Buffer.from(await file.arrayBuffer());
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    const safeName = `n${Date.now()}-${fileName}`;
    await writeFile(path.join(dir, safeName), bytes);
    fileUrl = `/uploads/${safeName}`;
  } else if (!content) {
    return Response.json(
      { error: "Add some content or attach a PDF / image file." },
      { status: 400 },
    );
  }

  const [row] = await db
    .insert(notes)
    .values({
      chapterId,
      title,
      content: content || null,
      fileName,
      fileUrl,
      fileType,
      authorId: user.id,
      authorName: user.name,
    })
    .returning({ id: notes.id });

  return Response.json({ ok: true, id: row.id });
}
