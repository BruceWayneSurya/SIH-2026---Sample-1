import { TranslatedText as T } from "@/components/language-provider";
import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import {
  AlertTriangle,
  ArrowRight,
  GraduationCap,
  Printer,
  ShieldCheck,
  WifiOff,
} from "lucide-react";
import { db } from "@/db";
import { chapters } from "@/db/schema";
import { getActiveUser } from "@/lib/session";
import { canModerateNotes } from "@/lib/faculty-email";
import {
  getClassMasteryView,
  getCoverageStats,
  getRetrieval,
  getSourceSummary,
} from "@/lib/queries-learning";
import { groupMisconceptions, outcomeHeadline } from "@/lib/outcomes/mastery";
import { recentlySynced } from "@/lib/offline/server";
import { subjectName, CLASSES, SUBJECTS, validClass, validSubject } from "@/lib/curriculum";
import { MasteryHeatmap, type Cluster, type ReteachCitation } from "@/components/mastery-heatmap";
import { DatabaseSetup } from "@/components/database-setup";

export const dynamic = "force-dynamic";

/** Chapters a teacher most likely wants: the ones with a bank or an LO map. */
async function chapterOptions(classNo: number, subjectSlug: string) {
  const rows = await db
    .select({
      id: chapters.id,
      num: chapters.num,
      title: chapters.title,
      slug: chapters.slug,
      outcomeIds: chapters.outcomeIds,
    })
    .from(chapters)
    .where(and(eq(chapters.classNo, classNo), eq(chapters.subjectSlug, subjectSlug)))
    .orderBy(asc(chapters.num));
  return rows;
}

export default async function TeacherPage({
  searchParams,
}: {
  searchParams: Promise<{ classNo?: string; subject?: string; chapter?: string; focus?: string }>;
}) {
  const params = await searchParams;
  const user = await getActiveUser();
  if (!user) return <DatabaseSetup />;

  const classNo = validClass(params.classNo ?? "") ? Number(params.classNo) : 8;
  const subjectSlug = validSubject(params.subject ?? "") ? params.subject! : "science";
  const options = await chapterOptions(classNo, subjectSlug);

  // Default to the chapter with the richest learning-outcome map.
  const defaultChapter =
    options.find((option) => (option.outcomeIds ?? []).length >= 4) ??
    options[0];
  const wanted = Number(params.chapter);
  const chapterRow = options.find((option) => option.num === wanted) ?? defaultChapter;

  // A faculty member sees their own school; everyone else sees the largest cohort.
  const cohortSchool = user.role === "faculty" && user.school ? user.school : null;
  const [mastery, coverage, syncedList, sources] = await Promise.all([
    chapterRow
      ? getClassMasteryView(classNo, subjectSlug, chapterRow.num, { school: cohortSchool })
      : Promise.resolve(null),
    getCoverageStats(),
    recentlySynced(classNo, 6),
    chapterRow ? getSourceSummary(chapterRow.id) : Promise.resolve([]),
  ]);

  // Reteach citations and error clusters, per outcome, from the same index the
  // tutor uses — so the teacher sees exactly what the AI would quote.
  const reteach: Record<string, ReteachCitation[]> = {};
  const clusters: Record<string, Cluster[]> = {};
  if (mastery && chapterRow) {
    for (const outcome of mastery.outcomes) {
      const query = `${outcome.concept} ${outcome.statement}`.slice(0, 300);
      const { results } = await getRetrieval(chapterRow.id, query, { k: 2 });
      reteach[outcome.code] = results.map((result) => ({
        code: outcome.code,
        label: result.citation.label,
        snippet: result.snippet.slice(0, 180),
        href: `/class/${classNo}/${subjectSlug}/${chapterRow.slug}/source/${result.chunk.id}`,
      }));
      clusters[outcome.code] = groupMisconceptions(outcome, mastery.students).map((cluster) => ({
        label: cluster.label,
        misconception: cluster.misconception,
        chosenText: cluster.chosenText,
        count: cluster.count,
        reteach: cluster.reteach,
      }));
    }
  }

  const canSeeNames = user.role === "faculty" && canModerateNotes(user);
  const tagged = coverage.totalQuestions
    ? Math.round((coverage.taggedQuestions / coverage.totalQuestions) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="vsv-enter rounded-lg border border-line bg-white p-5 shadow-sm">
        <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-saffron-600">
          <GraduationCap className="h-4 w-4" /> Teacher workspace
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-navy-900 sm:text-3xl">
          <T>Concept-mastery map</T>
        </h1>
        <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-slate-600">
          <T>
            Quiz answers are mapped to NCERT learning outcomes, so this is the
            class&apos;s knowledge graph — not a leaderboard. Every flag links back
            to the questions, the wrong options and the textbook paragraph to
            reteach from.
          </T>
        </p>

        <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-[12.5px] font-bold text-navy-800">
            <span className="block">
              <T>Class</T>
            </span>
            <select
              name="classNo"
              defaultValue={classNo}
              className="mt-1 rounded-md border border-line bg-paper px-2 py-1.5 text-[13px] font-semibold"
            >
              {CLASSES.map((classNumber) => (
                <option key={classNumber} value={classNumber}>
                  Class {classNumber}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[12.5px] font-bold text-navy-800">
            <span className="block">
              <T>Subject</T>
            </span>
            <select
              name="subject"
              defaultValue={subjectSlug}
              className="mt-1 rounded-md border border-line bg-paper px-2 py-1.5 text-[13px] font-semibold"
            >
              {SUBJECTS.map((subject) => (
                <option key={subject.slug} value={subject.slug}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[12.5px] font-bold text-navy-800">
            <span className="block">
              <T>Chapter</T>
            </span>
            <select
              name="chapter"
              defaultValue={chapterRow?.num}
              className="mt-1 max-w-[280px] rounded-md border border-line bg-paper px-2 py-1.5 text-[13px] font-semibold"
            >
              {options.map((option) => (
                <option key={option.id} value={option.num}>
                  {option.num}. {option.title}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-md bg-navy-800 px-4 py-2 text-[13px] font-bold text-white hover:bg-navy-700"
          >
            <T>Show the class</T>
          </button>
          {chapterRow && (
            <Link
              href={`/class/${classNo}/${subjectSlug}/${chapterRow.slug}?tab=objective`}
              className="rounded-md border border-line bg-white px-4 py-2 text-[13px] font-bold text-navy-700 hover:border-saffron-400"
            >
              <T>Take the test myself</T>
            </Link>
          )}
        </form>

        <ul className="mt-4 flex flex-wrap gap-2 text-[11.5px] font-semibold text-slate-600">
          <li className="rounded-full border border-line bg-paper px-3 py-1">
            {coverage.outcomes} NCERT outcomes mapped
          </li>
          <li className="rounded-full border border-line bg-paper px-3 py-1">
            {tagged}% of questions tagged to an outcome ({coverage.taggedQuestions}/
            {coverage.totalQuestions})
          </li>
          <li className="rounded-full border border-line bg-paper px-3 py-1">
            {coverage.chaptersWithSources} of {coverage.chapters} chapters have indexed sources
          </li>
          <li className="rounded-full border border-line bg-paper px-3 py-1">
            {sources.length} source{sources.length === 1 ? "" : "s"} indexed for this chapter
          </li>
        </ul>
      </header>

      {!canSeeNames && (
        <p className="mt-4 flex items-start gap-2 rounded-md border border-navy-200 bg-navy-50 px-4 py-3 text-[13px] text-navy-800">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-navy-600" />
          <span>
            You are signed in as {user.role === "faculty" ? "unverified faculty" : "a student"}, so
            learner names are hidden. The class picture is identical; sign in with a verified
            institutional email to see who needs help.
          </span>
        </p>
      )}

      {mastery ? (
        <div className="mt-5">
          <MasteryHeatmap
            chapterTitle={`${mastery.chapterTitle}${mastery.school ? ` · ${mastery.school}` : ""}`}
            classNo={classNo}
            rosterSize={mastery.rosterSize}
            attemptedStudents={mastery.attemptedStudents}
            named={canSeeNames}
            outcomes={mastery.outcomes.map((outcome) => ({
              ...outcome,
              headline: outcomeHeadline(outcome),
              misconceptions: outcome.misconceptions,
            }))}
            students={mastery.students.map((student, index) => ({
              id: canSeeNames ? student.userId : undefined,
              label: canSeeNames ? student.name : `Student ${String(index + 1).padStart(2, "0")}`,
              handle: canSeeNames ? student.handle : null,
              secureCount: student.mastery.secureCount,
              needsHelpCount: student.mastery.needsHelpCount,
              cells: student.mastery.outcomes.map((cell) => ({
                code: cell.code,
                level: cell.level,
                accuracy: Math.round(cell.accuracy * 100),
                confidence: cell.confidence,
              })),
            }))}
            clusters={clusters}
            reteach={reteach}
            focusCode={params.focus ?? null}
            sourceLinkBase={`/class/${classNo}/${subjectSlug}/${chapterRow?.slug ?? ""}`}
          />
        </div>
      ) : (
        <p className="mt-6 rounded-md border border-line bg-white p-5 text-[13.5px] text-slate-600">
          No chapter found for Class {classNo} {subjectName(subjectSlug)}. Choose another subject
          above.
        </p>
      )}

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <article className="rounded-lg border border-line bg-white p-4 shadow-sm">
          <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-navy-900">
            <AlertTriangle className="h-4 w-4 text-saffron-600" /> What this changes in class
          </h2>
          <ol className="mt-3 space-y-2 text-[13px] leading-relaxed text-navy-800">
            <li>
              1. Open the flagged outcome with the biggest group. One wrong idea usually means one
              10-minute reteach, not a new period.
            </li>
            <li>
              2. Show the textbook paragraph the class missed — every citation chip opens it in
              context.
            </li>
            <li>
              3. Re-run the same test; the heatmap moves when the class does. Marks stay untouched —
              nothing here rewrites a learner&apos;s score.
            </li>
          </ol>
          {chapterRow && (
            <Link
              href={`/class/${classNo}/${subjectSlug}/${chapterRow.slug}?tab=revision`}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-saffron-500 px-4 py-2 text-[13px] font-extrabold text-navy-950 hover:bg-saffron-400"
            >
              <Printer className="h-4 w-4" /> Printable revision sheet
            </Link>
          )}
        </article>

        <article className="rounded-lg border border-line bg-white p-4 shadow-sm">
          <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-navy-900">
            <WifiOff className="h-4 w-4 text-saffron-600" /> Devices that studied offline
          </h2>
          {syncedList.length === 0 ? (
            <p className="mt-2 text-[13px] text-slate-500">
              No offline quiz results have been synced for this class yet. Packs are downloaded from
              the chapter page; marks appear here as soon as a device reconnects.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-[13px]">
              {syncedList.map((row) => (
                <li
                  key={row.clientId}
                  className="flex items-center justify-between gap-2 rounded-md border border-line bg-paper px-3 py-2"
                >
                  <span className="truncate font-bold text-navy-800">
                    {canSeeNames ? row.name : "A learner"}
                  </span>
                  <span className="shrink-0 text-slate-600">
                    {row.score}/{row.total} ·{" "}
                    {new Date(row.syncedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="rounded-lg border border-navy-200 bg-navy-800 p-4 text-white shadow-sm">
          <h2 className="text-[15px] font-extrabold">Content gaps, owned by faculty</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-navy-100">
            {coverage.chapters - coverage.chaptersWithSources} chapters still have no indexed source
            and {coverage.chapters - coverage.chaptersWithBank} have no question bank. Upload a PDF,
            a photograph or a five-minute recording in the content studio: the system drafts notes,
            a translation and an outcome-tagged question bank for your review.
          </p>
          <Link
            href="/faculty/studio"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-saffron-500 px-4 py-2 text-[13px] font-extrabold text-navy-950 hover:bg-saffron-400"
          >
            Open the content studio <ArrowRight className="h-4 w-4" />
          </Link>
        </article>
      </section>

      <p className="mt-6 text-[12px] leading-relaxed text-slate-500">
        Roster: Class {classNo} {subjectName(subjectSlug)} · {mastery?.rosterSize ?? 0} learners
        {chapterRow ? ` · Chapter ${chapterRow.num}: ${chapterRow.title}` : ""}. Mastery is recomputed
        from stored answer sheets; it is a teaching signal, not a mark, and it never changes a
        learner&apos;s score.
      </p>
    </div>
  );
}
