# VidyaSetu — Open Digital Learning & Assessment Portal (SIH Edition)

NCERT-aligned learning portal for Class 7 & 8: faculty-verified lectures,
peer-reviewed notes, PYQ assessments and gamified leaderboards.

The portal is open access — visitors use a guest student account and land on
the dashboard. There is no login page.

## Quick start

Use Node.js 22 or newer. Keep your existing `.env`, or copy `.env.example`:

```bash
npm install
npm run db:setup
npm run dev          # http://localhost:3000
```

No PostgreSQL installation or server is needed. The app also applies SQLite
migrations and seeds a **fresh, empty** database automatically on server start.
Setup and seeding are repeatable: existing notes, votes, users and assessment
results are preserved, and only missing demo guest accounts are added.

## Environment configuration

All configuration comes from your existing `.env` (Next.js) / `dotenv`
(migration and seed scripts). Do not commit this file or share your real key.

```dotenv
DATABASE_URL=
SESSION_SECRET=replace-with-a-long-random-secret-in-production
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-120b
```

### SQLite

An **empty, whitespace-only or unset `DATABASE_URL`** uses `./data/app.db` in
the project root. The parent directory is created automatically. You can also
use a relative path (`./data/learning.db`), an absolute path, or a `file://`
URL. The app, migration scripts, seed and Drizzle Kit all use the same resolver.
SQLite databases and their journal/WAL files are gitignored.

| Command | What it does |
| --- | --- |
| `npm run db:setup` | Apply migrations, then seed an empty database safely |
| `npm run db:migrate` | Apply migrations from `drizzle/sqlite/` |
| `npm run db:seed` | Ensure schema + demo data; never reset existing records |
| `npm run db:generate` | Generate a SQLite migration from schema edits |
| `npm run db:push` | Push the schema directly (development only; review changes) |

Back up an existing database before upgrading. Historical PostgreSQL migrations
remain in `drizzle/` for reference, but are **not executed** by this version.
This change does not automatically copy data from an old PostgreSQL database.
The initial SQLite migration can adopt compatible existing SQLite tables without
deleting their data. An incompatible pre-existing schema needs a separate
migration; it is not silently overwritten.

For deployment, run the Node.js server with persistent, writable storage for
`data/app.db` (or the path in `DATABASE_URL`). A temporary/serverless filesystem
will not retain a local SQLite database across deployments. Back up the database
using SQLite's backup mechanism, or stop the app before copying the DB and its
WAL files. Use a strong `SESSION_SECRET` outside this demo.

### Groq (server-side only)

Keep your real key in `GROQ_API_KEY`. `GROQ_MODEL` is honored exactly, including
`openai/gpt-oss-120b`; when blank/unset it defaults to `llama-3.3-70b-versatile`.
Do **not** prefix the key with `NEXT_PUBLIC_`. Restart the server after changing
`.env`.

This branch now provides **`POST /api/ai/chat`** for AI requests. Example client
request (no key is sent from the browser):

```js
fetch("/api/ai/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    messages: [{ role: "user", content: "Explain the fire triangle." }],
  }),
});
// Success: { ok: true, reply: "..." }
```

The endpoint validates message sizes/roles, has a 30-second upstream timeout and
a basic 10-requests-per-minute/account demo limit, and never forwards raw provider
errors or credentials. Production deployments should add gateway rate limiting.
No AI chat UI is added by this change. A missing/blank/masked key disables AI
with a clear 503 response; **notes, PDF previews, voting and quizzes still work**.
PDF previews do not use Groq and do not send your documents to an AI provider.

## Community notes and embedded PDF previews

Open **Community Notes & Handouts → Contribute notes** in a chapter. Add a
note title and text, a Google Drive PDF link, or both:

1. Upload the PDF to Google Drive.
2. Set **Share → General access → Anyone with the link → Viewer**.
3. Paste the file-sharing link into **PDF document · Google Drive**.
4. Use **Preview PDF before publishing** to check it inside the form, then publish.

Published PDF notes display an embedded Drive viewer **inside the website**,
with a show/hide control and an **Open PDF in Google Drive** fallback. Standard
`/file/d/…/view`, `/open?id=…` and `/uc?id=…` links are normalized to Drive's
`/preview` URL for embedding; access resource keys are retained.

Only the link is saved, not a copy of the Drive document. Google controls
permissions, file availability and whether embedding is allowed. A private,
removed or organization-restricted file may show an access screen; the portal
cannot bypass this. The contributor must ensure the shared file is a PDF. Local
PDF/image attachments (up to 8 MB) remain an alternative.

The helpful button adds/removes one saved upvote per active account, updates
ranking, and displays errors beside the note. SQLite write transactions preserve
the one-time +50 XP reward at 10 votes; duplicate requests for the same vote state
cannot double-count a vote. As elsewhere in this open demo, visitors without a
signed-in account use the shared Guest Student account.

## Checks

```bash
npm test                  # SQLite, environment, notes, previews and mocked Groq tests
npm run typecheck
npm run build
npm run test:integration  # running app required: notes, concurrent votes and XP
```

Integration tests default to `http://127.0.0.1:3000` and must use the **same
SQLite file and SESSION_SECRET as the app**. Set `TEST_BASE_URL` to override the
address. Use a development/test database: only uniquely named test fixtures are
created and deleted. Groq unit tests use a mock transport and never spend API
credits or require a real key.

## Stack

Next.js 16 (App Router) · SQLite / libSQL · Drizzle ORM · Tailwind CSS 4 · Groq.
