import { TranslatedText as T } from "@/components/language-provider";
import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { ArrowRight, GraduationCap, ShieldCheck, Sparkles } from "lucide-react";
import { db } from "@/db";
import { chapters, contentJobs } from "@/db/schema";
import { getActiveUser } from "@/lib/session";
import { canModerateNotes } from "@/lib/faculty-email";
import { getChapterOutcomes } from "@/lib/queries-learning";
import { getCoverageStats } from "@/lib/queries-learning";
import { ContentStudio } from "@/components/content-studio";
import { DatabaseSetup } from "@/components/database-setup";
import { subjectName, validClass, validSubject } from "@/lib/curriculum";

export const dynamic = "force-dynamic";

/**
 * Faculty content pipeline.
 *
 * This is the answer to "content coming soon": a teacher turns material they
 * already have into a chapter pack — notes, an outcome-tagged question bank and a
 * Telugu (or Hindi/Tamil/Kannada/Malayalam) translation — inside one page. The
 * "gaps" panel is deliberately blunt about how many chapters are still empty, and
 * it is ordered so the emptiest chapter is first.
 */
export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ classNo?: string; subject?: string; chapter?: string }>;
}) {
  const params = await searchParams;
  const user = await getActiveUser();
  if (!user) return <DatabaseSetup />;

  const classNo = validClass(params.classNo ?? "") ? Number(params.classNo) : 8;
  const subjectSlug = validSubject(params.subject ?? "") ? params.subject! : "science";

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

  const wanted = Number(params.chapter);
  const chapter = rows.find((row) => row.num === wanted) ?? rows[0];

  const [outcomes, coverage, recentJobs] = await Promise.all([
    chapter ? getChapterOutcomes(classNo, subjectSlug, chapter.num) : Promise.resolve([]),
    getCoverageStats(),
    db
      .select({
        id: contentJobs.id,
        chapterId: contentJobs.chapterId,
        sourceName: contentJobs.sourceName,
        sourceKind: contentJobs.sourceKind,
        status: contentJobs.status,
        payload: contentJobs.payload,
        createdAt: contentJobs.createdAt,
      })
      .from(contentJobs)
      .orderBy(asc(contentJobs.id))
      .limit(8),
  ]);

  const chapterTitleById = new Map(
    (
      await db.select({ id: chapters.id, title: chapters.title }).from(chapters)
    ).map((row) => [row.id, row.title]),
  );

  const recent = recentJobs
    .slice()
    .reverse()
    .map((job) => ({
      id: job.id,
      chapterTitle: chapterTitleById.get(job.chapterId) ?? `Chapter ${job.chapterId}`,
      sourceName: job.sourceName,
      sourceKind: job.sourceKind,
      status: job.status,
      questionCount: (job.payload?.questions ?? []).length,
      createdAt: new Date(job.createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      }),
    }));

  const canPublish = user.role === "faculty" && canModerateNotes(user);
  const aiConfigured = Boolean(process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.includes("*"));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-saffron-600">
          <GraduationCap className="h-4 w-4" /> Faculty workspace
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-navy-900 sm:text-3xl">
          <T>Content studio</T>
        </h1>
        <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-slate-600">
          <T>
            Turn a PDF, a photograph or a five-minute recording into a chapter pack: transcript,
            revision notes, twenty questions tagged to learning outcomes, and a Telugu translation
            for review. Faculty approve everything — the system drafts, it does not publish.
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
              {[6, 7, 8, 9, 10].map((value) => (
                <option key={value} value={value}>
                  Class {value}
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
              {["science", "mathematics", "social-science", "english", "hindi", "arts-vocational"].map(
                (slug) => (
                  <option key={slug} value={slug}>
                    {subjectName(slug)}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="text-[12.5px] font-bold text-navy-800">
            <span className="block">
              <T>Chapter</T>
            </span>
            <select
              name="chapter"
              defaultValue={chapter?.num}
              className="mt-1 max-w-[300px] rounded-md border border-line bg-paper px-2 py-1.5 text-[13px] font-semibold"
            >
              {rows.map((row) => (
                <option key={row.id} value={row.num}>
                  {row.num}. {row.title}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-md bg-navy-800 px-4 py-2 text-[13px] font-bold text-white hover:bg-navy-700"
          >
            <T>Open chapter</T>
          </button>
        </form>

        <ul className="mt-4 flex flex-wrap gap-2 text-[11.5px] font-semibold text-slate-600">
          <li className="rounded-full border border-line bg-paper px-3 py-1">
            {coverage.chapters - coverage.chaptersWithBank} of {coverage.chapters} chapters have no
            question bank
          </li>
          <li className="rounded-full border border-line bg-paper px-3 py-1">
            {coverage.chapters - coverage.chaptersWithSources} chapters have no indexed source
          </li>
          <li className="rounded-full border border-line bg-paper px-3 py-1">
            {coverage.outcomes} outcomes mapped · {coverage.taggedQuestions} questions tagged
          </li>
        </ul>
      </header>

      {!canPublish && (
        <p className="mt-4 flex items-start gap-2 rounded-md border border-navy-200 bg-navy-50 px-4 py-3 text-[13px] text-navy-800">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-navy-600" />
          <span>
            You are signed in as {user.role === "faculty" ? "unverified faculty" : "a student"}.
            Generation is open for exploration, but **publishing** requires a verified institutional
            email, because published material becomes a faculty-verified source for every learner in
            the class.
          </span>
        </p>
      )}

      {chapter ? (
        <div className="mt-5">
          <ContentStudio
            chapterId={chapter.id}
            chapterTitle={`Ch ${chapter.num} · ${chapter.title}`}
            classNo={classNo}
            subjectName={subjectName(subjectSlug)}
            hasCuratedOutcomes={(chapter.outcomeIds ?? []).length >= 2}
            curatedOutcomes={outcomes.map((outcome) => ({
              code: outcome.code,
              concept: outcome.concept,
            }))}
            recent={recent}
            aiConfigured={aiConfigured}
          />
        </div>
      ) : (
        <p className="mt-5 rounded-md border border-line bg-white p-5 text-[13.5px] text-slate-600">
          No chapters found for that class and subject.
        </p>
      )}

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="rounded-lg border border-navy-200 bg-navy-800 p-4 text-white">
          <h2 className="flex items-center gap-2 text-[15px] font-extrabold">
            <Sparkles className="h-4 w-4 text-saffron-400" /> What publishing changes
          </h2>
          <ul className="mt-3 space-y-2 text-[13px] text-navy-100">
            <li>• Notes become a faculty-verified note on the chapter, ranked above classmates&apos; notes.</li>
            <li>• The uploaded text is chunked into the tutor&apos;s index, so answers can cite it.</li>
            <li>• Questions join the assessment bank and move the mastery map for this chapter.</li>
            <li>• Draft outcomes are stored as faculty-approved and labelled as such.</li>
            <li>• The pack is added to the class notebook, so every learner gets the same grounded tutor.</li>
          </ul>
          <Link
            href="/teacher"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-saffron-500 px-4 py-2 text-[13px] font-extrabold text-navy-950 hover:bg-saffron-400"
          >
            See the mastery map <ArrowRight className="h-4 w-4" />
          </Link>
        </article>

        <article className="rounded-lg border border-line bg-white p-4 shadow-sm">
          <h2 className="text-[15px] font-extrabold text-navy-900">
            Where the outcomes come from
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
            Every curated outcome carries the NCERT source document and page it is adapted from
            (Learning Outcomes at the Elementary Stage, 2017 for Classes 1–8; the Secondary Stage
            document, 2019 for Classes 9–10). Chapters without a map are marked as pending rather
            than filled with invented codes — a teacher drafts them here and they are labelled
            “faculty draft” on every screen they appear on.
          </p>
          <p className="mt-3 text-[12px] text-slate-500">
            Question tags are audited in <code>scripts/seed-outcome-tags.ts</code>: one column beside
            the questions, readable in a single screen by a subject expert.
          </p>
        </article>
      </section>
    </div>
  );
}
