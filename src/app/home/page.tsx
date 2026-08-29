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
  History,
  ClipboardCheck,
} from "lucide-react";
import { getActiveUser } from "@/lib/session";
import { db } from "@/db";
import { chapters, notes } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { SUBJECTS, getChapters } from "@/lib/curriculum";
import { getClassLeaderboard, getChapterList, getUserStats } from "@/lib/queries";
import { IconBox, ProgressBar, StatCard, SUBJECT_ICONS } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getActiveUser();
  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <meta httpEquiv="refresh" content="2" />
        <h1 className="text-2xl font-extrabold text-navy-900">Portal is starting</h1>
        <p className="mt-2 text-[15px] text-slate-600">
          Loading the learning database… this page will refresh automatically.
        </p>
      </div>
    );
  }

  const classNo = user.className ?? 8;
  const stats = await getUserStats(user.id, classNo);

  const subjectData = [];
  const testableChapters = [];
  for (const s of SUBJECTS) {
    const list = await getChapterList(classNo, s.slug, user.id);
    const practiced = list.filter((c) => c.bestScore !== null).length;
    const testable = list.filter((c) => c.mcqCount > 0 || c.subjCount > 0).length;
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

  let facultyQueue: { id: number; title: string; chapter: string; author: string }[] = [];
  if (user.role === "faculty") {
    const pending = await db
      .select({
        id: notes.id,
        title: notes.title,
        authorName: notes.authorName,
        chapterTitle: chapters.title,
        subjectName: chapters.subjectName,
        classNo: chapters.classNo,
        chapterNum: chapters.num,
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
      chapter: `Class ${p.classNo} · ${p.chapterTitle}`,
    }));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="vsv-enter flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-saffron-600">
            {user.role === "faculty" ? "Faculty Console" : `Class ${classNo} · Student Dashboard`}
          </p>
          <h1 className="mt-1 text-3xl font-extrabold text-navy-900">
            {user.role === "faculty" ? `Welcome, ${user.name}` : `Namaste, ${user.name.split(" ")[0]}!`}
          </h1>
          <p className="mt-1 text-[15px] text-slate-600">
            {user.school ?? user.subjectSpecialization}
            {user.state ? ` · ${user.state}` : ""}
            {user.isGuest && (
              <span className="ml-2 rounded-sm bg-saffron-100 px-1.5 py-0.5 text-[12px] font-bold text-saffron-700">
                Guest session
              </span>
            )}
          </p>
        </div>
        <Link
          href="/leaderboard"
          className="inline-flex items-center gap-2 rounded-md bg-navy-800 px-4 py-2.5 text-[15px] font-bold text-white transition hover:bg-navy-700"
        >
          <Trophy className="h-4 w-4 text-saffron-400" /> View Leaderboard
        </Link>
      </div>

      <div className="vsv-enter mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4" style={{ animationDelay: "60ms" }}>
        <StatCard icon={Zap} label="Total XP" value={stats.xp} tone="saffron" sub={user.role === "faculty" ? "Content contribution" : "Earn it in every test"} />
        <StatCard
          icon={Medal}
          label="Class Rank"
          value={stats.rank ? `#${stats.rank}` : "—"}
          sub={`Class ${classNo} · all subjects`}
        />
        <StatCard
          icon={Target}
          label="Accuracy"
          value={stats.accuracy !== null ? `${stats.accuracy}%` : "—"}
          sub={`${stats.objectiveAttempts} objective test${stats.objectiveAttempts === 1 ? "" : "s"} attempted`}
        />
        <StatCard icon={Sparkles} label="Notes Shared" value={stats.notes} sub="Community contributions" />
      </div>

      {user.role === "faculty" && (
        <section className="vsv-enter mt-6 rounded-lg border border-saffron-200 bg-white p-5 shadow-sm" style={{ animationDelay: "100ms" }}>
          <h2 className="flex items-center gap-2 text-lg font-bold text-navy-900">
            <ShieldCheck className="h-5 w-5 text-saffron-600" /> Moderation queue
            <span className="rounded-full bg-saffron-100 px-2 py-0.5 text-[12px] font-bold text-saffron-700">
              {facultyQueue.length} awaiting review
            </span>
          </h2>
          {facultyQueue.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">
              All community notes are verified. New submissions will appear here.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {facultyQueue.map((n) => (
                <li key={n.id} className="flex flex-wrap items-center gap-2 py-2.5 text-[15px]">
                  <ClipboardCheck className="h-4 w-4 text-navy-400" />
                  <span className="font-bold text-navy-900">{n.title}</span>
                  <span className="text-sm text-slate-500">by {n.author}</span>
                  <span className="ml-auto rounded-sm bg-navy-50 px-2 py-0.5 text-[12px] font-semibold text-navy-600">
                    {n.chapter}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[13px] text-slate-500">
            Open any chapter’s Notes section and use the one-click <b>Verify</b> toggle — verified
            notes jump to the top with a green tick.
          </p>
        </section>
      )}

      <section className="vsv-enter mt-8" style={{ animationDelay: "140ms" }}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-navy-900">
            {classNo === 7 ? "Class 7" : "Class 8"} · NCERT Subjects
          </h2>
          <span className="text-[13px] font-semibold text-slate-500">
            {subjectData.reduce((a, s) => a + s.total, 0)} chapters across 6 subjects
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjectData.map(({ meta, total, practiced, testable }, i) => {
            const Icon = SUBJECT_ICONS[meta.icon];
            return (
              <Link
                key={meta.slug}
                href={`/class/${classNo}/${meta.slug}`}
                className="vsv-enter group rounded-lg border border-line bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-navy-300 hover:shadow-md"
                style={{ animationDelay: `${140 + i * 50}ms` }}
              >
                <div className="flex items-start justify-between">
                  <IconBox icon={Icon} tint={meta.tint} size="lg" />
                  <ArrowRight className="h-5 w-5 text-navy-300 transition group-hover:translate-x-1 group-hover:text-navy-700" />
                </div>
                <h3 className="mt-3 text-lg font-bold text-navy-900">{meta.name}</h3>
                <p className="text-[13px] font-semibold text-slate-500">
                  {total} chapters · {testable} with assessments
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <ProgressBar value={practiced} max={total} className="flex-1" />
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
        <section className="vsv-enter rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-bold text-navy-900">
            <BookOpenCheck className="h-5 w-5 text-saffron-600" /> Assessments available for you
          </h2>
          {testableChapters.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">
              Assessments for your class are being uploaded by faculty. Check back soon!
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {testableChapters.map((c) => (
                <li key={c.key}>
                  <Link href={c.href} className="group flex items-center gap-3 py-2.5">
                    <span className="rounded-sm bg-navy-50 px-2 py-1 text-[12px] font-bold text-navy-600">
                      {c.subject}
                    </span>
                    <span className="text-[15px] font-semibold text-navy-800 group-hover:text-navy-950 group-hover:underline">
                      {c.label}
                    </span>
                    {c.best ? (
                      <span className="ml-auto rounded-full bg-leaf-50 px-2.5 py-0.5 text-[12px] font-bold text-leaf-700">
                        Best {c.best}
                      </span>
                    ) : (
                      <span className="ml-auto rounded-full bg-saffron-50 px-2.5 py-0.5 text-[12px] font-bold text-saffron-700">
                        Not attempted
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="vsv-enter rounded-lg border border-line bg-white p-5 shadow-sm" style={{ animationDelay: "80ms" }}>
          <h2 className="flex items-center gap-2 text-lg font-bold text-navy-900">
            <History className="h-5 w-5 text-saffron-600" /> Recent XP activity
          </h2>
          {stats.recent.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">
              No activity yet. Take your first objective test to start earning XP!
            </p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {stats.recent.map((e) => (
                <li key={e.id} className="flex items-start gap-3">
                  <span className="mt-0.5 rounded-md bg-saffron-50 px-2 py-0.5 text-[13px] font-extrabold text-saffron-700">
                    +{e.amount}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-navy-800">{e.note}</p>
                    <p className="text-[12px] text-slate-500">
                      {e.type} · {new Date(e.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="mt-6 text-center text-[13px] text-slate-500">
        {`Chapter metadata is mapped to NCERT learning-outcome IDs (LO-…) and DIKSHA codes — see any chapter page for the full mapping.`}
      </p>
    </div>
  );
}
