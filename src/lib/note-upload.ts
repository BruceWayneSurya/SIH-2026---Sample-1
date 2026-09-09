import { normalizeGoogleDriveUrl } from "./google-drive";

export const MAX_NOTE_TITLE_LENGTH = 200;
export const MAX_NOTE_CONTENT_LENGTH = 50_000;
export const MAX_DRIVE_URL_LENGTH = 2_048;
export const MAX_NOTE_FILE_BYTES = 8 * 1024 * 1024;

type NoteUpload = {
  chapterId: number;
  title: string;
  content: string | null;
  file: File | null;
  fileType: "text" | "pdf" | "image";
  fileUrl: string | null;
  fileName: string | null;
};

type ValidationResult = { data: NoteUpload; error?: never } | { error: string; data?: never };

/** Shared, side-effect-free validation for text, Drive PDFs and legacy uploads. */
export function validateNoteUpload(form: FormData): ValidationResult {
  for (const key of ["chapterId", "title", "content", "driveUrl"]) {
    const value = form.get(key);
    if (value !== null && typeof value !== "string") {
      return { error: `Invalid ${key} field.` };
    }
  }

  const chapterId = Number(form.get("chapterId"));
  const title = String(form.get("title") ?? "").trim();
  const content = String(form.get("content") ?? "").trim();
  const driveUrl = String(form.get("driveUrl") ?? "").trim();
  const attachment = form.get("file");

  if (!Number.isInteger(chapterId) || chapterId <= 0 || chapterId > 2_147_483_647) {
    return { error: "Missing or invalid chapter." };
  }
  if (title.length < 4 || title.length > MAX_NOTE_TITLE_LENGTH) {
    return { error: `Please give your notes a title (4–${MAX_NOTE_TITLE_LENGTH} characters).` };
  }
  if (content.length > MAX_NOTE_CONTENT_LENGTH) {
    return { error: `Text notes must be ${MAX_NOTE_CONTENT_LENGTH.toLocaleString("en-IN")} characters or fewer.` };
  }
  if (typeof attachment === "string") {
    return { error: "Invalid file attachment." };
  }
  if (attachment && attachment.name && attachment.size === 0) {
    return { error: "The selected file is empty. Please choose another file." };
  }

  const file = attachment && attachment.size > 0 ? attachment : null;
  if (driveUrl && file) {
    return { error: "Use either a Google Drive link or a local attachment, not both." };
  }

  let fileType: NoteUpload["fileType"] = "text";
  let fileUrl: string | null = null;
  let fileName: string | null = null;

  if (driveUrl) {
    fileUrl = driveUrl.length <= MAX_DRIVE_URL_LENGTH ? normalizeGoogleDriveUrl(driveUrl) : null;
    if (!fileUrl) {
      return { error: "Enter a valid Google Drive file link for your PDF, not a folder or Google Docs link." };
    }
    fileType = "pdf";
  } else if (file) {
    // Keep existing local PDF/image uploads working alongside Drive links.
    const lower = file.name.toLowerCase();
    if (lower.endsWith(".pdf")) fileType = "pdf";
    else if (/\.(png|jpe?g|webp)$/.test(lower)) fileType = "image";
    else return { error: "Only PDF and image files can be uploaded." };

    if (file.size > MAX_NOTE_FILE_BYTES) {
      return { error: "File too large (max 8 MB)." };
    }
    const extension = lower.slice(lower.lastIndexOf("."));
    const base = file.name.slice(0, -extension.length).replace(/[^a-zA-Z0-9_-]/g, "_");
    fileName = `${base.slice(0, 75) || "notes"}${extension}`;
  } else if (!content) {
    return { error: "Add text notes, a Google Drive PDF link, or a local PDF / image file." };
  }

  return {
    data: { chapterId, title, content: content || null, file, fileType, fileUrl, fileName },
  };
}
