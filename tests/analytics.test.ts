import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { eq } from "drizzle-orm";

/* ----------------------------- pure model ------------------------------ */

import {
  addDaysKey,
  consistencyScore,
  dayKey,
  diffDays,
  emaUpdate,
  heatTier,
  nextStreakState,
  percentileBand,
  weekStartKey,
} from "../src/lib/analytics/model";

describe("analytics model (pure)", () => {
  it("keeps day keys on UTC and does date arithmetic without timezone drift", () => {
    const key = "2026-09-11";
    assert.equal(dayKey(new Date("2026-09-11T23:30:00Z")), key);
    assert.equal(dayKey(new Date("2026-09-12T00:30:00Z")), "2026-09-12");
    assert.equal(addDaysKey(key, 1), "2026-09-12");
    assert.equal(addDaysKey(key, -1), "2026-09-10");
    assert.equal(addDaysKey("2026-02-28", 1), "2026-03-01");
    assert.equal(diffDays("2026-09-10", "2026-09-17"), 7);
    assert.equal(diffDays("2026-09-17", "2026-09-10"), -7);
    // Mondays, regardless of year layout.
    for (const day of ["2026-09-07", "2026-09-14", "2026-12-28", "2027-01-04"]) {
      assert.equal(weekStartKey(day), day, `${day} is a Monday`);
    }
    assert.equal(weekStartKey("2026-09-11"), "2026-09-07"); // Friday → its Monday
    assert.equal(weekStartKey("2026-09-13"), "2026-09-07"); // Sunday → its Monday
  });

  it("quantizes daily volume into five heatmap tiers", () => {
    assert.equal(heatTier(0), 0);
    assert.equal(heatTier(1), 1);
    assert.equal(heatTier(2), 1);
    assert.equal(heatTier(3), 2);
    assert.equal(heatTier(5), 2);
    assert.equal(heatTier(6), 3);
    assert.equal(heatTier(9), 3);
    assert.equal(heatTier(10), 4);
    assert.equal(heatTier(40), 4);
  });

  it("advances streaks in O(1): consecutive, same-day, gaps and records", () => {
    const first = nextStreakState({ current: 0, longest: 0, lastActiveDate: null }, "2026-09-01");
    assert.deepEqual(
      { current: first.current, longest: first.longest, advanced: first.advanced },
      { current: 1, longest: 1, advanced: true },
    );

    const second = nextStreakState(
      { current: 1, longest: 1, lastActiveDate: "2026-09-01" },
      "2026-09-02",
    );
    assert.equal(second.current, 2);
    assert.equal(second.advanced, true);

    // Same-day activity never inflates a streak.
    const sameDay = nextStreakState(
      { current: 2, longest: 2, lastActiveDate: "2026-09-02" },
      "2026-09-02",
    );
    assert.equal(sameDay.current, 2);
    assert.equal(sameDay.advanced, false);

    // A one-day miss resets; the record survives.
    const gap = nextStreakState(
      { current: 5, longest: 9, lastActiveDate: "2026-09-05" },
      "2026-09-07",
    );
    assert.equal(gap.current, 1);
    assert.equal(gap.longest, 9);

    // Longest updates when the current run overtakes it.
    const record = nextStreakState(
      { current: 9, longest: 9, lastActiveDate: "2026-09-09" },
      "2026-09-10",
    );
    assert.equal(record.current, 10);
    assert.equal(record.longest, 10);
  });

  it("uses exponential moving averages that favour recent progress", () => {
    const first = emaUpdate({ score: 0, dataPoints: 0 }, 80);
    assert.equal(first.score, 80);
    assert.equal(first.dataPoints, 1);

    const second = emaUpdate(first, 40, 0.5);
    assert.equal(second.score, 60); // 0.5*40 + 0.5*80
    assert.equal(second.dataPoints, 2);

    // Observations clamp to 0–100.
    const clamped = emaUpdate({ score: 50, dataPoints: 3 }, 250, 0.5);
    assert.equal(clamped.score, 75); // 0.5*100 + 0.5*50
  });

  it("scores consistency from engagement regularity, not volume", () => {
    const today = "2026-09-10";
    // Active every day for the whole long window → perfect consistency.
    const everyDay = Array.from({ length: 91 }, (_, i) => addDaysKey(today, -i));
    assert.equal(consistencyScore(everyDay, today), 100);
    assert.equal(consistencyScore([], today), 0);
    // A strong recent month with an empty history before it blends the
    // 28-day habit (100%) with the 91-day window (~31%) → 72.
    const recentMonth = Array.from({ length: 28 }, (_, i) => addDaysKey(today, -i));
    assert.equal(consistencyScore(recentMonth, today), 72);
    // One active day recently ≈ a small but non-zero score.
    const sparse = consistencyScore([addDaysKey(today, -1)], today);
    assert.ok(sparse > 0 && sparse <= 5, `unexpected sparse score ${sparse}`);
  });

  it("frames percentiles encouragingly", () => {
    assert.equal(percentileBand(100), "top-quarter");
    assert.equal(percentileBand(75), "top-quarter");
    assert.equal(percentileBand(74), "upper-half");
    assert.equal(percentileBand(50), "upper-half");
    assert.equal(percentileBand(49), "building");
    assert.equal(percentileBand(0), "building");
  });
});

/* -------------------------- recorder + payload -------------------------- */

let directory: string;
let db: typeof import("../src/db").db;
let client: typeof import("../src/db").client;
let recordLearningActivity: typeof import("../src/lib/analytics/record").recordLearningActivity;
let getAnalyticsPayload: typeof import("../src/lib/analytics/aggregate").getAnalyticsPayload;

before(async () => {
  await mkdir(".cache", { recursive: true });
  directory = await mkdtemp(path.resolve(".cache", "analytics-tests-"));
  // Point the app's database singleton at a throwaway file BEFORE import.
  process.env.DATABASE_URL = `file:${path.join(directory, "test.db")}`;
  const database = await import("../src/db");
  db = database.db;
  client = database.client;
  const { migrateDatabase } = await import("../src/db/migrate");
  await migrateDatabase();
  ({ recordLearningActivity } = await import("../src/lib/analytics/record"));
  ({ getAnalyticsPayload } = await import("../src/lib/analytics/aggregate"));
});

after(async () => {
  if (client) client.close();
  if (directory) await rm(directory, { recursive: true, force: true });
});

const day = (offsetDays: number) => new Date(Date.now() + offsetDays * 86_400_000);

async function addUser(handle: string, className: number | null = 8) {
  const { users } = await import("../src/db/schema");
  const [user] = await db
    .insert(users)
    .values({ handle, email: `${handle}@example.invalid`, name: handle, passwordHash: "x", className })
    .returning();
  return user;
}

describe("event-driven analytics recording", () => {
  it("aggregates a quiz submission into every rollup table", async () => {
    const { chapters, dailyActivity, userAnalytics, competencyScores, chapterProgress, weeklyScores } =
      await import("../src/db/schema");
    const student = await addUser("ana-one");
    const [chapter] = await db
      .insert(chapters)
      .values({ classNo: 8, subjectSlug: "science", subjectName: "Science", num: 1, title: "Test chapter", slug: "ana-test-1" })
      .returning();

    await recordLearningActivity({
      userId: student.id,
      chapterId: chapter.id,
      quizzes: 1,
      xp: 16,
      minutes: 12,
      scoreRatio: 0.8,
      at: day(0),
    });

    const daily = await db.select().from(dailyActivity).where(eq(dailyActivity.userId, student.id));
    assert.equal(daily.length, 1);
    assert.equal(daily[0].quizzes, 1);
    assert.equal(daily[0].xpEarned, 16);
    assert.equal(daily[0].minutesSpent, 12);
    assert.deepEqual(daily[0].subjects, { science: 1 });

    const [cache] = await db.select().from(userAnalytics).where(eq(userAnalytics.userId, student.id));
    assert.equal(cache.currentStreak, 1);
    assert.equal(cache.longestStreak, 1);
    assert.equal(cache.totalActiveDays, 1);
    assert.equal(cache.totalQuizzes, 1);

    const competencies = await db.select().from(competencyScores).where(eq(competencyScores.userId, student.id));
    assert.equal(competencies.length, 2); // "all" + "science" scopes
    const allScope = competencies.find((c) => c.scope === "all");
    const scienceScope = competencies.find((c) => c.scope === "science");
    assert.equal(allScope?.dimension, "conceptual");
    assert.equal(allScope?.score, 80);
    assert.equal(allScope?.dataPoints, 1);
    assert.equal(scienceScope?.score, 80);

    const progress = await db.select().from(chapterProgress).where(eq(chapterProgress.userId, student.id));
    assert.equal(progress.length, 1);
    assert.equal(progress[0].chapterId, chapter.id);

    const weeks = await db.select().from(weeklyScores).where(eq(weeklyScores.userId, student.id));
    assert.equal(weeks.length, 1);
    assert.equal(weeks[0].attempts, 1);
    assert.equal(weeks[0].correctSum, 80);
    assert.equal(weeks[0].totalSum, 100);
  });

  it("keeps one daily row per day and never double-counts the streak", async () => {
    const { dailyActivity, userAnalytics } = await import("../src/db/schema");
    const student = await addUser("ana-two");

    for (let i = 0; i < 2; i++) {
      await recordLearningActivity({
        userId: student.id,
        subjective: 1,
        xp: 30,
        at: day(0),
      });
    }

    const daily = await db.select().from(dailyActivity).where(eq(dailyActivity.userId, student.id));
    assert.equal(daily.length, 1);
    assert.equal(daily[0].subjective, 2);
    assert.equal(daily[0].xpEarned, 60);

    const [cache] = await db.select().from(userAnalytics).where(eq(userAnalytics.userId, student.id));
    assert.equal(cache.currentStreak, 1);
    assert.equal(cache.totalActiveDays, 1);
    assert.equal(cache.totalSubjective, 2);
  });

  it("awards streak milestone XP once and honours awardMilestones=false", async () => {
    const { users, xpEvents, userAnalytics } = await import("../src/db/schema");
    const milestoneUser = await addUser("ana-three");
    const replayUser = await addUser("ana-four");

    // Seven consecutive days ending today.
    for (let d = 6; d >= 0; d--) {
      await recordLearningActivity({ userId: milestoneUser.id, drills: 4, drillsCorrect: 3, at: day(-d) });
    }
    const [cache] = await db.select().from(userAnalytics).where(eq(userAnalytics.userId, milestoneUser.id));
    assert.equal(cache.currentStreak, 7);
    assert.equal(cache.longestStreak, 7);
    assert.equal(cache.totalActiveDays, 7);
    assert.equal(cache.totalDrills, 28);

    const milestones = await db.select().from(xpEvents).where(eq(xpEvents.type, "streak_milestone"));
    const mine = milestones.filter((m) => m.userId === milestoneUser.id);
    assert.equal(mine.length, 1);
    assert.equal(mine[0].amount, 50);
    assert.equal(mine[0].refId, 7);

    // A backfill replay of an identical history awards nothing.
    for (let d = 7; d >= 1; d--) {
      await recordLearningActivity({
        userId: replayUser.id,
        drills: 4,
        drillsCorrect: 3,
        at: day(-d),
        awardMilestones: false,
      });
    }
    const replayMilestones = (
      await db.select().from(xpEvents).where(eq(xpEvents.type, "streak_milestone"))
    ).filter((m) => m.userId === replayUser.id);
    assert.equal(replayMilestones.length, 0);
    void users;
  });
});

describe("analytics dashboard payload", () => {
  it("returns the complete dashboard in one call, with yesterday's streak alive", async () => {
    const { users } = await import("../src/db/schema");
    // ana-four practised 7 days ending yesterday — the streak must stay alive.
    const [student] = await db.select().from(users).where(eq(users.handle, "ana-four"));
    const payload = await getAnalyticsPayload({ id: student.id, className: 8 });

    assert.equal(payload.ok, true);
    assert.equal(payload.today, new Date().toISOString().slice(0, 10));
    assert.equal(payload.activity.length, 7);
    assert.equal(payload.streaks.current, 7);
    assert.equal(payload.streaks.longest, 7);
    assert.equal(payload.streaks.activeDays, 7);
    assert.equal(payload.streaks.totalActivities, 28);
    assert.equal(payload.distribution.drills, 28);
    assert.equal(payload.radar.all.retention, 75); // every drill 3/4 correct
    assert.ok(payload.radar.all.consistency > 0);
    // The drills had no chapter → no subject attribution, coverage 0.
    assert.equal(payload.radar.all.coverage, 0);
    assert.ok(Array.isArray(payload.trend));
    assert.deepEqual(payload.subjectsAvailable, []);
    // Only one class-8 student with activity → cohort check uses all class-8
    // students; several exist without XP, so the percentile may be null or
    // small — it must never be a rank.
    if (payload.percentile) {
      assert.ok(payload.percentile.value >= 0 && payload.percentile.value <= 100);
      assert.ok(payload.percentile.cohort >= 3);
    }
  });

  it("computes an encouraging XP percentile across the class cohort", async () => {
    const { users, xpEvents } = await import("../src/db/schema");
    const amounts = [300, 200, 100];
    for (const [i, amount] of amounts.entries()) {
      const student = await addUser(`ana-cohort-${i}`, 9);
      await db.insert(xpEvents).values({ userId: student.id, type: "objective", amount });
    }

    const [middle] = await db.select().from(users).where(eq(users.handle, "ana-cohort-1"));
    const payload = await getAnalyticsPayload({ id: middle.id, className: 9 });
    assert.equal(payload.percentile?.cohort, 3);
    assert.equal(payload.percentile?.value, 50);
  });

  it("reports subject-scoped radar dimensions and coverage", async () => {
    const { chapters, competencyScores } = await import("../src/db/schema");
    const student = await addUser("ana-subject", 8);
    // Two science chapters exist (ana-test-1 + this one); the student touched one.
    const [second] = await db
      .insert(chapters)
      .values({ classNo: 8, subjectSlug: "science", subjectName: "Science", num: 2, title: "Second", slug: "ana-test-2" })
      .returning();
    await db.insert(competencyScores).values([
      { userId: student.id, scope: "science", dimension: "conceptual", score: 72.5, dataPoints: 4 },
    ]);
    await recordLearningActivity({
      userId: student.id,
      chapterId: second.id,
      quizzes: 1,
      scoreRatio: 0.5,
      at: day(0),
    });

    const payload = await getAnalyticsPayload({ id: student.id, className: 8 });
    assert.ok(payload.subjectsAvailable.some((s) => s.slug === "science"));
    const science = payload.radar.subjects.science;
    assert.ok(science);
    // EMA after 72.5 and 50 with alpha 0.35: 0.35*50 + 0.65*72.5 = 64.625 → 64.6
    assert.ok(Math.abs(science.conceptual - 64.6) < 0.01, `got ${science.conceptual}`);
    assert.equal(science.coverage, 50); // 1 of 2 class-8 science chapters touched
    assert.ok(science.consistency > 0);
  });
});
