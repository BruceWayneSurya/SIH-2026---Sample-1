# Bulk content upload — Classes 8, 9 and 10

This is the step-by-step process for loading **all** learning material onto the
portal: chapter-wise **PDFs stored in Google Drive**, **YouTube video links
kept in an Excel sheet**, and **quiz questions** (objective MCQs and
subjective questions), for every class → subject → chapter of Classes 8, 9
and 10 (the same steps work for Classes 6 and 7 too).

The whole flow needs a CSV file per sheet and one command:

```
npx tsx scripts/import-content.ts content/my-content.csv
```

Ready-made spreadsheet templates with all columns live at
[`content/content-template.csv`](../content/content-template.csv) (videos +
notes, Part 1) and
[`content/questions-template.csv`](../content/questions-template.csv)
(quiz questions, Part 2). Rows of every type can also be mixed in one sheet —
each row's `type` column decides what it is.

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
- **Remove/replace a video, note or question**: currently done from the
  database (`videos` / `notes` / `mcq_questions` / `subjective_questions`
  tables) — delete the row, or update the URL/title/text.
- **Curriculum changes**: chapter lists come from `src/lib/curriculum.ts`; if
  NCERT revises a textbook, update that file first, then re-run the import.

---

# Part 2 — Quiz questions (Objective MCQs + Subjective)

Quiz questions also start life in a spreadsheet: **objective MCQs** (the "2 ·
Objective (20 MCQs)" tab of every chapter) and **subjective questions** (the
"3 · Subjective (2/3/5M)" written-practice tab). The same importer command
loads them — Steps 1–2 above (Drive links, YouTube) don't apply here; you only
need this part.

Template: [`content/questions-template.csv`](../content/questions-template.csv).

## Step 8 — Build the questions CSV

Fill one row per question:

| Column | MCQ | Subjective | What goes in it |
|---|---|---|---|
| `class`, `subject`, `chapter` | ✔ | ✔ | same rules as Part 1 (number or NCERT title) |
| `type` | ✔ | ✔ | `mcq` or `subjective` |
| `question` | ✔ | ✔ | the question text, exactly as learners see it |
| `option_a` … `option_d` | ✔ | — | the four choices |
| `answer` | ✔ | — | the correct option — letter (`B`), number (`2`) or the exact option text (`Maize`); all three work |
| `explanation` | recommended | — | shown as the "Why" in the quiz review screen |
| `pyq` | optional | — | previous-year tag, e.g. `CBSE 2023`; empty or `Practice` = a normal practice question |
| `marks` | — | ✔ | `2`, `3` or `5` — short / medium / long answer (the portal groups questions by exactly these) |
| `rubric` | — | optional | marking-scheme steps separated by `;` — each step is worth 1 mark unless it ends with `|2` |
| `model_answer` | — | ✔ | the model answer shown in the marking scheme |

Example rows (from the template):

```csv
class,subject,chapter,type,question,option_a,option_b,option_c,option_d,answer,explanation,pyq,marks,rubric,model_answer
8,science,2,mcq,Which of the following is a kharif crop?,Wheat,Maize,Mustard,Barley,B,"Kharif crops are sown in the rainy season (June–July); maize is a kharif crop.",CBSE 2023,,,
8,science,2,mcq,The process of loosening and turning of the soil is called —,Sowing,Ploughing,Irrigation,Harvesting,Ploughing,Ploughing (tilling) loosens and aerates the soil so roots can breathe and grow deep.,,,,
8,mathematics,1,subjective,Add: (−3/4) + 5/4. Show your steps.,,,,,,,,,2,Find the common denominator|1; Correct answer 2/4 = 1/2|1,"(−3 + 5)/4 = 2/4 = 1/2."
```

Good to know:

- **Sheets can be mixed**: question rows and video/note rows can share one
  sheet (each row has its own `type`) or live in separate sheets — both work
  with the same command.
- **Idempotent**: a question whose chapter + question text already exists is
  skipped, so re-running a file never duplicates; the same question twice in
  one sheet is imported once.
- **Aim for 20 MCQs per chapter** — the portal presents every objective test
  as "20 MCQs" with a 20-minute timer. The importer prints a reminder (`ℹ`)
  for any chapter that lands on a different number.
- If a subjective rubric's steps don't add up to `marks`, the importer prints
  a warning (`⚠`) but imports the question anyway.
- Common errors: `answer must be the option letter (A–D)…` (answer not
  recognised — use the letter, the 1-based number, or the exact option text);
  `marks must be 2, 3 or 5…` (the portal's answer groups only use these);
  `model_answer is required…`.

## Step 9 — Preview and import

Exactly like Step 5:

```bash
npx tsx scripts/import-content.ts content/my-questions.csv --dry-run   # preview
npx tsx scripts/import-content.ts content/my-questions.csv             # apply

# hosted/production database:
DATABASE_URL="libsql://your-db.turso.io" DATABASE_AUTH_TOKEN="your-token" \
npx tsx scripts/import-content.ts content/my-questions.csv
```

## Step 10 — Verify on the portal

1. Open the chapter → **2 · Objective (20 MCQs)** tab: the quiz intro shows
   the question count and PYQ percentage; take the test and check the review
   screen — correct option highlighted and the "Why" explanation below each
   question.
2. Open the **3 · Subjective (2/3/5M)** tab: your questions appear under the
   Short / Medium / Long answer groups; **Marking scheme** shows each rubric
   step with its marks and the model answer.

## Quick reference

| Task | Command |
|---|---|
| Preview an import | `npx tsx scripts/import-content.ts <file.csv> --dry-run` |
| Import (local DB) | `npx tsx scripts/import-content.ts <file.csv>` |
| Import (hosted DB) | `DATABASE_URL=… DATABASE_AUTH_TOKEN=… npx tsx scripts/import-content.ts <file.csv>` |
| Materials template | `content/content-template.csv` |
| Questions template | `content/questions-template.csv` |

Supported row types: `video`, `note`, `mcq`, `subjective`. Supported subjects:
`science`, `mathematics`, `social-science`, `english`, `hindi`,
`arts-vocational`. Supported classes: 6–10 (this rollout: 8, 9, 10).
