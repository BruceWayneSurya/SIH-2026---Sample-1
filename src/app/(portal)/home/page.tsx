import { TranslatedText as T } from "@/components/language-provider";
import { DatabaseSetup } from "@/components/database-setup";
import Link from "next/link";
import {
  Trophy,
  Target,
  Zap,
  Medal,
  BookOpenCheck,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  ClipboardCheck,
  Megaphone,
  Flame,
  LineChart,
  PlayCircle,
  FileText,
} from "lucide-react";
import { getActiveUser } from "@/lib/session";
import { db } from "@/db";
import {
  chapters,
  dailyActivity,
  mcqAttempts,
  notes,
  userAnalytics,
} from "@/db/schema";
import { and, count, desc, eq, gte } from "drizzle-orm";
import { dayKey, addDaysKey, dayVolume } from "@/lib/analytics/model";
import { RecentActivityCard } from "@/components/recent-activity";
import { CLASSES, SUBJECTS, classLabel } from "@/lib/curriculum";
import { getChapterList, getUserStats } from "@/lib/queries";
import { IconBox, ProgressBar, StatCard, SUBJECT_ICONS } from "@/components/ui";

export const dynamic = "force-dynamic";

/** Portal circulars. Dates are real release notes for the published build. */
const CIRCULARS = [
  {
    date: "2026-09-05",
    tag: "Curriculum",
    title: "Class 6 to 10 chapter index published",
    body: "NCERT chapter mapping with learning-outcome IDs is now live for every class served by the portal.",
  },
  {
    date: "2026-09-02",
    tag: "Analytics",
    title: "Learning Analytics suite is live for every learner",
    body: "Streaks, a year-long activity heatmap, skill radar and accuracy trends now track your practice automatically.",
  },
  {
    date: "2026-08-28",
    tag: "Assessment",
    title: "Question banks added for Class 9 and Class 10",
    body: "Objective and subjective banks are being uploaded chapter by chapter by verified faculty.",
  },
];

export default async function Home() {
  const user = await getActiveUser();
  if (!user) return <DatabaseSetup />;

  const classNo = user.className ?? 8;
  const stats = await getUserStats(user.id, classNo);
  const isFaculty = user.role === "faculty";

  const subjectData = [];
  const testableChapters = [];
  for (const s of SUBJECTS) {
    const list = await getChapterList(classNo, s.slug, user.id);
    const practiced = list.filter((c) => c.bestScore !== null).length;
    const testable = list.filter(
      (c) => c.mcqCount > 0 || c.subjCount > 0,
    ).length;
    subjectData.push({ meta: s, total: list.length, practiced, testable });
    for (const c of list) {
      if (c.mcqCount > 0) {
        testableChapters.push({
          key: `${classNo}-${s.slug}-${c.num}`,
          href: `/class/${classNo}/${s.slug}/${c.slug}`,
          subject: s.name,
          label: `Ch ${c.num}: ${c.title}`,
          best: c.bestScore !== null ? `${c.bestScore}/${c.bestTotal}` : null,
        });
      }
    }
  }

  const [chapterTotal] = await db
    .select({ n: count() })
    .from(chapters)
    .where(eq(chapters.classNo, classNo));

  let streak: { current: number; longest: number } = {
    current: 0,
    longest: 0,
  };
  try {
    const [ua] = await db
      .select({
        current: userAnalytics.currentStreak,
        longest: userAnalytics.longestStreak,
      })
      .from(userAnalytics)
      .where(eq(userAnalytics.userId, user.id))
      .limit(1);
    if (ua) streak = { current: ua.current, longest: ua.longest };
  } catch {
    // Analytics table not provisioned yet — streak chips simply stay at 0.
  }

  const nextUntested =
    testableChapters.find((c) => c.best === null) ?? testableChapters[0];

  // "Pick up where you left off" — the learner's most recent attempt.
  let lastSession: {
    href: string;
    label: string;
    subject: string;
    score: number;
    total: number;
    when: string;
  } | null = null;
  if (!isFaculty) {
    const [last] = await db
      .select({
        chapterId: mcqAttempts.chapterId,
        score: mcqAttempts.score,
        total: mcqAttempts.total,
        createdAt: mcqAttempts.createdAt,
        chapterTitle: chapters.title,
        subjectName: chapters.subjectName,
        num: chapters.num,
        classNo: chapters.classNo,
        slug: chapters.slug,
        subjectSlug: chapters.subjectSlug,
      })
      .from(mcqAttempts)
      .innerJoin(chapters, eq(mcqAttempts.chapterId, chapters.id))
      .where(eq(mcqAttempts.userId, user.id))
      .orderBy(desc(mcqAttempts.createdAt), desc(mcqAttempts.id))
      .limit(1);
    if (last) {
      lastSession = {
        href: `/class/${last.classNo}/${last.subjectSlug}/${last.slug}`,
        label: `Ch ${last.num}: ${last.chapterTitle}`,
        subject: last.subjectName,
        score: last.score,
        total: last.total,
        when: new Date(last.createdAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        }),
      };
    }
  }

  // Seven-day activity (for the mini chart).
  const todayKey = dayKey();
  const weekStart = addDaysKey(todayKey, -6);
  const weekRows = await db
    .select()
    .from(dailyActivity)
    .where(
      and(
        eq(dailyActivity.userId, user.id),
        gte(dailyActivity.activityDate, weekStart),
      ),
    )
    .orderBy(desc(dailyActivity.activityDate));
  const weekDays: Array<{ label: string; volume: number; xp: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const key = addDaysKey(todayKey, -i);
    const row = weekRows.find((r) => r.activityDate === key);
    weekDays.push({
      label: new Date(`${key}T00:00:00Z`).toLocaleDateString("en-IN", {
        weekday: "narrow",
      }),
      volume: row ? dayVolume(row) : 0,
      xp: row ? row.xpEarned : 0,
    });
  }
  const weekMax = Math.max(1, ...weekDays.map((d) => d.volume));
  const weekXp = weekDays.reduce((sum, d) => sum + d.xp, 0);

  let facultyQueue: {
    id: number;
    title: string;
    chapter: string;
    author: string;
  }[] = [];
  if (isFaculty) {
    const pending = await db
      .select({
        id: notes.id,
        title: notes.title,
        authorName: notes.authorName,
        chapterTitle: chapters.title,
        classNo: chapters.classNo,
      })
      .from(notes)
      .innerJoin(chapters, eq(notes.chapterId, chapters.id))
      .where(eq(notes.facultyVerified, false))
      .orderBy(desc(notes.id))
      .limit(5);
    facultyQueue = pending.map((p) => ({
      id: p.id,
      title: p.title,
      author: p.authorName,
      chapter: `${classLabel(p.classNo)} · ${p.chapterTitle}`,
    }));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* ── Greeting hero ──────────────────────────────────────────── */}
      <section className="gov-grid vsv-enter relative overflow-hidden rounded-2xl bg-navy-900 text-white shadow-lg">
        <div
          className="chakra-watermark -right-16 -top-20 h-72 w-72 opacity-[0.10] rotate-12"
          aria-hidden="true"
        >
          <svg viewBox="0 0 40 40" className="h-full w-full text-saffron-400">
            <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="20" cy="20" r="3" fill="currentColor" />
            {Array.from({ length: 24 }).map((_, i) => (
              <line key={i} x1="20" y1="20" x2="20" y2="4.5" stroke="currentColor" strokeWidth="1" transform={`rotate(${i * 15} 20 20)`} />
            ))}
          </svg>
        </div>
        <div className="relative flex flex-wrap items-end justify-between gap-5 p-6 sm:p-7">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-saffron-400/30 bg-saffron-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-saffron-300">
              <T values={{ classNo }}>
                {isFaculty
                  ? "Faculty Console"
                  : "Class {classNo} · Student Dashboard"}
              </T>
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              <T
                values={{
                  name: isFaculty ? user.name : user.name.split(" ")[0],
                }}
              >
                {isFaculty ? "Welcome, {name}" : "Namaste, {name}!"}
              </T>
            </h1>
            <p className="mt-1.5 text-[14px] text-navy-100">
              {user.school ?? user.subjectSpecialization}
              {user.state ? ` · ${user.state}` : ""}
              {user.isGuest && (
                <span className="ml-2 rounded-sm bg-white/15 px-1.5 py-0.5 text-[12px] font-bold text-white">
                  <T>Guest access</T>
                </span>
              )}
            </p>
            <p className="mt-0.5 text-[12.5px] text-navy-300">
              <T>
                Department of School Education &amp; Literacy · National Digital
                Learning Portal
              </T>
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 sm:items-end">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold text-white ring-1 ring-white/15">
                <Flame
                  className={`h-4 w-4 ${streak.current > 0 ? "text-saffron-400" : "text-navy-300"}`}
                  aria-hidden="true"
                />
                <T values={{ count: streak.current }}>{"{count}-day streak"}</T>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold text-white ring-1 ring-white/15">
                <Zap className="h-4 w-4 text-saffron-400" aria-hidden="true" />
                {stats.xp} XP
              </span>
              {stats.rank && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold text-white ring-1 ring-white/15">
                  <Trophy className="h-4 w-4 text-saffron-400" aria-hidden="true" />
                  <T values={{ rank: `#${stats.rank}` }}>{"Rank {rank}"}</T>
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {!isFaculty && nextUntested && (
                <Link
                  href={nextUntested.href}
                  className="btn-primary px-4 py-2 text-sm"
                >
                  <Target className="h-4 w-4" />
                  <T>Take today’s test</T>
                </Link>
              )}
              <Link
                href="/analytics"
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
              >
                <LineChart className="h-4 w-4" />
                <T>View analytics</T>
              </Link>
              <Link
                href="/leaderboard"
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
              >
                <Trophy className="h-4 w-4 text-saffron-400" />
                <T>Leaderboard</T>
              </Link>
              <Link
                href="/report"
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
              >
                <FileText className="h-4 w-4 text-saffron-400" />
                <T>Report card</T>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div
        className="vsv-enter mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4"
        style={{ animationDelay: "60ms" }}
      >
        <StatCard
          icon={Zap}
          label="Total XP"
          value={stats.xp}
          tone="saffron"
          sub={
            isFaculty ? "Content contribution" : "Earn it in every test"
          }
        />
        <StatCard
          icon={Medal}
          label="Class Rank"
          value={stats.rank ? `#${stats.rank}` : "—"}
          sub={
            <T values={{ classNo }}>{"Class {classNo} · all subjects"}</T>
          }
        />
        <StatCard
          icon={Target}
          label="Accuracy"
          value={stats.accuracy !== null ? `${stats.accuracy}%` : "—"}
          sub={
            <T values={{ count: stats.objectiveAttempts }}>
              {
                stats.objectiveAttempts === 1
                  ? "{count} objective test attempted"
                  : "{count} objective tests attempted"
              }
            </T>
          }
        />
        <StatCard
          icon={Sparkles}
          label="Notes Shared"
          value={stats.notes}
          sub="Community contributions"
        />
      </div>

      {/* ── Continue learning: resume card + week activity ─────────── */}
      {!isFaculty && (
        <div
          className="vsv-enter mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]"
          style={{ animationDelay: "100ms" }}
        >
          <section className="card card-hover flex flex-col justify-between p-5 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <span className="inline-flex shrink-0 rounded-lg border border-saffron-200 bg-saffron-50 p-2.5 text-saffron-700">
                <PlayCircle className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="text-[15px] font-extrabold text-navy-900">
                  <T>Pick up where you left off</T>
                </h2>
                {lastSession ? (
                  <>
                    <p className="mt-1 truncate text-[15px] font-bold text-navy-800">
                      {lastSession.label}
                    </p>
                    <p className="mt-0.5 text-[13px] font-semibold text-slate-500">
                      <T values={{ subject: lastSession.subject }}>
                        {"{subject}"}
                      </T>{" "}
                      ·{" "}
                      <T values={{ when: lastSession.when }}>
                        {"Last attempted {when}"}
                      </T>{" "}
                      ·{" "}
                      <span className="font-bold text-leaf-700">
                        <T values={{ score: lastSession.score, total: lastSession.total }}>
                          {"Best {score}/{total}"}
                        </T>
                      </span>
                    </p>
                  </>
                ) : nextUntested ? (
                  <>
                    <p className="mt-1 truncate text-[15px] font-bold text-navy-800">
                      {nextUntested.label}
                    </p>
                    <p className="mt-0.5 text-[13px] font-semibold text-slate-500">
                      <T values={{ subject: nextUntested.subject }}>
                        {"{subject}"}
                      </T>{" "}
                      · <T>Ready for your first attempt</T>
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-[14px] text-slate-600">
                    <T>Assessments for your class are being uploaded by faculty. Check back soon!</T>
                  </p>
                )}
              </div>
            </div>
            {(lastSession ?? nextUntested) && (
              <Link
                href={(lastSession ?? nextUntested)!.href}
                className="btn-primary mt-4 shrink-0 px-4 py-2.5 text-sm sm:mt-0"
              >
                <T>Resume chapter</T> <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-extrabold text-navy-900">
                <T>This week</T>
              </h2>
              <span className="rounded-full border border-saffron-200 bg-saffron-50 px-2.5 py-0.5 text-[12px] font-bold text-saffron-700">
                +{weekXp} XP
              </span>
            </div>
            <p className="mt-0.5 text-[12px] font-semibold text-slate-500">
              <T>Activity, last 7 days</T>
            </p>
            <div
              className="mt-3 flex h-20 items-end gap-1.5"
              role="img"
              aria-label={
                weekDays
                  .map((d) => `${d.label}: ${d.volume}`)
                  .join(", ")
              }
            >
              {weekDays.map((d, i) => (
                <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <div
                    className={`w-full max-w-[26px] rounded-t ${
                      d.volume > 0
                        ? i === 6
                          ? "bg-saffron-500"
                          : "bg-navy-500"
                        : "bg-navy-100"
                    }`}
                    style={{ height: `${Math.max(8, (d.volume / weekMax) * 100)}%` }}
                  />
                  <span className="text-[10px] font-bold text-slate-400">{d.label}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {isFaculty && (
        <section
          className="card-hover vsv-enter mt-6 rounded-xl border border-saffron-200 bg-white p-5 shadow-sm"
          style={{ animationDelay: "100ms" }}
        >
          <h2 className="flex items-center gap-2 text-lg font-bold text-navy-900">
            <ShieldCheck className="h-5 w-5 text-saffron-600" />{" "}
            <T>Moderation queue</T>
            <span className="rounded-full bg-saffron-100 px-2 py-0.5 text-[12px] font-bold text-saffron-700">
              <T values={{ count: facultyQueue.length }}>
                {"{count} awaiting review"}
              </T>
            </span>
          </h2>
          {facultyQueue.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">
              <T>
                All community notes are verified. New submissions will appear
                here.
              </T>
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {facultyQueue.map((n) => (
                <li
                  key={n.id}
                  className="flex flex-wrap items-center gap-2 py-2.5 text-[15px]"
                >
                  <ClipboardCheck className="h-4 w-4 text-navy-400" />
                  <span className="font-bold text-navy-900">{n.title}</span>
                  <span className="text-sm text-slate-500">
                    <T values={{ name: n.author }}>{"by {name}"}</T>
                  </span>
                  <span className="ml-auto rounded-sm bg-navy-50 px-2 py-0.5 text-[12px] font-semibold text-navy-600">
                    {n.chapter}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[13px] text-slate-500">
            <T>Open any chapter’s Notes section and use the one-click</T>{" "}
            <b>
              <T>Verify</T>
            </b>{" "}
            <T>
              toggle — verified notes jump to the top with a green tick.
            </T>
          </p>
        </section>
      )}

      <div className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <section className="card card-hover vsv-enter p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-navy-900">
            <Megaphone className="h-5 w-5 text-saffron-600" />{" "}
            <T>Circulars &amp; Announcements</T>
          </h2>
          <ul className="mt-3 divide-y divide-line">
            {CIRCULARS.map((c) => (
              <li key={c.title} className="py-2.5">
                <p className="flex flex-wrap items-center gap-2 text-[13px] font-bold text-slate-500">
                  <span className="rounded-sm bg-navy-50 px-1.5 py-0.5 text-navy-600">
                    <T>{c.tag}</T>
                  </span>
                  {new Date(c.date).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <p className="mt-0.5 text-[15px] font-bold text-navy-900">
                  <T>{c.title}</T>
                </p>
                <p className="text-[13px] text-slate-600">
                  <T>{c.body}</T>
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] text-slate-500">
            <T>
              Circulars are issued by the portal administrator and apply to all
              classes.
            </T>
          </p>
        </section>

        <section
          className="card card-hover vsv-enter p-5"
          style={{ animationDelay: "60ms" }}
        >
          <h2 className="text-lg font-bold text-navy-900">
            <T values={{ from: CLASSES[0], to: CLASSES[CLASSES.length - 1] }}>
              {"Browse classes {from} to {to}"}
            </T>
          </h2>
          <p className="mt-1 text-[13px] text-slate-600">
            <T values={{ count: chapterTotal?.n ?? 0 }}>
              {"{count} chapters indexed for your class."}
            </T>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {CLASSES.map((c) => (
              <Link
                key={c}
                href={`/class/${c}/science`}
                className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-[14px] font-bold transition ${
                  c === classNo
                    ? "border-navy-700 bg-navy-800 text-white"
                    : "border-line bg-paper text-navy-700 hover:border-navy-400 hover:bg-white"
                }`}
              >
                <T values={{ classNo: c }}>{"Class {classNo}"}</T>
                {c === classNo && (
                  <span className="rounded-sm bg-white/20 px-1 text-[11px] uppercase">
                    <T>yours</T>
                  </span>
                )}
              </Link>
            ))}
          </div>
          <p className="mt-3 text-[13px] text-slate-600">
            <T>
              Switching a class opens its subject list; your own class stays
              the default for progress, XP and the leaderboard.
            </T>
          </p>
        </section>
      </div>

      <section className="vsv-enter mt-8" style={{ animationDelay: "140ms" }}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-extrabold text-navy-900">
            <T values={{ classNo }}>{"Class {classNo} · NCERT Subjects"}</T>
          </h2>
          <span className="text-[13px] font-semibold text-slate-500">
            <T
              values={{
                count: subjectData.reduce((a, s) => a + s.total, 0),
                subjects: SUBJECTS.length,
              }}
            >
              {"{count} chapters across {subjects} subjects"}
            </T>
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjectData.map(({ meta, total, practiced, testable }, i) => {
            const Icon = SUBJECT_ICONS[meta.icon];
            return (
              <Link
                key={meta.slug}
                href={`/class/${classNo}/${meta.slug}`}
                className="card card-hover vsv-enter group p-5"
                style={{ animationDelay: `${140 + i * 50}ms` }}
              >
                <div className="flex items-start justify-between">
                  <IconBox icon={Icon} tint={meta.tint} size="lg" />
                  <ArrowRight className="h-5 w-5 text-navy-300 transition group-hover:translate-x-1 group-hover:text-navy-700" />
                </div>
                <h3 className="mt-3 text-lg font-bold text-navy-900">
                  <T>{meta.name}</T>
                </h3>
                <p className="text-[13px] font-semibold text-slate-500">
                  <T values={{ total, testable }}>
                    {"{total} chapters · {testable} with assessments"}
                  </T>
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <ProgressBar
                    value={practiced}
                    max={total}
                    className="flex-1"
                  />
                  <span className="text-[12px] font-bold text-navy-600">
                    {practiced}/{total}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <section className="card card-hover vsv-enter p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-navy-900">
            <BookOpenCheck className="h-5 w-5 text-saffron-600" />{" "}
            <T>Assessments available for you</T>
          </h2>
          {testableChapters.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">
              <T>
                Assessments for your class are being uploaded by faculty.
                Check back soon!
              </T>
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {testableChapters.map((c) => (
                <li key={c.key}>
                  <Link
                    href={c.href}
                    className="group flex items-center gap-3 py-2.5"
                  >
                    <span className="rounded-sm bg-navy-50 px-2 py-1 text-[12px] font-bold text-navy-600">
                      {c.subject}
                    </span>
                    <span className="text-[15px] font-semibold text-navy-800 group-hover:text-navy-950 group-hover:underline">
                      {c.label}
                    </span>
                    {c.best ? (
                      <span className="ml-auto rounded-full bg-leaf-50 px-2.5 py-0.5 text-[12px] font-bold text-leaf-700">
                        <T values={{ score: c.best }}>{"Best {score}"}</T>
                      </span>
                    ) : (
                      <span className="ml-auto rounded-full bg-saffron-50 px-2.5 py-0.5 text-[12px] font-bold text-saffron-700">
                        <T>Not attempted</T>
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <RecentActivityCard
          entries={stats.recent.map((e) => ({
            id: e.id,
            note: e.note,
            type: e.type,
            amount: e.amount,
            date: new Date(e.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            }),
          }))}
        />
      </div>

      <p className="mt-6 text-center text-[13px] text-slate-500">
        <T>
          Every chapter carries NCERT learning-outcome IDs (LO-…) and a DIKSHA
          course code — see any chapter page for the full mapping. Questions
          needing help: 1800-11-8004.
        </T>
      </p>
    </div>
  );
}
