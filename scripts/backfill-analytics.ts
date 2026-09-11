/**
 * Rebuild the learning-analytics rollups from raw submission history.
 *
 * Run once when the analytics suite ships (existing students already have
 * attempts — replay them so heatmaps, streaks and competency radars start
 * full instead of empty), and after `npm run db:setup` for demo data:
 *
 *   npm run analytics:backfill
 *
 * Local:    npm run analytics:backfill
 * Hosted:   DATABASE_URL="libsql://…" DATABASE_AUTH_TOKEN="…" npm run analytics:backfill
 *
 * The rebuild is a clean replay: the analytics tables are cleared, then every
 * objective and subjective submission is fed through the exact same
 * `recordLearningActivity` pipeline the live API routes use — so backfilled
 * state always matches what organic events would have produced. Milestone
 * XP is not re-awarded. AI sessions and recall drills have no historical
 * record, so they start at zero and fill as students use the AI tools.
 */
import "dotenv/config";
import { asc, eq } from "drizzle-orm";
import { client, db as database } from "../src/db";
import { publicDatabaseError } from "../src/db/config";
import { migrateDatabase } from "../src/db/migrate";
import {
  chapterProgress,
  competencyScores,
  dailyActivity,
  mcqAttempts,
  subjectiveAttempts,
  userAnalytics,
  users,
  weeklyScores,
} from "../src/db/schema";
import { recordLearningActivity } from "../src/lib/analytics/record";

async function main() {
  await migrateDatabase();

  const allUsers = await database.select({ id: users.id, name: users.name }).from(users);
  console.log(`Rebuilding analytics for ${allUsers.length} user(s)…`);

  // Clean slate — the replay below regenerates everything.
  await database.delete(dailyActivity);
  await database.delete(competencyScores);
  await database.delete(chapterProgress);
  await database.delete(weeklyScores);
  await database.delete(userAnalytics);

  let events = 0;
  for (const user of allUsers) {
    const [quizRows, subjRows] = await Promise.all([
      database
        .select({
          createdAt: mcqAttempts.createdAt,
          chapterId: mcqAttempts.chapterId,
          score: mcqAttempts.score,
          total: mcqAttempts.total,
          durationSec: mcqAttempts.durationSec,
          xpEarned: mcqAttempts.xpEarned,
        })
        .from(mcqAttempts)
        .where(eq(mcqAttempts.userId, user.id))
        .orderBy(asc(mcqAttempts.createdAt), asc(mcqAttempts.id)),
      database
        .select({
          createdAt: subjectiveAttempts.createdAt,
          chapterId: subjectiveAttempts.chapterId,
          xpEarned: subjectiveAttempts.xpEarned,
        })
        .from(subjectiveAttempts)
        .where(eq(subjectiveAttempts.userId, user.id))
        .orderBy(asc(subjectiveAttempts.createdAt), asc(subjectiveAttempts.id)),
    ]);

    type Event =
      | { at: Date; kind: "quiz"; chapterId: number; score: number; total: number; durationSec: number; xp: number }
      | { at: Date; kind: "subjective"; chapterId: number; xp: number };
    const timeline: Event[] = [
      ...quizRows.map((r) => ({
        at: r.createdAt,
        kind: "quiz" as const,
        chapterId: r.chapterId,
        score: r.score,
        total: r.total,
        durationSec: r.durationSec,
        xp: r.xpEarned,
      })),
      ...subjRows.map((r) => ({
        at: r.createdAt,
        kind: "subjective" as const,
        chapterId: r.chapterId,
        xp: r.xpEarned,
      })),
    ].sort((a, b) => a.at.getTime() - b.at.getTime());

    for (const event of timeline) {
      if (event.kind === "quiz") {
        await recordLearningActivity({
          userId: user.id,
          chapterId: event.chapterId,
          quizzes: 1,
          xp: event.xp,
          minutes: Math.max(1, Math.min(30, Math.round(event.durationSec / 60))),
          scoreRatio: event.total > 0 ? event.score / event.total : 0,
          at: event.at,
          awardMilestones: false,
        });
      } else {
        await recordLearningActivity({
          userId: user.id,
          chapterId: event.chapterId,
          subjective: 1,
          xp: event.xp,
          at: event.at,
          awardMilestones: false,
        });
      }
      events++;
    }
  }

  console.log(
    `\n✓ Done. Replayed ${events} historical event(s) through the analytics pipeline.\n` +
      `Open /analytics as any active student to verify, then redeploy/restart so the production database shows it.`,
  );

  // Sanity summary for the operator.
  const days = await database.select({ id: dailyActivity.userId }).from(dailyActivity);
  const streaks = await database.select({ id: userAnalytics.userId }).from(userAnalytics);
  console.log(`  daily-activity rows: ${days.length}, streak caches: ${streaks.length}`);
}

main()
  .catch((error) => {
    console.error("Backfill failed:", publicDatabaseError(error));
    if (process.env.DEBUG) console.error(error);
    process.exitCode = 1;
  })
  .finally(() => client.close());
