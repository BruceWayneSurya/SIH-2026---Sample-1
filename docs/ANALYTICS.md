# Learning Analytics & Performance Intelligence Suite

The `/analytics` page gives every student a LeetCode/GitHub-style view of
their own practice: a year-long activity heatmap, streak metrics, a
five-axis competency radar, an accuracy trajectory, a practice-mix donut and
an encouraging class benchmark. Everything is lightweight inline SVG — no
chart library — so it stays fast on low-power devices and respects
**Data Saver mode** (no transitions or animations when the toggle is on).

## Architecture at a glance

```
learning action                    analytics tables (pre-aggregated)      payload (1 request)
──────────────                     ─────────────────────────────────      ──────────────────
POST /api/objective/…/submit  ─┐
POST /api/subjective/…/submit ─┼─► recordLearningActivity() ─► daily_activity        ─┐
POST /api/ai/chat             ─┤        (one transaction)     user_analytics          │
POST /api/ai/study            ─┤                                 │  competency_scores  ├─► GET /api/analytics
POST /api/analytics/study     ─┘                               ├─► chapter_progress    │     (complete dashboard
(beacon: recall drills)                                        │   weekly_scores       │      in one round-trip)
                                                               └──────────────────────┘
```

Raw submission tables (`mcq_attempts`, `subjective_attempts`) are **never
scanned at render time**. Every learning action funnels through
`recordLearningActivity` (`src/lib/analytics/record.ts`), which maintains the
aggregates in a single transaction:

1. **`daily_activity`** — one row per `(user, UTC day)` with the day's quiz,
   subjective, AI-session and drill counts, XP, estimated minutes and a
   `{subject: count}` map for the heatmap tooltip.
2. **`user_analytics`** — the streak cache: current/longest streak,
   last-active day and lifetime totals, updated in O(1) per event (no
   multi-day scans). Streak milestones (7/30/100/365 days) award bonus XP as
   `streak_milestone` events — once, on the first event of the milestone day.
3. **`competency_scores`** — exponential moving averages (α = 0.35) per
   dimension and scope, so recent progress visibly moves the radar:
   - *Conceptual Depth* — objective quiz accuracy
   - *Analytical Reasoning* — completed subjective written practice
   - *Revision Retention* — AI recall-drill correctness (beacon)
   - *Curriculum Coverage* — from `chapter_progress` (chapters touched ÷
     chapters in the student's class, overall and per subject)
   - *Consistency* — active-day ratio, blended 28-day habit with a 91-day
     window (computed from the daily rollup, volume-independent)
4. **`weekly_scores`** — weekly objective averages for the 3/6-month accuracy
   trajectory.

Scopes: every dimension is tracked both per subject and holistically
(`scope = "all"`), which is what the radar's subject filter switches between.

## API

- `GET /api/analytics` — auth (or the shared demo guest), returns the
  complete payload: 365-day sparse activity array, streak statistics,
  lifetime distribution, radar dimensions (all + per subject), weekly trend
  and the class-cohort XP percentile (withheld when the cohort has fewer
  than 3 students; never a rank — the UI frames it encouragingly).
  `Cache-Control: private, max-age=60`.
- `POST /api/analytics/study` — beacon for AI recall drills
  `{chapterId?, drills ≤ 50, correct ≤ drills}`; the client fires it when a
  student checks AI-practice answers.

## Rendering & hydration safety

- The dashboard is a client component that fetches the payload after mount;
  the server always ships the same skeleton, so there is nothing
  timezone-dependent to mismatch.
- All day keys are UTC `YYYY-MM-DD` strings end-to-end; the heatmap grid is
  built on the client from those keys, so server/client timezone offsets can
  never disagree.
- Heatmap tiers are 5 discrete levels (`--heat-0` … `--heat-4` CSS variables
  in `globals.css`) — light, dark and high-contrast themes restyle the grid
  without a re-render.
- Data Saver mode (`[data-saver="1"]`) and `prefers-reduced-motion` disable
  all transitions and loading animations.

## Backfill

```
npm run analytics:backfill        # local DB
DATABASE_URL="libsql://…" DATABASE_AUTH_TOKEN="…" npm run analytics:backfill
```

Clears the analytics tables and replays every historical objective and
subjective submission through the exact same `recordLearningActivity`
pipeline (milestone XP is not re-awarded), so backfilled state matches what
organic events produce. `npm run db:setup` runs it automatically after
seeding. AI sessions and drills have no historical record and start at zero.

## Tests

- `tests/analytics.test.ts` — pure model (UTC date math, tier quantization,
  O(1) streak machine, EMA, consistency, percentile framing) plus the
  recorder and payload against a throwaway SQLite database.
- `tests/analytics-api.integration.ts` — the real HTTP flow: guest payload,
  register → login → payload, objective submission reflected in the
  analytics, and beacon validation.
