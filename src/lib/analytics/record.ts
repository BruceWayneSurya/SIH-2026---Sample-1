import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  chapterProgress,
  chapters,
  competencyScores,
  dailyActivity,
  userAnalytics,
  weeklyScores,
  xpEvents,
} from "@/db/schema";
import {
  COMPETENCY_DIMENSIONS,
  type CompetencyDimension,
  addDaysKey,
  dayKey,
  emaUpdate,
  nextStreakState,
  STREAK_MILESTONES,
  weekStartKey,
} from "./model";

/**
 * Event-driven activity aggregation. Every learning action funnels through
 * `recordLearningActivity`, which maintains the pre-aggregated analytics
 * tables in one transaction:
 *
 *   1. upserts the (user, UTC day) daily-activity row,
 *   2. advances the O(1) streak cache and awards milestone XP,
 *   3. updates competency scores as exponential moving averages,
 *   4. records chapter progress (curriculum coverage) and the weekly score
 *      rollup used by the accuracy trajectory.
 *
 * Raw submission tables are never scanned at render time — the dashboard
 * reads only these aggregates.
 */

export type LearningActivityInput = {
  userId: number;
  /** Chapter the activity belongs to (drives subject attribution + coverage). */
  chapterId?: number | null;
  /** Objective tests submitted. */
  quizzes?: number;
  /** Subjective written sets submitted. */
  subjective?: number;
  /** AI tutor conversations / study generations. */
  aiSessions?: number;
  /** AI recall-drill questions answered. */
  drills?: number;
  /** Drill questions answered correctly. */
  drillsCorrect?: number;
  /** XP this activity grants (already-awarded XP, recorded for the day). */
  xp?: number;
  /** Estimated focused minutes. */
  minutes?: number;
  /** Objective accuracy 0–1 (score / total) — feeds the conceptual EMA. */
  scoreRatio?: number;
  /** Override for tests / backfills; defaults to now (UTC). */
  at?: Date;
  /** Backfills pass false to replay history without re-awarding milestone XP. */
  awardMilestones?: boolean;
};

/** Best-effort wrapper for call sites where analytics must never fail the request. */
export async function recordLearningActivityBestEffort(input: LearningActivityInput): Promise<void> {
  try {
    await recordLearningActivity(input);
  } catch (error) {
    console.warn("[analytics] failed to record activity:", error instanceof Error ? error.message : error);
  }
}

export async function recordLearningActivity(input: LearningActivityInput): Promise<void> {
  const userId = input.userId;
  if (!Number.isSafeInteger(userId) || userId < 1) throw new Error("Invalid user id.");
  const at = input.at ?? new Date();
  const today = dayKey(at);

  const quizzes = Math.max(0, Math.round(input.quizzes ?? 0));
  const subjective = Math.max(0, Math.round(input.subjective ?? 0));
  const aiSessions = Math.max(0, Math.round(input.aiSessions ?? 0));
  const drills = Math.max(0, Math.round(input.drills ?? 0));
  const drillsCorrect = Math.min(drills, Math.max(0, Math.round(input.drillsCorrect ?? 0)));
  const xp = Math.max(0, Math.round(input.xp ?? 0));
  const minutes = Math.max(0, Math.round(input.minutes ?? 0));
  if (quizzes + subjective + aiSessions + drills === 0 && xp === 0) return;

  // Resolve the chapter's subject once (null chapterId → unattributed).
  let subjectSlug: string | null = null;
  if (input.chapterId) {
    const [chapter] = await db
      .select({ subjectSlug: chapters.subjectSlug })
      .from(chapters)
      .where(eq(chapters.id, input.chapterId))
      .limit(1);
    subjectSlug = chapter?.subjectSlug ?? null;
  }

  const subjectWeight = quizzes + subjective + aiSessions + drills;

  await db.transaction(async (tx) => {
    // 1. Daily activity row — increment counts, merge the subject map.
    const [existingDay] = await tx
      .select()
      .from(dailyActivity)
      .where(and(eq(dailyActivity.userId, userId), eq(dailyActivity.activityDate, today)))
      .limit(1);

    const previousSubjects = existingDay?.subjects ?? {};
    const subjects = { ...previousSubjects };
    if (subjectSlug && subjectWeight > 0) {
      subjects[subjectSlug] = (subjects[subjectSlug] ?? 0) + subjectWeight;
    }

    if (existingDay) {
      await tx
        .update(dailyActivity)
        .set({
          quizzes: sql`${dailyActivity.quizzes} + ${quizzes}`,
          subjective: sql`${dailyActivity.subjective} + ${subjective}`,
          aiSessions: sql`${dailyActivity.aiSessions} + ${aiSessions}`,
          drills: sql`${dailyActivity.drills} + ${drills}`,
          drillsCorrect: sql`${dailyActivity.drillsCorrect} + ${drillsCorrect}`,
          xpEarned: sql`${dailyActivity.xpEarned} + ${xp}`,
          minutesSpent: sql`${dailyActivity.minutesSpent} + ${minutes}`,
          subjects,
        })
        .where(and(eq(dailyActivity.userId, userId), eq(dailyActivity.activityDate, today)));
    } else {
      await tx.insert(dailyActivity).values({
        userId,
        activityDate: today,
        quizzes,
        subjective,
        aiSessions,
        drills,
        drillsCorrect,
        xpEarned: xp,
        minutesSpent: minutes,
        subjects,
      });
    }

    // 2. Streak cache — O(1) per event, plus milestone XP awards.
    const [cache] = await tx
      .select()
      .from(userAnalytics)
      .where(eq(userAnalytics.userId, userId))
      .limit(1);

    const previous = {
      current: cache?.currentStreak ?? 0,
      longest: cache?.longestStreak ?? 0,
      lastActiveDate: cache?.lastActiveDate ?? null,
    };
    const next = nextStreakState(previous, today);
    const milestoneXp =
      next.advanced && (input.awardMilestones ?? true)
        ? STREAK_MILESTONES[next.current] ?? 0
        : 0;

    if (cache) {
      await tx
        .update(userAnalytics)
        .set({
          currentStreak: next.current,
          longestStreak: next.longest,
          lastActiveDate: next.lastActiveDate,
          totalActiveDays: next.advanced ? sql`${userAnalytics.totalActiveDays} + 1` : sql`${userAnalytics.totalActiveDays}`,
          totalQuizzes: sql`${userAnalytics.totalQuizzes} + ${quizzes}`,
          totalSubjective: sql`${userAnalytics.totalSubjective} + ${subjective}`,
          totalAiSessions: sql`${userAnalytics.totalAiSessions} + ${aiSessions}`,
          totalDrills: sql`${userAnalytics.totalDrills} + ${drills}`,
          updatedAt: at,
        })
        .where(eq(userAnalytics.userId, userId));
    } else {
      await tx.insert(userAnalytics).values({
        userId,
        currentStreak: next.current,
        longestStreak: next.longest,
        lastActiveDate: next.lastActiveDate,
        totalActiveDays: 1,
        totalQuizzes: quizzes,
        totalSubjective: subjective,
        totalAiSessions: aiSessions,
        totalDrills: drills,
        updatedAt: at,
      });
    }

    if (milestoneXp > 0) {
      await tx.insert(xpEvents).values({
        userId,
        type: "streak_milestone",
        amount: milestoneXp,
        refType: "streak",
        refId: next.current,
        note: `Learning streak · ${next.current} days in a row`,
        createdAt: at,
      });
      await tx
        .update(dailyActivity)
        .set({ xpEarned: sql`${dailyActivity.xpEarned} + ${milestoneXp}` })
        .where(and(eq(dailyActivity.userId, userId), eq(dailyActivity.activityDate, today)));
    }

    // 3. Chapter progress → curriculum coverage.
    if (input.chapterId) {
      await tx
        .insert(chapterProgress)
        .values({ userId, chapterId: input.chapterId, firstTouchedAt: at })
        .onConflictDoNothing();
    }

    // 4. Competency EMAs — per-subject scope plus the holistic "all" scope.
    const updates: { scope: string; dimension: CompetencyDimension; observation: number }[] = [];
    if (input.scoreRatio !== undefined && quizzes > 0) {
      const observation = Math.max(0, Math.min(1, input.scoreRatio)) * 100;
      updates.push({ scope: "all", dimension: "conceptual", observation });
      if (subjectSlug) updates.push({ scope: subjectSlug, dimension: "conceptual", observation });
    }
    if (subjective > 0) {
      // Written practice is self-assessed against the rubric; completing a
      // full set is the honest quality signal the portal records.
      updates.push({ scope: "all", dimension: "analytical", observation: 100 });
      if (subjectSlug) updates.push({ scope: subjectSlug, dimension: "analytical", observation: 100 });
    }
    if (drills > 0) {
      const observation = (drillsCorrect / drills) * 100;
      updates.push({ scope: "all", dimension: "retention", observation });
      if (subjectSlug) updates.push({ scope: subjectSlug, dimension: "retention", observation });
    }

    for (const { scope, dimension, observation } of updates) {
      const [row] = await tx
        .select({ score: competencyScores.score, dataPoints: competencyScores.dataPoints })
        .from(competencyScores)
        .where(
          and(
            eq(competencyScores.userId, userId),
            eq(competencyScores.scope, scope),
            eq(competencyScores.dimension, dimension),
          ),
        )
        .limit(1);
      const nextScore = emaUpdate(
        { score: row?.score ?? 0, dataPoints: row?.dataPoints ?? 0 },
        observation,
      );
      if (row) {
        await tx
          .update(competencyScores)
          .set({ score: nextScore.score, dataPoints: nextScore.dataPoints, updatedAt: at })
          .where(
            and(
              eq(competencyScores.userId, userId),
              eq(competencyScores.scope, scope),
              eq(competencyScores.dimension, dimension),
            ),
          );
      } else {
        await tx.insert(competencyScores).values({
          userId,
          scope,
          dimension,
          score: nextScore.score,
          dataPoints: nextScore.dataPoints,
          updatedAt: at,
        });
      }
    }

    // 5. Weekly score rollup → accuracy trajectory. Each quiz attempt
    //    contributes its percentage (correctSum/totalSum = weekly average).
    if (input.scoreRatio !== undefined && quizzes > 0) {
      const week = weekStartKey(today);
      const correct = Math.round(Math.max(0, Math.min(1, input.scoreRatio)) * 100);
      await tx
        .insert(weeklyScores)
        .values({ userId, weekStart: week, attempts: 1, correctSum: correct, totalSum: 100 })
        .onConflictDoUpdate({
          target: [weeklyScores.userId, weeklyScores.weekStart],
          set: {
            attempts: sql`${weeklyScores.attempts} + 1`,
            correctSum: sql`${weeklyScores.correctSum} + ${correct}`,
            totalSum: sql`${weeklyScores.totalSum} + 100`,
          },
        });
    }
  });
}

/** Dimension list re-export for table scanners (backfill). */
export const DIMENSIONS = COMPETENCY_DIMENSIONS;

/** Day key helper re-export for scripts. */
export const analyticsDayKey = dayKey;
export const analyticsAddDaysKey = addDaysKey;
