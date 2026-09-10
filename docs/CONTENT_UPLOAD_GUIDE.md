# Bulk content upload — Classes 8, 9 and 10

This is the step-by-step process for loading **all** learning material onto the
portal: chapter-wise **PDFs stored in Google Drive** and **YouTube video links
kept in an Excel sheet**, for every class → subject → chapter of Classes 8, 9
and 10 (the same steps work for Classes 6 and 7 too).

The whole flow needs one CSV file and one command:

```
npx tsx scripts/import-content.ts content/my-content.csv
```

A ready-made spreadsheet template with all columns lives at
[`content/content-template.csv`](../content/content-template.csv).

---

## Step 1 — Prepare the PDFs in Google Drive

1. Collect the PDF for each class → subject → chapter. One file per chapter is
   easiest to manage; you can also import several notes per chapter.
2. Upload every PDF into Google Drive (drag-and-drop works).
3. For **each** file, set sharing:
   - Right-click the file → **Share** → under *General access* change
     **Restricted** to **Anyone with the link**, role **Viewer**.
   - Click **Copy link**. The link must look like
     `https://drive.google.com/file/d/<FILE_ID>/view?usp=sharing`.
   - ⚠️ Share **files**, not folders: the portal accepts only `/file/d/<id>`
     links (or `drive.google.com/open?id=<id>`). Google Docs/Sheets links are
     rejected — export those to PDF first (File → Download → PDF).
4. Keep the links; you will paste them into the sheet in Step 3.

The PDF itself stays in your Drive — the portal only stores the link and shows
an embedded preview. If a preview ever says "asking for access", the sharing
setting in Step 3 above was not applied to that file.

## Step 2 — Collect the YouTube links

Your video links live in an Excel sheet. Any column layout works because you
will map them into the template's columns, but for each video you need:

- which class / subject / chapter it belongs to,
- the video title to display,
- the YouTube URL — any shape is accepted:
  `https://www.youtube.com/watch?v=…`, `https://youtu.be/…`,
  `https://www.youtube.com/shorts/…`, or `https://www.youtube.com/embed/…`;
  mobile links (`m.youtube.com`) work too,
- optional: duration in seconds, a slides link (Drive), the author name.

Make sure every video is **public** or **unlisted** on YouTube (private videos
cannot be watched by learners).

## Step 3 — Build the import CSV

1. Open `content/content-template.csv` (or copy it, e.g. to
   `content/class-8-10-materials.csv`).
2. Fill one row per item, using these columns:

   | Column | Required | What goes in it |
   |---|---|---|
   | `class` | ✔ | 8, 9 or 10 |
   | `subject` | ✔ | `science`, `mathematics`, `social-science`, `english`, `hindi`, `arts-vocational` (or the display name, e.g. `Science`) |
   | `chapter` | ✔ | chapter **number** (`1`, `2`, `3`…) **or** the NCERT chapter title (fuzzy match, e.g. `Rational Numbers`) |
   | `type` | ✔ | `video` for YouTube lectures, `note` for Drive PDFs |
   | `title` | ✔ | the title learners see |
   | `url` | ✔ | YouTube link (video) or Drive file link (note) |
   | `duration_sec` | optional | video length in seconds (`742`) |
   | `slides_url` | optional | Drive link to the lecture's slide deck |
   | `slides_title` | optional | label for the slides link (default "Slides") |
   | `author_name` | optional | displayed as "Uploaded by" / note author (default `Faculty`) |
   | `content` | optional | text shown alongside a note PDF |
   | `file_type` | optional | `pdf` (default) or `image` for scanned notes |
   | `verify` | optional | `yes` marks a note **Faculty Verified** from the start |

3. A typical sheet therefore looks like:

   ```csv
   class,subject,chapter,type,title,url,duration_sec,slides_url,slides_title,author_name,content,file_type,verify
   8,science,2,video,Crop Production — overview,https://www.youtube.com/watch?v=XXXXXXXXXXX,742,,,,Ms. Anita Sharma,,,
   8,science,2,note,Crop Production — chapter notes,https://drive.google.com/file/d/XXXXXXXXXXX/view,,,,,Ms. Anita Sharma,Revision summary,pdf,yes
   8,mathematics,1,video,Rational Numbers — lecture 1,https://youtu.be/XXXXXXXXXXX,900,,,,,,,
   ```

Tip: build the whole sheet class-by-class (all of Class 8, then 9, then 10) —
the importer handles any number of rows at once.

## Step 4 — Preview the import (dry run)

From the repository root:

```bash
npx tsx scripts/import-content.ts content/my-content.csv --dry-run
```

This checks every row and prints what **would** be imported, without writing
anything. Fix any reported problems (bad links, wrong chapter numbers, wrong
subject names) and re-run until the dry run is clean. Common errors:

- `no chapter "…" in Class 8 science` — the chapter number/title doesn't match
  the portal's chapter list; open `/class/8/science` on the portal to see the
  exact titles.
- `"url" must be a Google Drive file link…` — the Drive link is a folder or a
  Google Doc, or sharing was not set to *Anyone with the link*.
- `"url" must be a YouTube link…` — the video link is not a YouTube URL.

## Step 5 — Run the import against your database

**Local database** (development / on-premise server):

```bash
npm run db:setup                                  # migrate + demo seed (once)
npx tsx scripts/import-content.ts content/my-content.csv
```

**Hosted database** (production — the same libSQL/Turso URL the deployed
portal uses):

```bash
DATABASE_URL="libsql://your-db.turso.io" \
DATABASE_AUTH_TOKEN="your-token" \
npx tsx scripts/import-content.ts content/my-content.csv
```

The script is **idempotent**: rows whose chapter + link (videos) or chapter +
title (notes) already exist are skipped, so you can re-run the same file, or
add more rows and re-run, without creating duplicates. The same YouTube video
pasted as `watch?v=`, `youtu.be` or `shorts` counts as one video.

Any chapters that do not exist yet in the database are created automatically
from the portal's curriculum (`src/lib/curriculum.ts`), including their
learning-outcome IDs and DIKSHA codes.

## Step 6 — Verify on the portal

1. Open `/class/8/science` (or whichever subject you imported) — chapter cards
   now show the video and note counts.
2. Open a chapter → **Videos** section: YouTube lectures play in the embedded
   player; Drive slide decks download from the link.
3. Open the **Notes** section: Drive PDFs show an inline preview (the
   *Anyone with the link* setting is what makes the preview work).
4. On production, redeploy/restart if you keep a local cache, then spot-check
   a few chapters in each class.

## Step 7 — Keeping content current

- **Add material later**: append rows to the same CSV (or a new one) and
  re-run the import — only the new rows are inserted.
- **Remove/replace a video or note**: currently done from the database
  (`videos` / `notes` tables) — delete the row, or update the URL/title.
- **Curriculum changes**: chapter lists come from `src/lib/curriculum.ts`; if
  NCERT revises a textbook, update that file first, then re-run the import.

## Quick reference

| Task | Command |
|---|---|
| Preview an import | `npx tsx scripts/import-content.ts <file.csv> --dry-run` |
| Import (local DB) | `npx tsx scripts/import-content.ts <file.csv>` |
| Import (hosted DB) | `DATABASE_URL=… DATABASE_AUTH_TOKEN=… npx tsx scripts/import-content.ts <file.csv>` |
| Template | `content/content-template.csv` |

Supported subjects: `science`, `mathematics`, `social-science`, `english`,
`hindi`, `arts-vocational`. Supported classes: 6–10 (this rollout: 8, 9, 10).
