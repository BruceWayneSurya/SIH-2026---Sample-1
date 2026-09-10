import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { client, db } from "../src/db";
import { chapters, mcqAttempts, mcqQuestions, users } from "../src/db/schema";
import { classMastery, groupMisconceptions, outcomeHeadline } from "../src/lib/outcomes/mastery";
import { getChapterOutcomes } from "../src/lib/queries-learning";

/**
 * Prints the class mastery view for one chapter, the way the teacher heatmap
 * sees it. Used in CI-style checks and while demoing: it is the same pure engine
 * the dashboard calls.
 *
 *   npm run mastery:check -- 8 science 6
 */
async function main() {
  const [classNo, subject, chapterNum] = process.argv.slice(2);
  if (!classNo || !subject || !chapterNum) {
    console.error("Usage: npm run mastery:check -- <class> <subject> <chapterNum>");
    process.exitCode = 1;
    return;
  }
  const [chapter] = await db
    .select()
    .from(chapters)
    .where(
      and(
        eq(chapters.classNo, Number(classNo)),
        eq(chapters.subjectSlug, subject),
        eq(chapters.num, Number(chapterNum)),
      ),
    )
    .limit(1);
  if (!chapter) {
    console.error("Chapter not found.");
    process.exitCode = 1;
    return;
  }

  const outcomes = await getChapterOutcomes(Number(classNo), subject, Number(chapterNum));
  const questions = await db
    .select()
    .from(mcqQuestions)
    .where(eq(mcqQuestions.chapterId, chapter.id));
  const rosterRows = await db
    .select({ userId: users.id, name: users.name })
    .from(users)
    .where(and(eq(users.className, Number(classNo)), eq(users.role, "student"), eq(users.isGuest, false)));
  const roster = rosterRows.map((row) => ({ userId: row.userId }));
  const attempts = await db
    .select({ userId: mcqAttempts.userId, answers: mcqAttempts.answers })
    .from(mcqAttempts)
    .where(eq(mcqAttempts.chapterId, chapter.id));

  const view = classMastery(roster, questions, attempts, outcomes);
  console.log(`\n${chapter.title} — Class ${classNo} ${subject}`);
  console.log(`roster ${roster.length} · attempted ${view.attemptedStudents}\n`);
  for (const summary of view.outcomes)
    console.log(
      `  ${summary.code} ${summary.concept.padEnd(34)} ` +
        `${summary.needsHelp} need help · ${summary.developing} developing · ${summary.secure} secure ` +
        `(${summary.evidence.length} question${summary.evidence.length === 1 ? "" : "s"})`,
    );
  console.log("\nHeadlines");
  for (const summary of view.outcomes.slice(0, 3)) console.log("  •", outcomeHeadline(summary));
  const worst = [...view.outcomes].sort((a, b) => b.needsHelp - a.needsHelp)[0];
  if (worst) {
    console.log("\nReteach clusters");
    for (const cluster of groupMisconceptions(worst, view.students))
      console.log(
        `  ${cluster.count} learner(s) — ${cluster.misconception ?? cluster.chosenText} — ${cluster.reteach}`,
      );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => client.close());
