# VidyaSetu — Open Digital Learning & Assessment Portal (SIH Edition)

NCERT-aligned learning portal for Class 7 & 8: faculty-verified lectures,
peer-reviewed notes, PYQ assessments and gamified leaderboards.

## Quick start (login must work)

The sign-in page needs a PostgreSQL database with the schema applied and the
demo accounts seeded. Do this once:

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

## Demo accounts (password: `demo123`)

| Role    | Name         | Email                          |
| ------- | ------------ | ------------------------------ |
| Student | Aarav Patel  | `aarav@student.in`             |
| Faculty | Anita Sharma | `anita.sharma@vidyasetu.gov.in`|

One-click guest access (student / faculty) is also available on the login
panel — no credentials needed.

## Stack

Next.js 16 (App Router) · PostgreSQL · Drizzle ORM · Tailwind CSS 4.
