import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { client, db, initializeDatabase } from "../src/db";
import { chapters, mcqQuestions, users } from "../src/db/schema";

// The analytics suite exposes one GET payload route and one study-drill
// beacon. These checks walk the real HTTP flow the way the dashboard does.

const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";
const runId = randomUUID();
const email = `analytics-test-${runId}@example.invalid`;
const password = "Test-fixture-only-123!";
let chapterId: number;
let userId: number;
let session = "";

async function call(
  route: string,
  init: { method?: string; body?: unknown; cookie?: string } = {},
) {
  return fetch(`${base}${route}`, {
    method: init.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(init.cookie ? { Cookie: init.cookie } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

before(async () => {
  await initializeDatabase();
  assert.equal((await fetch(`${base}/api/health`)).status, 200);
  const [chapter] = await db
    .insert(chapters)
    .values({
      classNo: 8,
      subjectSlug: "science",
      subjectName: "Science",
      num: 997,
      title: "Analytics API test",
      slug: `analytics-test-${runId}`,
    })
    .returning();
  chapterId = chapter.id;
  await db.insert(mcqQuestions).values([
    { chapterId, qtext: "Question one", options: ["Correct", "Wrong"], correctIndex: 0 },
    { chapterId, qtext: "Question two", options: ["Wrong", "Correct"], correctIndex: 1 },
  ]);
});

after(async () => {
  try {
    if (chapterId) await db.delete(chapters).where(eq(chapters.id, chapterId));
    await db.delete(users).where(eq(users.email, email));
  } finally {
    client.close();
  }
});

describe("learning analytics API", () => {
  it("serves the shared demo guest for anonymous visitors (portal-wide convention)", async () => {
    // Pragyan auto-signs anonymous visitors into a shared demo guest account,
    // so the dashboard payload loads there too — like every other portal page.
    const anonymous = await call("/api/analytics");
    assert.equal(anonymous.status, 200);
    const payload = (await anonymous.json()) as { ok: boolean; today: string };
    assert.equal(payload.ok, true);
    assert.match(payload.today, /^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns the complete dashboard payload in one round-trip", async () => {
    const registration = await call("/api/auth/register", {
      method: "POST",
      body: {
        name: "Analytics Test Student",
        email,
        password,
        role: "student",
        className: "8",
        state: "Andhra Pradesh",
        school: "Test School",
      },
    });
    assert.equal(registration.status, 200, await registration.clone().text());
    const [user] = await db.select().from(users).where(eq(users.email, email));
    userId = user.id;
    const login = await call("/api/auth/login", { method: "POST", body: { email, password } });
    assert.equal(login.status, 200);
    session = login.headers.get("set-cookie")!.split(";")[0];

    const res = await call("/api/analytics", { cookie: session });
    assert.equal(res.status, 200);
    const payload = (await res.json()) as {
      ok: boolean;
      today: string;
      activity: unknown[];
      streaks: Record<string, number>;
      distribution: Record<string, number>;
      radar: { all: Record<string, number>; subjects: Record<string, never> };
      subjectsAvailable: unknown[];
      trend: unknown[];
      percentile: { value: number; cohort: number } | null;
    };
    assert.equal(payload.ok, true);
    assert.match(payload.today, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(Array.isArray(payload.activity));
    assert.ok(typeof payload.streaks.current === "number");
    assert.ok(typeof payload.streaks.longest === "number");
    assert.ok(typeof payload.distribution.quizzes === "number");
    for (const dimension of ["conceptual", "analytical", "retention", "coverage", "consistency"]) {
      assert.ok(typeof payload.radar.all[dimension] === "number", `radar.all.${dimension}`);
    }
    assert.ok(Array.isArray(payload.subjectsAvailable));
    assert.ok(Array.isArray(payload.trend));
    // Percentile is either withheld (small cohort) or a valid 0–100 value —
    // never a rank.
    if (payload.percentile !== null) {
      assert.ok(payload.percentile.value >= 0 && payload.percentile.value <= 100);
      assert.ok(payload.percentile.cohort >= 3);
    }
  });

  it("records a submitted objective test as learning activity", async () => {
    const submit = await call(`/api/objective/${chapterId}/submit`, {
      method: "POST",
      cookie: session,
      body: { answers: [0, 1], durationSec: 300 },
    });
    assert.equal(submit.status, 200);
    const graded = (await submit.json()) as { score: number; total: number };
    assert.equal(graded.score, 2);

    const res = await call("/api/analytics", { cookie: session });
    const payload = (await res.json()) as {
      today: string;
      activity: { d: string; q: number; xp: number }[];
      streaks: { current: number; activeDays: number; totalActivities: number };
      distribution: { quizzes: number };
      radar: { all: { conceptual: number } };
      trend: { avg: number; attempts: number }[];
    };
    const todayEntry = payload.activity.find((a) => a.d === payload.today);
    assert.ok(todayEntry, "today's activity row exists");
    assert.equal(todayEntry.q, 1);
    assert.equal(todayEntry.xp, 20); // 10 XP per correct × 2
    assert.equal(payload.streaks.current, 1);
    assert.equal(payload.streaks.activeDays, 1);
    assert.equal(payload.streaks.totalActivities, 1);
    assert.equal(payload.distribution.quizzes, 1);
    assert.equal(payload.radar.all.conceptual, 100);
    assert.equal(payload.trend.at(-1)?.attempts, 1);
    assert.equal(payload.trend.at(-1)?.avg, 100);
  });

  it("validates the study-drill beacon", async () => {
    const ok = await call("/api/analytics/study", {
      method: "POST",
      cookie: session,
      body: { chapterId, drills: 5, correct: 3 },
    });
    assert.equal(ok.status, 200);
    assert.equal(((await ok.json()) as { ok: boolean }).ok, true);

    const badChapter = await call("/api/analytics/study", {
      method: "POST",
      cookie: session,
      body: { chapterId: 0, drills: 5, correct: 3 },
    });
    assert.equal(badChapter.status, 400);

    const empty = await call("/api/analytics/study", {
      method: "POST",
      cookie: session,
      body: { drills: 0 },
    });
    assert.equal(empty.status, 400);

    // The recorded drill shows up in the payload's retention dimension.
    const res = await call("/api/analytics", { cookie: session });
    const payload = (await res.json()) as {
      streaks: { totalActivities: number };
      radar: { all: { retention: number } };
    };
    assert.equal(payload.streaks.totalActivities, 6); // 1 quiz + 5 drills
    assert.equal(payload.radar.all.retention, 60); // 3 of 5 drills correct
  });
});
