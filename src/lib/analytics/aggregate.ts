import { and, asc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  chapterProgress,
  chapters,
  competencyScores,
  dailyActivity,
  userAnalytics,
  weeklyScores,
  xpEvents,
  users,
} from "@/db/schema";
import { SUBJECTS } from "@/lib/curriculum";
import {
  type ActivityDay,
  type AnalyticsPayload,
  type RadarView,
  type TrendPoint,
  addDaysKey,
  consistencyScore,
  dayKey,
  weekStartKey,
} from "./model";

/**
 * Single round-trip dashboard payload. Reads only pre-aggregated tables
 * (daily_activity, competency_scores, chapter_progress, weekly_scores,
 * user_analytics) — never the raw submission history — so a profile load
 * costs a handful of indexed lookups however long the student has been
 * active.
 */

const YEAR_DAYS = 365;

function subjectName(slug: string): string {
  return SUBJECTS.find((s) => s.slug === slug)?.name ?? slug;
}

export async function getAnalyticsPayload(user: {
  id: number;
  className: number | null;
}): Promise<AnalyticsPayload> {
  const today = dayKey();
  const yearStart = addDaysKey(today, -(YEAR_DAYS - 1));
  const trendStart = weekStartKey(addDaysKey(today, -(7 * 26 - 1)));

  const [dailyRows, cache, competencyRows, trendRows] = await Promise.all([
    db
      .select()
      .from(dailyActivity)
      .where(and(eq(dailyActivity.userId, user.id), gte(dailyActivity.activityDate, yearStart)))
      .orderBy(asc(dailyActivity.activityDate)),
    db.select().from(userAnalytics).where(eq(userAnalytics.userId, user.id)).limit(1),
    db.select().from(competencyScores).where(eq(competencyScores.userId, user.id)),
    db
      .select()
      .from(weeklyScores)
      .where(and(eq(weeklyScores.userId, user.id), gte(weeklyScores.weekStart, trendStart)))
      .orderBy(asc(weeklyScores.weekStart)),
  ]);

  const streakCache = cache[0] ?? null;
  // A streak through yesterday is still "alive" — today just has no activity
  // yet. Only a gap of 2+ days means it broke.
  let currentStreak = streakCache?.currentStreak ?? 0;
  const lastActive = streakCache?.lastActiveDate ?? null;
  if (lastActive) {
    const gap = Math.round(
      (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${lastActive}T00:00:00Z`)) / 86_400_000,
    );
    if (gap >= 2) currentStreak = 0;
  } else {
    currentStreak = 0;
  }

  const activity: ActivityDay[] = dailyRows.map((row) => {
    const subjects = Object.entries(row.subjects ?? {})
      .sort((a, b) => b[1] - a[1])
      .map(([slug]) => slug);
    return {
      d: row.activityDate,
      q: row.quizzes,
      s: row.subjective,
      a: row.aiSessions,
      f: row.drills,
      xp: row.xpEarned,
      subjects,
    };
  });

  const activeDays = activity.length;
  const totalActivities = activity.reduce(
    (sum, day) => sum + day.q + day.s + day.a + day.f,
    0,
  );

  /* ------------------------- competency + coverage ------------------------- */

  const dims = new Map<string, { score: number; dataPoints: number }>();
  for (const row of competencyRows) {
    dims.set(`${row.scope}|${row.dimension}`, {
      score: row.score,
      dataPoints: row.dataPoints,
    });
  }
  const dim = (scope: string, dimension: string) => dims.get(`${scope}|${dimension}`)?.score ?? 0;

  const { overall: coverageAll, perSubject: coverageBySubject } = await coverage(user);

  const consistency = consistencyScore(
    activity.map((day) => day.d),
    today,
  );

  const allView: RadarView = {
    conceptual: dim("all", "conceptual"),
    analytical: dim("all", "analytical"),
    retention: dim("all", "retention"),
    coverage: coverageAll,
    consistency,
  };

  const subjectSlugs = new Set<string>();
  for (const row of competencyRows) if (row.scope !== "all") subjectSlugs.add(row.scope);
  for (const slug of Object.keys(coverageBySubject)) {
    if ((coverageBySubject[slug]?.touched ?? 0) > 0) subjectSlugs.add(slug);
  }

  const radarSubjects: Record<string, RadarView> = {};
  for (const slug of subjectSlugs) {
    radarSubjects[slug] = {
      conceptual: dim(slug, "conceptual"),
      analytical: dim(slug, "analytical"),
      retention: dim(slug, "retention"),
      coverage: coverageBySubject[slug]?.pct ?? 0,
      consistency,
    };
  }

  const subjectsAvailable = [...subjectSlugs]
    .sort((a, b) => a.localeCompare(b))
    .map((slug) => ({ slug, name: subjectName(slug) }));

  /* --------------------------------- trend -------------------------------- */

  const trend: TrendPoint[] = trendRows.map((row) => ({
    week: row.weekStart,
    avg: row.totalSum > 0 ? Math.round((row.correctSum / row.totalSum) * 1000) / 10 : 0,
    attempts: row.attempts,
  }));

  /* ------------------------------ percentile ------------------------------ */

  const percentile = await cohortPercentile(user.id, user.className);

  return {
    ok: true,
    today,
    activity,
    streaks: {
      current: currentStreak,
      longest: streakCache?.longestStreak ?? 0,
      activeDays,
      totalActivities,
    },
    distribution: {
      quizzes: streakCache?.totalQuizzes ?? 0,
      subjective: streakCache?.totalSubjective ?? 0,
      aiSessions: streakCache?.totalAiSessions ?? 0,
      drills: streakCache?.totalDrills ?? 0,
    },
    radar: { all: allView, subjects: radarSubjects },
    subjectsAvailable,
    trend,
    percentile,
  };
}

/** Chapters touched vs chapters available in the student's class. */
async function coverage(user: { id: number; className: number | null }) {
  const perSubject: Record<string, { touched: number; total: number; pct: number }> = {};
  if (user.className === null) return { overall: 0, perSubject };

  const [totals, touched] = await Promise.all([
    db
      .select({ subject: chapters.subjectSlug, n: sql<number>`count(*)` })
      .from(chapters)
      .where(eq(chapters.classNo, user.className))
      .groupBy(chapters.subjectSlug),
    db
      .select({
        subject: chapters.subjectSlug,
        n: sql<number>`count(distinct ${chapterProgress.chapterId})`,
      })
      .from(chapterProgress)
      .innerJoin(chapters, eq(chapterProgress.chapterId, chapters.id))
      .where(and(eq(chapterProgress.userId, user.id), eq(chapters.classNo, user.className)))
      .groupBy(chapters.subjectSlug),
  ]);

  let touchedAll = 0;
  let totalAll = 0;
  for (const row of totals) {
    const hit = Number(touched.find((t) => t.subject === row.subject)?.n ?? 0);
    const total = Number(row.n);
    perSubject[row.subject] = {
      touched: hit,
      total,
      pct: total > 0 ? Math.round((hit / total) * 100) : 0,
    };
    touchedAll += hit;
    totalAll += total;
  }
  return {
    overall: totalAll > 0 ? Math.round((touchedAll / totalAll) * 100) : 0,
    perSubject,
  };
}

/**
 * XP percentile among classmates. The leaderboard-facing number stays on the
 * server; the UI only receives the percentile and cohort size, framed
 * encouragingly — never a rank.
 */
async function cohortPercentile(
  userId: number,
  className: number | null,
): Promise<{ value: number; cohort: number } | null> {
  if (className === null) return null;
  const classmates = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.className, className), eq(users.role, "student")));
  const ids = classmates.map((c) => c.id);
  if (!ids.includes(userId) || ids.length < 3) return null;

  const xpRows = await db
    .select({ userId: xpEvents.userId, xp: sql<number>`coalesce(sum(${xpEvents.amount}), 0)` })
    .from(xpEvents)
    .where(inArray(xpEvents.userId, ids))
    .groupBy(xpEvents.userId);

  const xpById = new Map(xpRows.map((row) => [row.userId, Number(row.xp)]));
  const mine = xpById.get(userId) ?? 0;
  const behind = ids.filter((id) => id !== userId && (xpById.get(id) ?? 0) < mine).length;
  const value = Math.round((behind / (ids.length - 1)) * 100);
  return { value, cohort: ids.length };
}
