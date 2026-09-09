# Fixing “Vercel requires permanent hosted SQLite storage” on the Pragyan portal

This portal stores accounts, notes, votes, quiz scores and leaderboard rows in
**SQLite**. Locally that is a plain file (`./data/app.db`), but a Vercel
deployment is a set of serverless functions that share **no persistent
filesystem** — a file written by one function invocation can vanish or be
invisible to the next. The app therefore refuses to run on Vercel against a
local file or `/tmp`, and instead shows the message:

> Vercel requires permanent hosted SQLite storage. Set `DATABASE_URL` to your
> `libsql://` database URL and `DATABASE_AUTH_TOKEN` in Vercel Environment
> Variables, then redeploy. Local files and /tmp are not shared storage.

This is a **configuration step, not an application bug**: the portal needs to
be pointed at a permanent hosted SQLite database (libSQL) that all Vercel
functions can reach over HTTPS. Setting it up takes about 10 minutes, free.

The guard that produces this message lives in `src/db/config.ts`
(`resolveDatabaseConfig`). `/api/health` returns a sanitised version of the
same message when the database is not configured.

---

## Step 1 — Create a free hosted SQLite database (Turso)

Turso hosts libSQL (SQLite over HTTPS) and has a free tier that is plenty for
this portal. Sign up at <https://turso.tech> or use the CLI:

```bash
# Install the Turso CLI (macOS/Linux/WSL; see https://docs.turso.tech/cli)
brew install tursodatabase/tap/turso        # macOS
curl -sSfL https://get.turso.tech/install.sh | bash   # Linux/WSL

turso auth login          # opens your browser
turso db create pragyan   # creates the database (choose the libSQL engine)
```

Now read out the two values you need:

```bash
turso db show pragyan --url          # prints: libsql://pragyan-<username>.turso.io
turso db tokens create pragyan       # prints a long eyJ… access token
```

Notes:

- The URL must start with `libsql://` (an HTTPS libSQL endpoint also works).
  The portal does **not** support `turso://` URLs from Turso's newer engine,
  so create a classic libSQL database.
- Keep the token secret. Anyone holding it can read/write the database.

## Step 2 — Validate the credentials locally (optional but recommended)

Add both values to your local `.env` (the file is git-ignored; `.env.example`
documents every variable):

```bash
DATABASE_URL=libsql://pragyan-<username>.turso.io
DATABASE_AUTH_TOKEN=eyJ…<the token>
```

Then check that the portal can actually reach the database:

```bash
npm run db:check
```

Expected output: `✓ Hosted SQLite is reachable (…turso.io)`.

Optional, for a warm start: migrate and seed the hosted database now, so the
first visitor on Vercel does not trigger initialisation:

```bash
npm run db:setup        # applies drizzle/sqlite migrations + demo data
```

> Your local `.env` is never uploaded to Vercel. Step 3 must be done in the
> Vercel dashboard (or with `vercel env add`).

## Step 3 — Add the variables in Vercel

In the Vercel dashboard: **Project → Settings → Environment Variables**. Add
each variable for the **Production** and **Preview** environments (Development
is optional). `DATABASE_URL` and `DATABASE_AUTH_TOKEN` are required; the other
values prevent the next configuration errors:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | `libsql://pragyan-<username>.turso.io` — hosted URL, **never** a file path and never blank |
| `DATABASE_AUTH_TOKEN` | The `eyJ…` token from Step 1 (server-side only) |
| `SESSION_SECRET` | Random string ≥ 32 characters — generate with the command below |
| `GROQ_API_KEY` | Your Groq key — optional, enables AI tutor/study tools |
| `GROQ_MODEL` | `openai/gpt-oss-120b` — optional |

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Rules to avoid a second round-trip:

- Do **not** prefix any of these with `NEXT_PUBLIC_` — they must stay
  server-only.
- `SESSION_SECRET` must be long and random; the app rejects placeholders and
  the demo secret with its own message once the database is fixed.
- Keep the same database for Production and Preview (or use a second database
  for Preview if you want isolated test data).

Then **redeploy**: environment-variable changes only take effect on a new
deployment. In **Deployments**, open the latest one and choose **Redeploy**.
Make sure the project builds the branch that contains this code
(`arena/01a086bd-sih-2026-sample-1` or the branch/PR you merged it into) —
deploying `main` deploys the older architecture and a different UI behaviour.

## Step 4 — Verify

Open `https://<your-deployment>/api/health` in a browser. A working hosted
deployment returns:

```json
{"ok":true,"storage":"remote-sqlite","persistent":true}
```

Then test the flow: sign in as guest/demo, publish a note (text or Google
Drive link), vote, and reload from a second browser/incognito window — shared
state now lives in the hosted database, not in one serverless instance.

---

## Troubleshooting

| Message you see | Cause | Fix |
| --- | --- | --- |
| `Vercel requires permanent hosted SQLite storage…` | `DATABASE_URL` is missing on Vercel, or holds a local path such as `./data/app.db` | Set the hosted `libsql://` URL (Steps 1 and 3) and redeploy |
| `Set DATABASE_AUTH_TOKEN…` | Token missing, contains line breaks, or is a placeholder (`replace-…`, `your-…`) | Add the real `eyJ…` token; regenerate with `turso db tokens create pragyan` |
| `Set a valid hosted SQLite URL…` | `DATABASE_URL` is malformed or a `turso://` engine URL | Use the `libsql://` URL from `turso db show pragyan --url` |
| `Use the hosted SQLite database URL without credentials…` | URL contains a username/password, query string, hash or path | Store only the URL; put the token in `DATABASE_AUTH_TOKEN` |
| `Set SESSION_SECRET to a long random value…` | Secret missing/short/placeholder | Set a ≥ 32-character random secret and redeploy |
| Health/API keeps returning 401/403 from the provider | Token is invalid, read-only, or for a different database | `turso db tokens create pragyan` and update the variable |
| Error still shows after saving variables | Environment scope or deployment is stale; variables added to Production only, or deployment not re-run | Add vars for Production **and** Preview; open the latest deployment → **Redeploy** |

### What not to do

- Do not set `DATABASE_URL` to `./data/app.db`, `/tmp/…`, or `file:` on Vercel —
  Vercel functions have no shared permanent disk, so that data would be lost
  or split across instances. This exact error is the app protecting you from
  that.
- Do not paste tokens into client components or `NEXT_PUBLIC_` variables.
- Do not commit `.env` or any real token — `.gitignore` already excludes `.env*`.
