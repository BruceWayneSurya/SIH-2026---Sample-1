import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { googleDrivePreviewUrl, normalizeGoogleDriveUrl } from "../src/lib/google-drive";
import {
  MAX_DRIVE_URL_LENGTH,
  MAX_NOTE_CONTENT_LENGTH,
  MAX_NOTE_FILE_BYTES,
  MAX_NOTE_TITLE_LENGTH,
  validateNoteUpload,
} from "../src/lib/note-upload";

const fileId = "1AbC_def-Gh1234567890";
const canonical = `https://drive.google.com/file/d/${fileId}/view`;

function form(values: Record<string, string | File> = {}) {
  const data = new FormData();
  data.set("chapterId", "1");
  data.set("title", "Revision notes");
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("Google Drive PDF links", () => {
  for (const input of [
    canonical,
    `${canonical}?usp=sharing`,
    `${canonical}?usp=drive_link#preview`,
    `https://drive.google.com/file/d/${fileId}/preview`,
    `https://drive.google.com/file/d/${fileId}`,
    `https://drive.google.com/file/u/0/d/${fileId}/view`,
    `https://drive.google.com/open?id=${fileId}`,
    `https://drive.google.com/uc?export=download&id=${fileId}`,
    `  ${canonical}  `,
  ]) {
    it(`normalizes ${input.trim()}`, () => {
      assert.equal(normalizeGoogleDriveUrl(input), canonical);
    });
  }

  it("creates an in-page preview URL from view, open, download and preview links", () => {
    for (const link of [canonical, `${canonical}?usp=sharing`, `https://drive.google.com/open?id=${fileId}`, `https://drive.google.com/uc?id=${fileId}&export=download`, canonical.replace("/view", "/preview")]) {
      assert.equal(googleDrivePreviewUrl(link), canonical.replace("/view", "/preview"));
    }
    assert.equal(googleDrivePreviewUrl(`${canonical}?resourcekey=0-Ab_c&usp=sharing`), `${canonical.replace("/view", "/preview")}?resourcekey=0-Ab_c`);
    assert.equal(googleDrivePreviewUrl("https://example.com/notes.pdf"), null);
    assert.equal(googleDrivePreviewUrl("https://drive.google.com/drive/folders/folder123"), null);
    assert.equal(googleDrivePreviewUrl("javascript:alert(1)"), null);
  });

  it("preserves access resource keys while removing tracking parameters", () => {
    assert.equal(
      normalizeGoogleDriveUrl(`https://drive.google.com/open?id=${fileId}&resourcekey=0-Ab_c&usp=sharing`),
      `${canonical}?resourcekey=0-Ab_c`,
    );
  });

  for (const input of [
    "",
    "not a URL",
    `http://drive.google.com/file/d/${fileId}/view`,
    `https://drive.google.com.evil.example/file/d/${fileId}/view`,
    `https://drive.google.com@evil.example/file/d/${fileId}/view`,
    `https://user:password@drive.google.com/file/d/${fileId}/view`,
    `https://drive.google.com:8443/file/d/${fileId}/view`,
    `https://docs.google.com/document/d/${fileId}/edit`,
    `https://drive.google.com/drive/folders/${fileId}`,
    `https://drive.google.com/drive/u/0/folders/${fileId}?id=${fileId}`,
    `https://drive.google.com/?id=${fileId}`,
    "https://drive.google.com/open",
    "https://drive.google.com/uc?id=invalid%2Fid",
    "https://drive.google.com/file/d//view",
    `https://drive.google.com/file/d/${fileId}/view/extra`,
    "javascript:alert(1)",
    "data:application/pdf;base64,AAAA",
  ]) {
    it(`rejects unsafe or non-file input: ${input || "empty"}`, () => {
      assert.equal(normalizeGoogleDriveUrl(input), null);
    });
  }
});

describe("note upload validation", () => {
  it("accepts text-only notes and trims surrounding whitespace", () => {
    const result = validateNoteUpload(form({ title: "  Revision notes  ", content: "  First point\nSecond point  " }));
    assert.deepEqual(result.data, {
      chapterId: 1,
      title: "Revision notes",
      content: "First point\nSecond point",
      file: null,
      fileType: "text",
      fileUrl: null,
      fileName: null,
    });
  });

  it("accepts a PDF link without text or a local file", () => {
    const result = validateNoteUpload(form({ driveUrl: `https://drive.google.com/open?id=${fileId}` }));
    assert.ok(result.data);
    assert.equal(result.data.fileType, "pdf");
    assert.equal(result.data.fileUrl, canonical);
    assert.equal(result.data.file, null);
    assert.equal(result.data.content, null);
  });

  it("stores both text and a PDF version on the same note", () => {
    const result = validateNoteUpload(form({ content: "Text version", driveUrl: canonical }));
    assert.ok(result.data);
    assert.equal(result.data.content, "Text version");
    assert.equal(result.data.fileUrl, canonical);
    assert.equal(result.data.fileType, "pdf");
  });

  it("requires content rather than a title alone", () => {
    assert.match(validateNoteUpload(form({ content: "   ", driveUrl: "  " })).error!, /Add text notes/);
  });

  it("rejects an invalid Drive link even when text is supplied", () => {
    assert.match(validateNoteUpload(form({ content: "Text", driveUrl: "https://example.com/test.pdf" })).error!, /valid Google Drive file link/);
  });

  it("rejects overly long links", () => {
    assert.ok(validateNoteUpload(form({ driveUrl: canonical + "?" + "x".repeat(MAX_DRIVE_URL_LENGTH) })).error);
  });

  for (const chapterId of ["", "0", "-1", "abc", "1.5", "2147483648", "Infinity"]) {
    it(`rejects invalid chapter ID: ${chapterId || "empty"}`, () => {
      assert.match(validateNoteUpload(form({ chapterId, content: "Text" })).error!, /chapter/);
    });
  }

  it("enforces title and content length limits", () => {
    assert.ok(validateNoteUpload(form({ title: "abc", content: "Text" })).error);
    assert.ok(validateNoteUpload(form({ title: "a".repeat(MAX_NOTE_TITLE_LENGTH + 1), content: "Text" })).error);
    assert.ok(validateNoteUpload(form({ content: "a".repeat(MAX_NOTE_CONTENT_LENGTH + 1) })).error);
    assert.ok(validateNoteUpload(form({ title: "a".repeat(MAX_NOTE_TITLE_LENGTH), content: "a".repeat(MAX_NOTE_CONTENT_LENGTH) })).data);
  });

  it("rejects non-text form fields instead of storing [object File]", () => {
    assert.match(validateNoteUpload(form({ title: new File(["data"], "title.txt"), content: "Text" })).error!, /Invalid title/);
  });

  it("preserves existing local PDF uploads and sanitizes file names", () => {
    const file = new File(["%PDF-1.4"], "My Revision (final).PDF", { type: "application/pdf" });
    const result = validateNoteUpload(form({ file, content: "Summary" }));
    assert.ok(result.data);
    assert.equal(result.data.fileType, "pdf");
    assert.equal(result.data.fileName, "My_Revision__final_.pdf");
    assert.equal(result.data.file, file);
    assert.equal(result.data.content, "Summary");
  });

  it("preserves file extensions on long names", () => {
    const result = validateNoteUpload(form({ file: new File(["pdf"], `${"a".repeat(100)}.pdf`) }));
    assert.ok(result.data);
    assert.ok(result.data.fileName!.endsWith(".pdf"));
    assert.ok(result.data.fileName!.length <= 80);
  });

  it("keeps local image attachments working", () => {
    const result = validateNoteUpload(form({ file: new File(["image"], "diagram.png") }));
    assert.equal(result.data?.fileType, "image");
  });

  it("rejects two different document sources rather than silently dropping one", () => {
    assert.match(validateNoteUpload(form({ driveUrl: canonical, file: new File(["pdf"], "notes.pdf") })).error!, /not both/);
  });

  it("rejects unsupported, empty, oversized and malformed local files", () => {
    assert.match(validateNoteUpload(form({ file: new File(["script"], "notes.html") })).error!, /Only PDF/);
    assert.match(validateNoteUpload(form({ file: new File([], "notes.pdf") })).error!, /empty/);
    assert.match(validateNoteUpload(form({ file: new File([new Uint8Array(MAX_NOTE_FILE_BYTES + 1)], "notes.pdf") })).error!, /max 8 MB/);
    assert.match(validateNoteUpload(form({ file: "not a file" })).error!, /Invalid file/);
  });

  it("ignores an unselected browser file input for text and Drive notes", () => {
    const empty = new File([], "");
    assert.ok(validateNoteUpload(form({ content: "Text", file: empty })).data);
    assert.ok(validateNoteUpload(form({ driveUrl: canonical, file: empty })).data);
  });
});
