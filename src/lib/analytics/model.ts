/**
 * Learning analytics — pure model shared by the server aggregator, the API
 * payload and the client charts. No database or Node-only imports live here
 * so client components can use the types and math without pulling the server
 * bundle (see src/lib/analytics/record.ts and aggregate.ts for the I/O).
 *
 * All day keys are UTC "YYYY-MM-DD" strings. Keeping every layer on UTC keys
 * is what makes the heatmap hydration-safe: the server never formats a date
 * in a local timezone, and the client renders from the same key strings.
 */

/* ------------------------------- dates -------------------------------- */

export function dayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function keyToDate(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

const DAY_MS = 86_400_000;

/** Whole days from key `from` to key `to` (positive when to > from). */
export function diffDays(from: string, to: string): number {
  return Math.round((keyToDate(to).getTime() - keyToDate(from).getTime()) / DAY_MS);
}

export function addDaysKey(key: string, days: number): string {
  return dayKey(new Date(keyToDate(key).getTime() + days * DAY_MS));
}

/** UTC Monday of the week containing `key`. */
export function weekStartKey(key: string): string {
  const d = keyToDate(key);
  const dow = d.getUTCDay(); // 0 = Sunday
  const back = dow === 0 ? 6 : dow - 1;
  return addDaysKey(key, -back);
}

/* ------------------------------ heatmap ------------------------------- */

/** Activity volume of one day — the heatmap's quantization input. */
export function dayVolume(day: { quizzes: number; subjective: number; aiSessions: number; drills: number }): number {
  return day.quizzes + day.subjective + day.aiSessions + day.drills;
}

/**
 * Quantize a day's volume into the 5 visual tiers (0 = inactive … 4 = ultra).
 * Thresholds are stable so a cell's colour means the same thing for every
 * student; the colours themselves come from CSS variables, so light, dark
 * and high-contrast themes restyle the grid without a re-render.
 */
export function heatTier(volume: number): 0 | 1 | 2 | 3 | 4 {
  if (volume <= 0) return 0;
  if (volume < 3) return 1;
  if (volume < 6) return 2;
  if (volume < 10) return 3;
  return 4;
}

export const HEAT_TIERS = [0, 1, 2, 3, 4] as const;

/* ------------------------------- streaks ------------------------------ */

export type StreakState = {
  current: number;
  longest: number;
  lastActiveDate: string | null;
};

/**
 * O(1) streak transition for one new active day. The rule matches the
 * GitHub-style convention: an untouched today does not break a streak that is
 * alive through yesterday; the first activity of a new day extends it.
 */
export function nextStreakState(state: StreakState, activeDay: string): StreakState & { advanced: boolean } {
  if (state.lastActiveDate === activeDay) {
    return { ...state, advanced: false };
  }
  const gap = state.lastActiveDate ? diffDays(state.lastActiveDate, activeDay) : Infinity;
  const current = gap === 1 ? state.current + 1 : 1;
  return {
    current,
    longest: Math.max(state.longest, current),
    lastActiveDate: activeDay,
    advanced: true,
  };
}

/** Streak milestones that award bonus XP, in days → XP. */
export const STREAK_MILESTONES: Record<number, number> = {
  7: 50,
  30: 150,
  100: 400,
  365: 1000,
};

/* ---------------------------- competency ------------------------------ */

export const COMPETENCY_DIMENSIONS = ["conceptual", "analytical", "retention"] as const;
export type CompetencyDimension = (typeof COMPETENCY_DIMENSIONS)[number];

/**
 * Exponential moving average — recent progress weighs more than old results,
 * so a student who improves sees the radar respond within a few sessions.
 * alpha = weight of the newest observation (0 < alpha ≤ 1).
 */
export function emaUpdate(
  previous: { score: number; dataPoints: number },
  observation: number,
  alpha = 0.35,
): { score: number; dataPoints: number } {
  const clamped = Math.max(0, Math.min(100, observation));
  const score =
    previous.dataPoints === 0
      ? clamped
      : alpha * clamped + (1 - alpha) * previous.score;
  return { score: Math.round(score * 10) / 10, dataPoints: previous.dataPoints + 1 };
}

/**
 * Consistency score (0–100): regularity of engagement, independent of how
 * much was done. Blends the last 4 weeks (habit) with the last 13 weeks
 * (sustained habit) so a strong month lifts the score quickly while a long
 * history keeps it honest.
 */
export function consistencyScore(activeDayKeys: readonly string[], today: string): number {
  const active = new Set(activeDayKeys);
  const recent = Math.min(28, diffDays(addDaysKey(today, -27), today) + 1);
  const activeRecent = countActive(active, today, 28);
  const activeLonger = countActive(active, today, 91);
  const longerWindow = Math.min(91, diffDays(addDaysKey(today, -90), today) + 1);
  const ratioRecent = activeRecent / recent;
  const ratioLonger = activeLonger / longerWindow;
  return Math.round((0.6 * ratioRecent + 0.4 * ratioLonger) * 100);
}

function countActive(active: ReadonlySet<string>, today: string, windowDays: number): number {
  let n = 0;
  for (let i = 0; i < windowDays; i++) if (active.has(addDaysKey(today, -i))) n++;
  return n;
}

/* ----------------------------- percentile ----------------------------- */

/**
 * Percentile framing that motivates instead of ranking: the UI never shows
 * "you are 47th of 60". Bands choose the message; the raw value is still
 * available for the bar position.
 */
export function percentileBand(percentile: number): "top-quarter" | "upper-half" | "building" {
  if (percentile >= 75) return "top-quarter";
  if (percentile >= 50) return "upper-half";
  return "building";
}

/* ------------------------------ payload ------------------------------- */

/** Sparse activity for one UTC day, as shipped to the client. */
export type ActivityDay = {
  /** UTC day key YYYY-MM-DD. */
  d: string;
  q: number; // objective tests
  s: number; // subjective sets
  a: number; // AI sessions
  f: number; // recall drills answered
  xp: number;
  /** subject slugs practiced that day, most-first */
  subjects: string[];
};

export type RadarView = {
  conceptual: number;
  analytical: number;
  retention: number;
  coverage: number;
  consistency: number;
};

export type TrendPoint = { week: string; avg: number; attempts: number };

export type AnalyticsPayload = {
  ok: true;
  /** Server UTC day the payload was built for — the client aligns the grid to it. */
  today: string;
  activity: ActivityDay[];
  streaks: {
    current: number;
    longest: number;
    /** Active days in the rolling year shown by the heatmap. */
    activeDays: number;
    /** Practice sessions in the rolling year. */
    totalActivities: number;
  };
  /** Lifetime activity mix for the distribution donut. */
  distribution: {
    quizzes: number;
    subjective: number;
    aiSessions: number;
    drills: number;
  };
  radar: {
    all: RadarView;
    subjects: Record<string, RadarView>;
  };
  /** Subjects the student has data for, with display names, for the filter. */
  subjectsAvailable: { slug: string; name: string }[];
  trend: TrendPoint[];
  /** XP percentile within the class cohort; null when the cohort is too small. */
  percentile: { value: number; cohort: number } | null;
};
