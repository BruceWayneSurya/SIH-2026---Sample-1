# Pragyan (प्रज्ञान) — National Digital Learning Portal

An NCERT-aligned learning and assessment portal for **Class 6 to 10**: faculty
videos, moderated community notes, objective and subjective assessments,
leaderboards and AI study tools — presented as a Government of India service of
the Department of School Education & Literacy, Ministry of Education.

The welcome page, sign-in/register screens, demo personas, theme toggle,
floating AI assistant and chapter tools follow the supplied
[Pragyan reference](https://pragyan-sih-2026.vercel.app/). The existing text/Drive
PDF upload, embedded preview and concurrent voting fixes are retained.

## Portal shell, faculty verification and class coverage

**Government-portal dashboard.** The portal chrome carries the official
identification strip (Government of India · Ministry of Education · Department
of School Education & Literacy), a toll-free helpline, a "Skip to main content"
link and a footer with content ownership, helpdesk details, policy links and a
review date. The dashboard itself shows the learner's or teacher's standing, a
circulars and announcements board, a Class 6–10 browser, the NCERT subject grid
with progress, available assessments and recent XP activity. Hackathon
branding ("SIH Edition", evaluator quick-access wording, team credits) is gone
from the portal, the login screen, the landing page and the page metadata;
`/about` publishes the policies, accessibility statement and the faculty
verification policy.

**Faculty email verification.** A teacher signs in or registers with their
email ID and proves the mailbox with a six-digit one-time code
(`src/lib/otp.ts`, `src/lib/faculty-verification.ts`):

| Step | Behaviour |
| --- | --- |
| Sign in / register | Password checked first; no session is issued until the mailbox is proven |
| Code | CSPRNG six digits, stored only as an HMAC digest, valid 10 minutes, 5 attempts |
| Resend | Throttled to one per 60 s and five per rolling hour |
| Challenge token | Signed and bound to the address, so a code cannot be replayed on another challenge |
| Institutional address (…gov.in / …nic.in / …edu.in / …ac.in / listed bodies) | Verified on confirmation — may verify community notes and confirm pending teachers |
| Personal address (Gmail and similar) | Mailbox confirmed, account stays `pending_review` until a verified reviewer confirms the institution |

Mail is sent through `MAIL_PROVIDER=smtp` (raw client, STARTTLS aware — works
with a Gmail app password on 465/587), `MAIL_PROVIDER=resend` (single HTTPS
call), or the default console provider, which logs the message and returns the
code to the browser as `devCode` outside production so a local demo needs no
credentials. `FACULTY_PERSONAL_EMAIL_POLICY=review|block|allow` controls how
personal mailboxes are treated. Unverified or pending faculty cannot verify
notes (`/api/notes/[id]/verify` returns 403 with an explanatory message), and a
verified reviewer works through the pending list on the dashboard
(`/api/faculty/review`).

**Class 6 to 10.** `CLASSES` in `src/lib/curriculum.ts` drives registration,
routing, the leaderboard tabs, the dashboard class browser and the demo seed.
Chapter titles follow the NCERT textbooks in circulation for the current
session (Class 6 *Curiosity* and *Ganita Prakash*, Class 9 *Exploration*,
*Ganit* and *Kaveri*, Class 10 *Science*, *Mathematics*, *First Flight* and
क्षितिज भाग 2); re-sync that file when NCERT publishes a revision. Question
banks exist for Class 6 Science ch. 4, Class 9 Mathematics ch. 1 and Class 10
Science/Mathematics ch. 1, and demo learners exist in every class so the
leaderboard is populated.

## Local development — keep your existing .env

Use **Node.js 22**. Keep your `.env`, or copy `.env.example` if you do not have one:

```bash
npm ci
npm run db:setup
npm run dev
```

Open `http://localhost:3000`. A blank/unset `DATABASE_URL` still uses
`./data/app.db`. Absolute paths, relative paths and `file://` URLs also work.
No PostgreSQL server or separate backend is required. Setup is automatic on
local server start and repeatable; existing records are not deleted/reset.

## Vercel deployment

If you see “Vercel requires permanent hosted SQLite storage…” on the deployed
site, follow the step-by-step fix in
[`VERCEL_HOSTED_SQLITE.md`](./VERCEL_HOSTED_SQLITE.md) (create a free Turso
database, validate it with `npm run db:check`, add the environment variables,
redeploy). Short version:

| Variable | Vercel value |
| --- | --- |
| `DATABASE_URL` | Your hosted `libsql://…turso.io` URL — **must not be blank or a file path** |
| `DATABASE_AUTH_TOKEN` | The database access token; server-only |
| `SESSION_SECRET` | Random, ≥ 32 characters; not the example/demo value |
| `GROQ_API_KEY` | Optional, for AI features |

### Why the local version failed on Vercel

The old connection tried to create `data/app.db` inside the deployed project.
Vercel Functions do not provide a shared, permanent writable filesystem.
Copying a database to `/tmp` would only hide the error and would lose or split
accounts, notes, votes and scores across instances.

This version uses **permanent hosted SQLite/libSQL on Vercel**. There is no
in-memory or temporary-file fallback. Public pages build/render without a DB
connection; missing deployment settings produce a setup screen and a JSON 503
from database APIs, rather than a crashing import or an endless refresh loop.

### 1. Create a hosted database

Create a **libSQL-compatible SQLite database in Turso**. Its URL should start
with `libsql://` (an HTTPS libSQL endpoint is also supported). This adapter is
for libSQL; do not select the newer `turso://` engine for this configuration.
Obtain the URL and a database access token from the provider. Keep tokens private.

### 2. Configure the Vercel project

- Framework preset: **Next.js**.
- Root directory: **the repository root**, not `frontend/`, `src/`, or `backend/`.
- Node.js: **22.x**.
- Install command: `npm ci`; build command: `npm run build`.
- Leave the Next.js output-directory setting at its default.
- Deploy the branch containing this fix: **`arena/01a07506-sih-2026-sample-1`**.
  A push to this branch does **not** update a production deployment configured
  to build `main`. Select this branch for the deployment, or merge the fix
  through your normal review process before redeploying your production branch.

Add the following under **Project Settings → Environment Variables** for the
appropriate Production/Preview environment:

| Variable | Vercel value |
| --- | --- |
| `DATABASE_URL` | Your `libsql://…turso.io` database URL; **must not be blank or a file path** |
| `DATABASE_AUTH_TOKEN` | The database access token; server-only |
| `SESSION_SECRET` | A randomly generated secret, at least 32 characters; not the example/demo value |
| `GROQ_API_KEY` | Your Groq key, if you want AI features |
| `GROQ_MODEL` | `openai/gpt-oss-120b`, or your supported Groq model |

`TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are accepted aliases. Explicit
nonblank `DATABASE_URL` / `DATABASE_AUTH_TOKEN` values take precedence.
Use a separate database for preview/testing if you do not want those
instances to modify production data.

Generate a session secret locally, for example:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

**Your local `.env` is intentionally not committed or uploaded to Vercel.**
Setting a variable on your laptop does not configure a Vercel Function.
Never use `NEXT_PUBLIC_` for database tokens, session secrets or Groq keys.

### 3. Redeploy and check

Redeploy after saving the environment variables. On the first database request,
the app applies `drizzle/sqlite/` migrations and seeds an empty database safely.
Batched inserts keep hosted initialization short; subsequent starts preserve
data and only add missing guest accounts. Migrations are included in the
function bundle. The hosted HTTP driver never loads native SQLite bindings,
changes remote journal pragmas, or writes a local replica.

For an operator-controlled initialization, run `npm run db:setup` with the
**hosted** URL/token configured in your local server environment before deployment.
For future schema changes, run migrations as one coordinated deployment step
rather than making concurrent deployments migrate the same database.

Check `https://YOUR-DEPLOYMENT/api/health`. A working hosted deployment returns:

```json
{"ok":true,"storage":"remote-sqlite","persistent":true}
```

Then test guest/sign-in access, publish a text + Drive PDF note, vote, and reload
from another session. Shared state lives in the hosted database, not a Vercel
instance. If health returns 503, read its sanitized configuration message and
check the project environment scope, database URL/token and session secret.

### Existing data and backups

Connecting a new hosted database does not automatically upload `data/app.db`
or merge an old PostgreSQL database. Back up existing data first and use your
provider's supported SQLite import/export procedure if you want to move it.
The initial migration can adopt a compatible existing SQLite schema without
resetting records. Incompatible schemas need a separate migration.

For self-hosting with local SQLite, use a persistent writable disk and SQLite's
backup mechanism (or stop the app before copying the DB and WAL files).

References: [Vercel local-storage limitation](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel),
[Turso TypeScript/libSQL connection guide](https://docs.turso.tech/sdk/ts/quickstart#remote-libsql-database-@libsql/client).

## Interface language

Use the language dropdown beside the light/dark-mode switch. **English is the
default**, with **Telugu (తెలుగు), Hindi (हिन्दी), Tamil (தமிழ்), Kannada (ಕನ್ನಡ),
and Malayalam (മലയാളം)** available. The same controls appear on the welcome,
portal, and sign-in/register pages.

The browser remembers the choice in `pragyan_language`, including after reloads
and navigation, and synchronizes it across tabs. If browser storage is blocked,
it still works for the current tab. Switching updates navigation, key page copy,
form labels, and study controls without reloading or clearing drafts/answers.
English is the fallback for untranslated text. Script fonts are self-hosted;
interface translations do not require a Groq key or an external translation
widget.

New AI chat, notes, and practice-quiz requests include the selected language.
The server validates it against the six-language allowlist. Existing user notes,
PDFs/videos, textbook material, and the stored assessment questions remain in
their original language; their contents and saved answers are never rewritten.
Translation dictionaries are in `src/lib/i18n/messages.ts`.

## Notes and embedded Drive previews

Open a chapter → **Community Notes & Handouts → Contribute notes**:

1. Add a title and text, a Google Drive PDF link, or both.
2. For a PDF, set Drive sharing to **Anyone with the link → Viewer**.
3. Paste the file link in **PDF document · Google Drive**.
4. Select **Preview PDF before publishing**, then publish.

Saved PDFs render **inside the website** with show/hide controls and an external
Drive fallback. File `/view`, `/open?id=…` and `/uc?id=…` URLs are normalized to
`/preview`; access resource keys are preserved. Only validated HTTPS Drive file
URLs are embedded. The app stores the link, not a copy of the document.

Google controls file existence, permissions and embedding. A private, deleted
or organization-restricted file can show an access screen. The app cannot bypass
that or guarantee a file's MIME type. Contributors must share an actual PDF.

**On Vercel, use Drive links:** writing to `public/uploads` is disabled, with a
clear UI/API explanation, because those files would not persist. Local installs
still allow PDF/image attachments up to 8 MB. Existing local attachments are not
automatically uploaded when moving to Vercel.

Each account has one saved vote per note. Desired-state requests are idempotent,
ranking updates immediately, and write transactions keep the +50 XP milestone
at ten votes one-time. Guest Student/Faculty are shared demo identities; sign in
with separate accounts for separate votes and progress.

## AI features

- **Ask Pragyan AI**: a floating, keyboard-accessible chat on every page.
- **AI Tutor** tab: chapter-scoped conversation.
- **AI Quiz Generator**: 3/5/7/10 original practice questions on the objective tab,
  answer checking and explanations. Generated questions are **not official PYQs**
  and do not award XP or change the stored assessment bank.
- **AI Study Notes**: summary, key points or a simpler explanation in the learning tab.

Browser requests go to same-origin `POST /api/ai/chat` or `/api/ai/study`.
Only the server calls Groq. The configured model is passed unchanged; a blank
model defaults to `llama-3.3-70b-versatile`. Missing/masked keys return a clear
503 without breaking notes, quizzes or previews. No document is sent to Groq
by the PDF preview feature. Conversations are not automatically saved.

Requests have bounded input, a 30-second provider timeout, validated quiz output,
sanitized errors and a **best-effort per-instance** 10-request/minute/account
limit shared across AI endpoints. For a public deployment, also configure
provider spending limits and distributed/gateway rate limiting; an in-process
map does not enforce a global limit across Vercel instances.

Faculty email verification proves mailbox ownership and institutional domain,
but it is not a school identity service: there is no UID/Aadhaar or state
roster check behind it, and the demo build ships public guest and faculty
personas. Harden account provisioning and moderation before use with real
student records. AI can make mistakes; confirm important answers against NCERT
or a teacher, and do not enter private personal information.

## Checks and database commands

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run test:integration  # running local test app required

npm run db:setup         # migrate + seed, non-destructive
npm run db:migrate
npm run db:seed
npm run db:generate
npm run db:push          # development only; review schema changes
```

Integration tests create/delete uniquely named fixtures. Run them against a
local test database using the same file and SESSION_SECRET as the running app,
not against a production deployment. `TEST_BASE_URL` defaults to
`http://127.0.0.1:3000`. Groq and hosted-driver unit tests mock transport: they do
not need real keys, spend credits, or claim to validate a live cloud database.

`tests/faculty-verification.integration.ts` walks the real HTTP flow: a personal
mailbox is held at pending review and its challenge survives the resend cooldown,
note moderation stays locked (403) until a verified reviewer approves the
institution and then unlocks (200) on the same cookie, an institutional mailbox
reaches verified immediately, students are never challenged, and forged or unknown
challenge ids are refused. It needs the console mail provider (the default when
`MAIL_PROVIDER` is unset) because the one-time code is read from the response;
against a real SMTP or Resend configuration the code-dependent cases skip.

Next.js 16 · React 19 · SQLite/libSQL · Drizzle ORM · Tailwind CSS 4 · Groq.
