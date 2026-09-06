# VidyaSetu — Open Digital Learning & Assessment Portal (SIH Edition)

NCERT-aligned learning portal for Class 7 & 8: faculty-verified lectures,
peer-reviewed notes, PYQ assessments and gamified leaderboards.

The portal is open access — visitors are signed in automatically as a guest
student and land on the dashboard. There is no login page.

## Quick start

```bash
npm install
npm run db:setup     # creates tables (drizzle/migrations) + seeds demo data
npm run dev          # http://localhost:3000
```

`db:setup` runs `db:migrate` (applies `drizzle/*.sql`) and `db:seed`
(populates demo users/content). Other helpers:

| Command             | What it does                                  |
| ------------------- | --------------------------------------------- |
| `npm run db:migrate`| Apply SQL migrations from `drizzle/`           |
| `npm run db:seed`   | Reset & reseed demo data (destructive)        |
| `npm run db:push`   | Push the Drizzle schema directly (dev only)   |
| `npm run db:generate` | Generate a new migration from schema edits |

### Database configuration

Copy `.env.example` to `.env` (or export `DATABASE_URL`). The app falls back
to `postgresql://postgres:postgres@127.0.0.1:5432/app_db` in development when
`DATABASE_URL` is unset, matching `drizzle.config.json` and the seed script.
For production, set both `DATABASE_URL` and a strong `SESSION_SECRET`.

## Community notes

In a chapter's **Community Notes & Handouts → Contribute notes**, provide a
note title and either text, a Google Drive PDF link, or both. For a PDF:

1. Upload the PDF to Google Drive.
2. Set **Share → General access → Anyone with the link → Viewer**.
3. Paste the file-sharing link into **PDF document · Google Drive** and publish.

The portal stores the link, not a copy of the Drive document. Standard
`/file/d/…/view`, `/open?id=…` and `/uc?id=…` links are supported, including
resource keys. The document opens in a new tab; access permissions and the
actual file type remain the contributor's responsibility. Local PDF/image
attachments (up to 8 MB) are still available as an alternative. Existing
notes and attachments need no database migration.

The helpful button adds/removes one saved upvote per active account, updates
ranking, and displays errors beside the note. Repeated requests for the same
vote state cannot double-count a vote. The +50 XP reward for reaching 10 votes
is granted once, transactionally. As elsewhere in this open demo, visitors
without a signed-in account use the shared Guest Student account.

## Checks

```bash
npm test                 # note validation and Drive URL unit tests
npm run typecheck
npm run build
npm run test:integration # notes API, persistence, concurrent votes and XP tests
```

Integration tests require a running app (default `http://127.0.0.1:3000`) and
the same `DATABASE_URL` and `SESSION_SECRET` as that app. Set `TEST_BASE_URL`
to override the address. Run against a development/test database: the tests
create uniquely named fixtures and remove only those fixtures afterward.

## Stack

Next.js 16 (App Router) · PostgreSQL · Drizzle ORM · Tailwind CSS 4.
