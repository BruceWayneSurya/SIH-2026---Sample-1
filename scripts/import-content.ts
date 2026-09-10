/**
 * Bulk content importer.
 *
 * Faculty materials live in two places: PDFs in Google Drive and an Excel
 * sheet of YouTube links. Export that sheet to CSV (File → Download → CSV or
 * Save As → CSV), then run:
 *
 *   npx tsx scripts/import-content.ts content/my-content.csv            # apply
 *   npx tsx scripts/import-content.ts content/my-content.csv --dry-run  # preview
 *
 * The CSV format and the full step-by-step process are documented in
 * docs/CONTENT_UPLOAD_GUIDE.md; content/content-template.csv is a ready-made
 * header row with one example per row type.
 *
 * The script is idempotent: it skips rows whose chapter + URL (videos) or
 * chapter + title (notes) already exist, so re-running the same file — or
 * running it again after adding rows — never duplicates content.
 */
import "dotenv/config";
import { inArray } from "drizzle-orm";
import { client, db as database } from "../src/db";
import { publicDatabaseError } from "../src/db/config";
import { migrateDatabase } from "../src/db/migrate";
import { chapters, notes, videos } from "../src/db/schema";
import {
  CLASSES,
  SUBJECTS,
  chapterSlug,
  getChapters,
  validSubject,
} from "../src/lib/curriculum";
import { normalizeGoogleDriveUrl } from "../src/lib/google-drive";
import { normalizeYouTubeUrl } from "../src/lib/youtube";

type Row = Record<string, string>;

const PREFIX: Record<string, string> = {
  science: "SCI",
  mathematics: "MATH",
  "social-science": "SST",
  english: "ENG",
  hindi: "HIN",
  "arts-vocational": "ARTS",
};

/** Minimal RFC-4180 CSV reader (quoted fields, commas inside quotes, CRLF). */
function parseCsv(text: string): Row[] {
  const rows: string[][] = [];
  let field = "";
  let record: string[] = [];
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      record.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      record.push(field);
      if (record.some((c) => c.trim() !== "")) rows.push(record);
      record = [];
      field = "";
    } else field += ch;
  }
  record.push(field);
  if (record.some((c) => c.trim() !== "")) rows.push(record);
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((cells) => {
    const row: Row = {};
    header.forEach((key, i) => {
      row[key] = (cells[i] ?? "").trim();
    });
    return row;
  });
}

const num = (value: string | undefined): number | null => {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const yes = (value: string | undefined): boolean =>
  /^(y(es)?|true|1|✓)$/i.test(value?.trim() ?? "");

/** Accept either a subject slug ("science") or display name ("Science"). */
function resolveSubject(value: string): string | null {
  const v = value.trim().toLowerCase();
  if (validSubject(v)) return v;
  const byName = SUBJECTS.find(
    (s) => s.name.toLowerCase() === v || s.slug === v,
  );
  return byName?.slug ?? null;
}

/** Match "8"/"08" numbers, or a fuzzy chapter title, against the curriculum. */
function resolveChapter(
  classNo: number,
  subjectSlug: string,
  value: string,
): { num: number; title: string; slug: string } | null {
  const list = getChapters(classNo, subjectSlug);
  const asNum = num(value);
  if (asNum !== null) {
    const row = list[asNum - 1];
    if (row)
      return {
        num: asNum,
        title: row.title,
        slug: chapterSlug(row, asNum - 1),
      };
    return null;
  }
  const needle = value.toLowerCase().replace(/\s+/g, " ").trim();
  let best: { row: (typeof list)[number]; i: number; score: number } | null =
    null;
  for (const [i, row] of list.entries()) {
    const title = row.title.toLowerCase().replace(/\s+/g, " ").trim();
    let score = 0;
    if (title === needle) score = 3;
    else if (title.includes(needle) || needle.includes(title)) score = 2;
    else {
      const words = needle.split(" ").filter((w) => w.length > 3);
      const hits = words.filter((w) => title.includes(w)).length;
      if (words.length > 0 && hits / words.length >= 0.6) score = 1;
    }
    if (score > 0 && (!best || score > best.score)) best = { row, i, score };
  }
  return best
    ? {
        num: best.i + 1,
        title: best.row.title,
        slug: chapterSlug(best.row, best.i),
      }
    : null;
}

type Planned =
  | {
      kind: "video";
      chapterKey: string;
      chapterId: number;
      title: string;
      url: string;
      urlKind: "youtube" | "mp4";
      durationSec: number;
      slidesUrl: string | null;
      slidesTitle: string | null;
      uploadedByName: string;
    }
  | {
      kind: "note";
      chapterKey: string;
      chapterId: number;
      title: string;
      fileUrl: string;
      fileType: "pdf" | "image";
      content: string | null;
      authorName: string;
      facultyVerified: boolean;
    };

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

async function main() {
  const file = process.argv[2];
  const dryRun = process.argv.includes("--dry-run");
  if (!file || file.startsWith("--"))
    fail(
      "Usage: npx tsx scripts/import-content.ts <content.csv> [--dry-run]",
    );

  const { readFileSync } = await import("node:fs");
  let rows: Row[];
  try {
    rows = parseCsv(readFileSync(file, "utf8"));
  } catch {
    fail(`Could not read ${file}. Export the Excel sheet to CSV first.`);
  }
  if (rows.length === 0) fail(`${file} has no data rows.`);

  await migrateDatabase();

  // Ensure the chapter rows for every (class, subject) mentioned exist; the
  // seeded demo database already has them, but a fresh production database
  // may not yet.
  const needed = new Map<string, { classNo: number; subjectSlug: string }>();
  const parsed: {
    row: Row;
    line: number;
    classNo: number;
    subjectSlug: string;
    chapter: { num: number; title: string; slug: string };
  }[] = [];

  rows.forEach((row, index) => {
    const line = index + 2; // +1 header, +1 human counting
    const classNo = num(row.class ?? row["class no"] ?? "");
    if (!classNo || !CLASSES.includes(classNo as 6 | 7 | 8 | 9 | 10))
      fail(`Row ${line}: "class" must be one of ${CLASSES.join(", ")} (got "${row.class}").`);
    const subjectSlug = resolveSubject(row.subject ?? "");
    if (!subjectSlug)
      fail(
        `Row ${line}: "subject" must be one of ${SUBJECTS.map((s) => s.slug).join(", ")} (got "${row.subject}").`,
      );
    const chapter = resolveChapter(classNo, subjectSlug, row.chapter ?? "");
    if (!chapter)
      fail(
        `Row ${line}: no chapter "${row.chapter}" in Class ${classNo} ${subjectSlug}. Use the chapter number (1, 2, …) or the NCERT title as listed in the portal.`,
      );
    needed.set(`${classNo}-${subjectSlug}`, { classNo, subjectSlug });
    parsed.push({ row, line, classNo, subjectSlug, chapter });
  });

  // Create any missing chapters from the curriculum, in batches.
  const existing = await database
    .select({
      id: chapters.id,
      classNo: chapters.classNo,
      subjectSlug: chapters.subjectSlug,
      num: chapters.num,
    })
    .from(chapters);
  const chapterIds = new Map<string, number>();
  for (const c of existing)
    chapterIds.set(`${c.classNo}-${c.subjectSlug}-${c.num}`, c.id);

  const missing = [...needed.values()].flatMap(({ classNo, subjectSlug }) =>
    getChapters(classNo, subjectSlug)
      .map((row, i) => ({ row, i, classNo, subjectSlug }))
      .filter(
        ({ classNo, subjectSlug, i }) =>
          !chapterIds.has(`${classNo}-${subjectSlug}-${i + 1}`),
      ),
  );
  if (missing.length && !dryRun) {
    const prefix = (subjectSlug: string) => PREFIX[subjectSlug] ?? "GEN";
    for (let offset = 0; offset < missing.length; offset += 60) {
      const batch = missing.slice(offset, offset + 60);
      const created = await database
        .insert(chapters)
        .values(
          batch.map(({ row, i, classNo, subjectSlug }) => {
            const nn = String(i + 1).padStart(2, "0");
            return {
              classNo,
              subjectSlug,
              subjectName: SUBJECTS.find((s) => s.slug === subjectSlug)!.name,
              num: i + 1,
              title: row.title,
              slug: chapterSlug(row, i),
              outcomeIds: [1, 2, 3].map(
                (n) => `LO-${classNo}-${prefix(subjectSlug)}-${nn}-0${n}`,
              ),
              dikshaCode: `D-${classNo}-${prefix(subjectSlug)}-${nn}`,
            };
          }),
        )
        .returning();
      for (const c of created)
        chapterIds.set(`${c.classNo}-${c.subjectSlug}-${c.num}`, c.id);
    }
    console.log(`• created ${missing.length} missing chapter rows`);
  }

  // Plan every row, validating links with the same rules the UI enforces.
  const planned: Planned[] = [];
  const errors: string[] = [];
  for (const { row, line, classNo, subjectSlug, chapter } of parsed) {
    // In a dry run the missing chapters were not created; a placeholder id
    // keeps the dedupe query valid and simply counts their content as new.
    const chapterId =
      chapterIds.get(`${classNo}-${subjectSlug}-${chapter.num}`) ?? -1;
    const chapterKey = `Class ${classNo} ${subjectSlug} ch ${chapter.num} (${chapter.title})`;
    const type = (row.type ?? "").toLowerCase();
    const title = row.title ?? "";
    const url = row.url ?? "";

    if (type === "video" || type === "youtube") {
      const yt = normalizeYouTubeUrl(url);
      const mp4 = !yt && /^https:\/\/\S+\.mp4(\?\S*)?$/i.test(url) ? url : null;
      if (!yt && !mp4) {
        errors.push(
          `Row ${line}: "url" must be a YouTube link (watch?v=, youtu.be, shorts) or a direct https .mp4 — got "${url}".`,
        );
        continue;
      }
      planned.push({
        kind: "video",
        chapterKey,
        chapterId,
        title: title || (yt ? "YouTube lecture" : "Video lecture"),
        url: yt ? yt.watchUrl : mp4!,
        urlKind: yt ? "youtube" : "mp4",
        durationSec: num(row["duration_sec"] ?? row.duration ?? "") ?? 0,
        slidesUrl: row["slides_url"] || null,
        slidesTitle: row["slides_title"] || null,
        uploadedByName: row["author_name"] || "Faculty",
      });
    } else if (type === "note" || type === "pdf" || type === "document") {
      const drive = normalizeGoogleDriveUrl(url);
      if (!drive) {
        errors.push(
          `Row ${line}: "url" must be a Google Drive file link like https://drive.google.com/file/d/<id>/view with sharing set to "Anyone with the link · Viewer".`,
        );
        continue;
      }
      const fileType =
        (row["file_type"] ?? "").toLowerCase() === "image" ? "image" : "pdf";
      planned.push({
        kind: "note",
        chapterKey,
        chapterId,
        title,
        fileUrl: drive,
        fileType,
        content: row.content || null,
        authorName: row["author_name"] || "Faculty",
        facultyVerified: yes(row.verify),
      });
    } else {
      errors.push(
        `Row ${line}: "type" must be "video" or "note" (got "${row.type}").`,
      );
    }
  }

  if (errors.length) {
    console.error("\nProblems found — nothing was imported:");
    for (const e of errors) console.error(`  ✗ ${e}`);
    fail(`${errors.length} row(s) need fixing; re-run after correcting the CSV.`);
  }

  // Skip content that already exists (same chapter + URL / chapter + title).
  const videoRows = planned.filter((p): p is Extract<Planned, { kind: "video" }> => p.kind === "video");
  const noteRows = planned.filter((p): p is Extract<Planned, { kind: "note" }> => p.kind === "note");

  const existingVideos = videoRows.length
    ? await database
        .select({ chapterId: videos.chapterId, videoUrl: videos.videoUrl })
        .from(videos)
        .where(
          inArray(
            videos.chapterId,
            [...new Set(videoRows.map((v) => v.chapterId))],
          ),
        )
    : [];
  const existingNotes = noteRows.length
    ? await database
        .select({ chapterId: notes.chapterId, title: notes.title })
        .from(notes)
        .where(
          inArray(
            notes.chapterId,
            [...new Set(noteRows.map((n) => n.chapterId))],
          ),
        )
    : [];

  const seenVideo = new Set(
    existingVideos.map((v) => `${v.chapterId}|${v.videoUrl}`),
  );
  const seenNote = new Set(
    existingNotes.map((n) => `${n.chapterId}|${n.title.toLowerCase()}`),
  );
  const freshVideos: (typeof videos.$inferInsert & { chapterKey: string })[] =
    [];
  const freshNotes: (typeof notes.$inferInsert & { chapterKey: string })[] = [];
  for (const v of videoRows) {
    const key = `${v.chapterId}|${v.url}`;
    if (seenVideo.has(key)) continue;
    seenVideo.add(key);
    freshVideos.push({
      chapterId: v.chapterId,
      title: v.title,
      kind: v.urlKind,
      videoUrl: v.url,
      durationSec: v.durationSec,
      slidesUrl: v.slidesUrl,
      slidesTitle: v.slidesTitle,
      uploadedByName: v.uploadedByName,
      chapterKey: v.chapterKey,
    });
  }
  for (const n of noteRows) {
    const key = `${n.chapterId}|${n.title.toLowerCase()}`;
    if (seenNote.has(key)) continue;
    seenNote.add(key);
    freshNotes.push({
      chapterId: n.chapterId,
      title: n.title,
      content: n.content,
      fileUrl: n.fileUrl,
      fileName: null,
      fileType: n.fileType,
      authorId: null,
      authorName: n.authorName,
      facultyVerified: n.facultyVerified,
      verifiedByName: n.facultyVerified ? n.authorName : null,
      chapterKey: n.chapterKey,
    });
  }

  console.log(
    `\n${dryRun ? "[dry run] Would import" : "Importing"}: ${freshVideos.length} video(s), ${freshNotes.length} note(s)` +
      ` (${planned.length - freshVideos.length - freshNotes.length} duplicate or already present, skipped)`,
  );
  for (const v of freshVideos)
    console.log(`  + [video] ${v.title} → ${v.chapterKey}`);
  for (const n of freshNotes)
    console.log(`  + [note ] ${n.title} → ${n.chapterKey}`);

  if (dryRun || (freshVideos.length === 0 && freshNotes.length === 0)) {
    console.log(dryRun ? "\n[dry run] No changes were written." : "\nNothing new to import — everything is already up to date.");
    return;
  }

  // Batch inserts stay below SQLite's parameter limit.
  const { chapterKey: _videoKey, ...videoColumns } = freshVideos[0] ?? {};
  const insertableVideos = freshVideos.map(
    ({ chapterKey: _key, ...columns }) => columns,
  );
  const insertableNotes = freshNotes.map(
    ({ chapterKey: _key, ...columns }) => columns,
  );
  for (let offset = 0; offset < insertableVideos.length; offset += 60)
    await database
      .insert(videos)
      .values(insertableVideos.slice(offset, offset + 60));
  for (let offset = 0; offset < insertableNotes.length; offset += 60)
    await database
      .insert(notes)
      .values(insertableNotes.slice(offset, offset + 60));

  console.log(
    `\n✓ Done. Open a chapter page (e.g. /class/8/science) to verify the new content, then redeploy/restart so the production database shows it.`,
  );
}

main()
  .catch((error) => {
    console.error("Import failed:", publicDatabaseError(error));
    if (process.env.DEBUG) console.error(error);
    process.exitCode = 1;
  })
  .finally(() => client.close());
