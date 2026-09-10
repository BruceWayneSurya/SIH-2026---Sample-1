# Demo script — the ten capabilities, in the order a judge should see them

Everything below runs on the local SQLite demo database with **no API key**, because
the whole loop is designed to degrade to deterministic, source-grounded behaviour.
Set `GROQ_API_KEY` to switch the same screens from "composed from the chapter's own
indexed passages" to live model generation — no UI changes, no schema changes.

Two accounts, one click each (see `/login`): the demo student sees the learner
surfaces, `ms_anita` sees the teacher surfaces. Locally the password for every
seeded account is `demo123`.

---

## 1 · Concept-mastery map (student → teacher)

**Learner.** `/class/8/science/combustion-and-flame?tab=concept`

The tree is the chapter's NCERT-aligned outcome map with this student's own quiz
answers painted on it: green = secure, amber = developing, red = needs help, grey =
not attempted. Click a node: definition, the outcome statement, and the passage the
outcome is anchored to. *Say:* "the colours are not a gamified score — they are the
outcome-level truth of eleven answered questions, and any grey cell is a question the
learner has not met yet, never a punishment."

**Teacher.** `/teacher?classNo=8&subject=science&chapter=6`

> **31 of 45 students haven't understood ignition temperature.**
> 12 need help · 19 developing · 14 secure

Under it: the most-chosen wrong option ("Its ignition temperature is higher", 16
students), evidence quality ("high — 3 questions in the bank carry this outcome"),
and the reveal button that turns the anonymous class picture into named learners who
need help. That number is not written anywhere in the code: the seeder writes 45
answer sheets, and `src/lib/outcomes/mastery.ts` recounts them. Change a rule and the
headline changes with it.

## 2 · Photo-to-help — a hint, never the answer

`/class/8/science/combustion-and-flame?tab=ai` → camera button.

With a vision key configured the tutor reads the photographed page or handwritten
working and names the *first* thing to look at again, at hint level 1. Without a key
it says so — "I can't read photos on this deployment, so I won't pretend to see your
page" — and hands the learner the textbook line to check instead. Either way the
Socratic ladder is the product: level 1 *notice*, level 2 *the rule*, level 3 *the
next step*. The leak guard strips any sentence that gives away a correct option
before hint level 3, and the response reports `withheld: true` when it does.

## 3 · Genuine offline-first

`/offline` → **Download chapter pack** → open `/offline/offline-app.html`, or press
the download button on any chapter's Learn tab.

The pack (33 KB for Combustion and Flame) carries the notes, the outcome map, the
full 20-question bank with explanations, 31 indexed textbook passages, the concept
sheet and the printable revision sheet — the whole tutorial, not a stub. Turn the
network off (airplane mode, or dev-tools → Offline): the standalone app still opens,
the quiz still marks, XP is queued per attempt. Come back online and press **Sync**;
the server re-scores from the options chosen and credits XP once per `clientId`.
*Say:* "we do not trust the device's score, and we do not double-credit a retry."

Honest limit, stated on screen: the sample lecture MP4 is a CDN file, so it is
**listed but not bundled** — the pack tells you that instead of pretending.

## 4 · Teacher content pipeline — "content coming soon" → a scaling story

`/faculty/studio` (sign in as `ms_anita`).

Paste a page of notes, upload a PDF, or record a five-minute lecture. The pipeline
returns: a transcript, revision notes, **20 MCQs tagged to learning outcomes**, and a
Telugu (or Hindi/Tamil/Kannada/Malayalam) translation for review. The publish button
then does five things at once — faculty-verified note, indexed source chunks, tagged
question bank, draft outcomes where the chapter has none, and an entry in the class
notebook. Coverage is shown bluntly at the top: *7 of 422 chapters have indexed
sources*, because the honest number is part of the pitch.

## 5 · Grounding — every answer carries its page

Ask anything in the tutor and look under the reply: **NCERT p. 62, para 3** — a chip
that opens `/source/9`, the actual paragraph in its chapter context, with the
field-verified note beside it. If retrieval finds nothing strong enough the tutor
declines instead of guessing, and says why. *Say:* "the model never gets to cite
something that is not in the index; the chips are built from retrieval, not from the
model's text."

## 6 · Out-of-syllabus, refused politely

In the same tutor: *"How do I solve a quadratic equation by factorisation?"* in a
Class 8 Science chapter answers:

> Quadratic equations is introduced in Class 10 Mathematics. In Class 8 Science we
> stop before that, so I will not go further than your syllabus.
> Stay with me on this chapter: try "help me understand combustion".

The refusal is decided **before** any model call, by a topic→class map
(`src/lib/tutor/scope.ts`), so it is deterministic, free and impossible to talk
around.

## 7 · Faculty-verified sources outrank classmates

The same question can retrieve four sources; the chips show which is which — NCERT
textbook, **verified note**, class note, worksheet — and retrieval multiplies BM25 by
authority (NCERT 1.0, faculty-verified 0.85, faculty 0.75, peer 0.45, unverified AI
0.3). A peer note with a wrong claim ("a bigger piece of wood has a higher ignition
temperature") is seeded on purpose: it exists, it is quotable, and it still ranks
below the textbook.

## 8 · Auto-generated concept tree

Combustion → Conditions for combustion → Ignition temperature → Fire safety, built
from the outcome map rather than hand-drawn, with each node linking to the page and
to a video timestamp where one exists (`#t=200s`). Overlaying the learner's mastery
colours is the differentiator: a notebook tool can draw this tree, only an assessment
system can colour it.

## 9 · One-page A4 infographic

`/class/8/science/combustion-and-flame?tab=revision` → **Print** (or open
`/api/revision/179` for the standalone SVG). One page, 7 outcomes, traps from the
question bank, definitions anchored to textbook pages. *Say:* "government schools
have printers far more often than tablets — this is the same content, on paper."

## 10 · Class notebooks — one curation, whole class grounded

Learn tab → **Class notebook** (curated by Anita Sharma): the textbook chapter, the
worksheet, the flame-zones video, the exemplar link. Add or remove an item and the
tutor's evidence set changes with it — that is the point: a teacher curates once and
every learner in the class gets the same grounded tutor, with no Google account in
the loop.

---

## What the demo deliberately does **not** claim

- **No key, no invention.** With no `GROQ_API_KEY` the tutor composes from indexed
  passages and labels itself `degraded: true` with the reason on screen. Nothing
  pretends to be model output.
- **The demo corpus is a derived index**, not scanned NCERT PDFs: passages are
  written for this build to demonstrate the pipeline, and each document carries its
  attribution. The production path is exactly the teacher pipeline — upload the
  official e-textbook or the teacher's own PDF and the same chunker indexes it.
- **The sample lecture video is not bundled offline** (see §3).
- **Roster is synthetic.** 45 Class 8 students with deterministic answer sheets; the
  same engine reads real answers in production.

## Five-minute reproduction

```bash
npm ci
npm run db:setup          # migrations + demo data (safe to re-run; never deletes)
npm run dev               # http://localhost:3000
npm run mastery:check -- 8 science 6   # prints the "31 of 45" headline
npm test && npm run test:integration   # 164 unit + 21 integration assertions
```
