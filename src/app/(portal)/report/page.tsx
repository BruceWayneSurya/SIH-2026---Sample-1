import { TranslatedText as T } from "@/components/language-provider";
import { DatabaseSetup } from "@/components/database-setup";
import Link from "next/link";
import { ArrowLeft, Award, Medal, Target, Zap } from "lucide-react";
import { getActiveUser } from "@/lib/session";
import { db } from "@/db";
import {
  chapters,
  dailyActivity,
  mcqAttempts,
  notes,
  userAnalytics,
  xpEvents,
} from "@/db/schema";
import { desc, eq, and, sql } from "drizzle-orm";
import {
  Breadcrumbs,
  ChakraMark,
  SectionHeading,
  SUBJECT_ICONS,
} from "@/components/ui";
import { PrintButton } from "@/components/print-button";
import { SUBJECTS, classLabel } from "@/lib/curriculum";
import { getBadgesForUser, getUserStats } from "@/lib/queries";
import { BADGES } from "@/lib/badges";

export const dynamic = "force-dynamic";

/**
 * Printable Progress Report — a Government-of-India-style report card that
 * students (and faculty) can print or share. Generated live from the
 * learner's own data: XP, rank, accuracy, streaks, subject-wise performance
 * and recent attempts.
 */
export default async function ReportPage() {
  const user = await getActiveUser();
  if (!user) return <DatabaseSetup />;

  const classNo = user.className ?? 8;
  const stats = await getUserStats(user.id, classNo);
  const badges = await getBadgesForUser(user.id);

  let streak = { current: 0, longest: 0, totalQuizzes: 0 };
  try {
    const [ua] = await db
      .select()
      .from(userAnalytics)
      .where(eq(userAnalytics.userId, user.id))
      .limit(1);
    if (ua) {
      streak = {
        current: ua.currentStreak,
        longest: ua.longestStreak,
        totalQuizzes: ua.totalQuizzes ?? 0,
      };
    }
  } catch {
    // Analytics not provisioned — streaks stay 0.
  }

  // Subject-wise performance (objective attempts per subject).
  const subjectRows = await db
    .select({
      subject: chapters.subjectSlug,
      attempts: sql<number>`count(${mcqAttempts.id})`,
      scored: sql<number>`coalesce(sum(${mcqAttempts.score}), 0)`,
      total: sql<number>`coalesce(sum(${mcqAttempts.total}), 0)`,
      chaptersCovered: sql<number>`count(distinct ${mcqAttempts.chapterId})`,
    })
    .from(mcqAttempts)
    .innerJoin(chapters, eq(mcqAttempts.chapterId, chapters.id))
    .where(eq(mcqAttempts.userId, user.id))
    .groupBy(chapters.subjectSlug);
  const bySubject = new Map(
    subjectRows.map((r) => [
      r.subject,
      {
        attempts: Number(r.attempts),
        scored: Number(r.scored),
        total: Number(r.total),
        chaptersCovered: Number(r.chaptersCovered),
      },
    ]),
  );

  const recentAttempts = await db
    .select({
      id: mcqAttempts.id,
      createdAt: mcqAttempts.createdAt,
      score: mcqAttempts.score,
      total: mcqAttempts.total,
      xp: mcqAttempts.xpEarned,
      chapterTitle: chapters.title,
      subjectName: chapters.subjectName,
      num: chapters.num,
      classNo: chapters.classNo,
    })
    .from(mcqAttempts)
    .innerJoin(chapters, eq(mcqAttempts.chapterId, chapters.id))
    .where(eq(mcqAttempts.userId, user.id))
    .orderBy(desc(mcqAttempts.createdAt), desc(mcqAttempts.id))
    .limit(10);

  const [xpTotalRow, notesRow] = await Promise.all([
    db
      .select({ xp: sql<number>`coalesce(sum(${xpEvents.amount}), 0)` })
      .from(xpEvents)
      .where(eq(xpEvents.userId, user.id)),
    db
      .select({ n: sql<number>`count(${notes.id})` })
      .from(notes)
      .where(and(eq(notes.authorId, user.id))),
  ]);

  const bestChapter = recentAttempts.reduce<{
    label: string;
    pct: number;
  } | null>((best, r) => {
    const pct = r.total > 0 ? Math.round((r.score / r.total) * 100) : 0;
    if (!best || pct > best.pct) {
      return { label: `Ch ${r.num}: ${r.chapterTitle}`, pct };
    }
    return best;
  }, null);

  const issueDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const refNo = `PRG-${user.id}-${new Date().getFullYear()}`;
  const identity: Array<[string, string]> = [
    ["Name", user.name],
    ["Handle", `@${user.handle}`],
    [user.role === "faculty" ? "Role" : "Class", user.role === "faculty" ? "Faculty" : classLabel(classNo)],
    [user.role === "faculty" ? "Specialization" : "School", (user.subjectSpecialization ?? user.school) || "—"],
    ["State / UT", user.state ?? "—"],
    ["Account", user.isGuest ? "Guest" : "Registered"],
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Breadcrumbs
        items={[
          { href: "/home", label: <T>Home</T> },
          { label: <T>Progress Report</T> },
        ]}
      />

      {/* Screen-only action bar */}
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <SectionHeading
          eyebrow="Official record"
          title="Progress Report"
          sub="A printable, computer-generated report of learning progress on the Pragyan portal. Use Print → Save as PDF to download."
        />
        <div className="flex gap-2">
          <Link href="/home" className="btn-outline text-sm">
            <ArrowLeft className="h-4 w-4" /> <T>Back to dashboard</T>
          </Link>
          <PrintButton />
        </div>
      </div>

      {/* ── The report sheet (A4-style, print-ready) ───────────────── */}
      <article
        className="report-sheet overflow-hidden rounded-lg border-2 border-navy-800 bg-white"
        aria-label="Progress report"
      >
        {/* Certificate inner border */}
        <div className="m-1.5 border border-navy-300 p-6 sm:m-2 sm:border-2 sm:p-8">
          {/* Masthead */}
          <header className="border-b-2 border-navy-800 pb-4">
            <div className="flex flex-wrap items-center gap-4">
              <ChakraMark className="h-12 w-12 text-navy-800" />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-extrabold text-navy-900" lang="hi" style={{ fontFamily: "var(--font-deva), serif" }}>
                  भारत सरकार
                </p>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-navy-700">
                  <T>Government of India</T>
                </p>
                <p className="mt-1 text-[12px] font-semibold text-slate-600">
                  <T>Ministry of Education</T> ·{" "}
                  <T>Department of School Education &amp; Literacy</T>
                </p>
              </div>
              <div className="text-right text-[12px] font-semibold text-slate-600">
                <p className="font-extrabold uppercase tracking-wider text-navy-800">
                  <T>Ref. No.</T> {refNo}
                </p>
                <p>
                  <T>Issued on</T> {issueDate}
                </p>
                <p className="mt-1 inline-block rounded-sm bg-navy-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  <T>Pragyan Learning Portal</T>
                </p>
              </div>
            </div>
            <h1 className="mt-4 text-center text-2xl font-black tracking-tight text-navy-900 sm:text-3xl">
              <span lang="hi" style={{ fontFamily: "var(--font-deva), serif" }}>
                प्रगति विवरण
              </span>
              <span className="mx-2 text-saffron-500">·</span>
              <T>Progress Report</T>
            </h1>
          </header>

          {/* Identity */}
          <section className="mt-5">
            <h2 className="eyebrow">
              <T>Learner details</T>
            </h2>
            <dl className="mt-2 grid gap-x-8 gap-y-2 rounded-md border border-line bg-navy-50/50 p-4 text-[14px] sm:grid-cols-2">
              {identity.map(([label, value]) => (
                <div key={label} className="flex items-baseline gap-2">
                  <dt className="w-32 shrink-0 text-[12px] font-bold uppercase tracking-wide text-slate-500">
                    <T>{label}</T>
                  </dt>
                  <dd className="min-w-0 flex-1 truncate font-bold text-navy-900">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Key metrics */}
          <section className="mt-5">
            <h2 className="eyebrow">
              <T>Key metrics</T>
            </h2>
            <div className="mt-2 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-4">
              {[
                { icon: Zap, label: "Total experience", value: `${stats.xp} XP` },
                { icon: Medal, label: "Class rank", value: stats.rank ? `#${stats.rank}` : "—" },
                { icon: Target, label: "Accuracy", value: stats.accuracy !== null ? `${stats.accuracy}%` : "—" },
                { icon: Award, label: "Badges earned", value: badges.length },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-white p-3.5">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    <Icon className="h-3.5 w-3.5 text-saffron-600" /> <T>{label}</T>
                  </p>
                  <p className="mt-1 text-xl font-extrabold tabular-nums text-navy-900">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-4">
              {[
                { label: "Current streak", value: <T values={{ count: streak.current }}>{"{count}-day streak"}</T> },
                { label: "Longest streak", value: <T values={{ count: streak.longest }}>{"{count}-day streak"}</T> },
                { label: "Tests attempted", value: stats.objectiveAttempts },
                { label: "Notes shared", value: Number(notesRow[0]?.n ?? 0) },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white p-3.5">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    <T>{label}</T>
                  </p>
                  <p className="mt-1 text-xl font-extrabold tabular-nums text-navy-900">{value}</p>
                </div>
              ))}
            </div>
            {bestChapter && (
              <p className="mt-2 rounded-md border border-leaf-100 bg-leaf-50 px-3 py-2 text-[13px] font-semibold text-leaf-700">
                <T>Best performance:</T>{" "}
                {bestChapter.label} · {bestChapter.pct}%
              </p>
            )}
          </section>

          {/* Subject-wise table */}
          <section className="mt-5">
            <h2 className="eyebrow">
              <T>Subject-wise performance</T>
            </h2>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-left text-[13px]">
                <thead>
                  <tr className="border-b-2 border-navy-800 text-[11px] uppercase tracking-wide text-navy-700">
                    <th className="py-2 pr-3 font-bold">
                      <T>Subject</T>
                    </th>
                    <th className="py-2 pr-3 font-bold">
                      <T>Chapters covered</T>
                    </th>
                    <th className="py-2 pr-3 font-bold">
                      <T>Attempts</T>
                    </th>
                    <th className="py-2 pr-3 font-bold">
                      <T>Score</T>
                    </th>
                    <th className="py-2 font-bold">
                      <T>Accuracy</T>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {SUBJECTS.map((s) => {
                    const row = bySubject.get(s.slug);
                    const accuracy =
                      row && row.total > 0
                        ? Math.round((row.scored / row.total) * 100)
                        : null;
                    const Icon = SUBJECT_ICONS[s.icon];
                    return (
                      <tr key={s.slug} className="border-b border-line">
                        <td className="py-2 pr-3">
                          <span className="flex items-center gap-2 font-bold text-navy-900">
                            <Icon className="h-4 w-4 text-navy-600" /> <T>{s.name}</T>
                          </span>
                        </td>
                        <td className="py-2 pr-3 font-semibold text-slate-600">
                          {row ? row.chaptersCovered : 0}
                        </td>
                        <td className="py-2 pr-3 font-semibold text-slate-600">
                          {row ? row.attempts : 0}
                        </td>
                        <td className="py-2 pr-3 font-semibold text-slate-600">
                          {row && row.total > 0 ? `${row.scored}/${row.total}` : "—"}
                        </td>
                        <td className="py-2">
                          {accuracy !== null ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="h-1.5 w-16 overflow-hidden rounded-full bg-navy-100">
                                <span
                                  className={`block h-full rounded-full ${accuracy >= 80 ? "bg-leaf-500" : accuracy >= 50 ? "bg-saffron-500" : "bg-rose-500"}`}
                                  style={{ width: `${accuracy}%` }}
                                />
                              </span>
                              <b className="tabular-nums">{accuracy}%</b>
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Recent attempts + XP */}
          <section className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <h2 className="eyebrow">
                <T>Recent objective attempts</T>
              </h2>
              {recentAttempts.length === 0 ? (
                <p className="mt-2 rounded-md border border-dashed border-line p-3 text-[13px] text-slate-500">
                  <T>No attempts recorded yet.</T>
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-line rounded-md border border-line">
                  {recentAttempts.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 p-2.5 text-[13px]">
                      <span className="shrink-0 rounded-sm bg-navy-50 px-1.5 py-0.5 text-[11px] font-bold text-navy-700">
                        {new Date(r.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-semibold text-navy-800">
                        {r.subjectName} · Ch {r.num}: {r.chapterTitle}
                      </span>
                      <span className="shrink-0 font-extrabold tabular-nums text-navy-900">
                        {r.score}/{r.total}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h2 className="eyebrow">
                <T>Badges</T>
              </h2>
              {badges.length === 0 ? (
                <p className="mt-2 rounded-md border border-dashed border-line p-3 text-[13px] text-slate-500">
                  <T>No badges earned yet.</T>
                </p>
              ) : (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {badges.map((b) => (
                    <li
                      key={b}
                      className="inline-flex items-center gap-1.5 rounded-full border border-saffron-300 bg-saffron-50 px-2.5 py-1 text-[12px] font-bold text-saffron-700"
                    >
                      <Award className="h-3 w-3" /> {BADGES[b]?.name ?? b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Declaration footer */}
          <footer className="mt-6 border-t-2 border-navy-800 pt-3 text-[11px] leading-relaxed text-slate-500">
            <p>
              <T>
                This is a computer-generated progress report and does not
                require a signature.
              </T>{" "}
              <T>Generated on</T> {new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
              {" · "}<T>Ref. No.</T> {refNo}
            </p>
            <p className="mt-1">
              <T>Content owned by:</T>{" "}
              <T>Department of School Education & Literacy, Ministry of Education, Government of India</T>
              {" · "}<T>Toll-free helpline 1800-11-8004</T>
            </p>
          </footer>
        </div>
      </article>
    </div>
  );
}
