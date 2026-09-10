import { TranslatedText as T } from "@/components/language-provider";
import { DatabaseSetup } from "@/components/database-setup";
import { FacultyReviewQueue } from "@/components/faculty-review-queue";
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
  Megaphone,
  BadgeCheck,
  Clock3,
} from "lucide-react";
import { getActiveUser } from "@/lib/session";
import { db } from "@/db";
import { chapters, notes } from "@/db/schema";
import { count, desc, eq } from "drizzle-orm";
import { CLASSES, SUBJECTS, classLabel } from "@/lib/curriculum";
import {
  canModerateNotes,
  verificationLabel,
} from "@/lib/faculty-email";
import { getPendingFaculty } from "@/lib/faculty-verification";
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
    tag: "Faculty",
    title: "Email verification is mandatory for faculty accounts",
    body: "Teachers must confirm their institutional email ID before they can verify community notes.",
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
  const canModerate = canModerateNotes(user);

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

  const pendingFaculty = canModerate ? await getPendingFaculty(5) : [];

  const verificationTone =
    user.verificationStatus === "verified"
      ? "border-leaf-500/50 bg-leaf-50 text-leaf-700"
      : user.verificationStatus === "pending_review"
        ? "border-saffron-300 bg-saffron-50 text-saffron-700"
        : "border-rose-200 bg-rose-50 text-rose-700";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="vsv-enter flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-saffron-600">
            <T values={{ classNo }}>
              {isFaculty
                ? "Faculty Console"
                : "Class {classNo} · Student Dashboard"}
            </T>
          </p>
          <h1 className="mt-1 text-3xl font-extrabold text-navy-900">
            <T
              values={{
                name: isFaculty ? user.name : user.name.split(" ")[0],
              }}
            >
              {isFaculty ? "Welcome, {name}" : "Namaste, {name}!"}
            </T>
          </h1>
          <p className="mt-1 text-[15px] text-slate-600">
            {user.school ?? user.subjectSpecialization}
            {user.state ? ` · ${user.state}` : ""}
            {user.isGuest && (
              <span className="ml-2 rounded-sm bg-navy-100 px-1.5 py-0.5 text-[12px] font-bold text-navy-700">
                <T>Guest access</T>
              </span>
            )}
          </p>
          <p className="mt-0.5 text-[13px] text-slate-500">
            <T>
              Department of School Education &amp; Literacy · National Digital
              Learning Portal
            </T>
          </p>
        </div>
        <Link
          href="/leaderboard"
          className="inline-flex items-center gap-2 rounded-md bg-navy-800 px-4 py-2.5 text-[15px] font-bold text-white transition hover:bg-navy-700"
        >
          <Trophy className="h-4 w-4 text-saffron-400" />{" "}
          <T>View Leaderboard</T>
        </Link>
      </div>

      {isFaculty && (
        <section
          className={`vsv-enter mt-5 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 ${verificationTone}`}
        >
          {user.verificationStatus === "verified" ? (
            <BadgeCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
          ) : (
            <Clock3 className="h-5 w-5 shrink-0" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <p className="text-[15px] font-extrabold">
              <T>{verificationLabel(user.verificationStatus)}</T>
              <span className="ml-2 font-semibold opacity-80">{user.email}</span>
            </p>
            <p className="text-[13px] font-semibold opacity-90">
              <T>
                {user.verificationStatus === "verified"
                  ? "Your institutional mailbox is confirmed — you can verify community notes and review pending teachers."
                  : user.verificationStatus === "pending_review"
                    ? "Your mailbox is confirmed. A verified reviewer will confirm your institution before note verification is unlocked."
                    : "Verify your email ID to continue using the faculty console."}
              </T>
            </p>
          </div>
        </section>
      )}

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

      {isFaculty && (
        <section
          className="vsv-enter mt-6 rounded-lg border border-saffron-200 bg-white p-5 shadow-sm"
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

          {canModerate && (
            <div className="mt-5 border-t border-line pt-4">
              <h3 className="flex items-center gap-2 text-[15px] font-bold text-navy-900">
                <BadgeCheck className="h-4 w-4 text-saffron-600" />
                <T>Teachers awaiting institutional confirmation</T>
                <span className="rounded-full bg-navy-50 px-2 py-0.5 text-[12px] font-bold text-navy-600">
                  {pendingFaculty.length}
                </span>
              </h3>
              <FacultyReviewQueue initial={pendingFaculty} />
            </div>
          )}
        </section>
      )}

      <div className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <section className="vsv-enter rounded-lg border border-line bg-white p-5 shadow-sm">
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
          className="vsv-enter rounded-lg border border-line bg-white p-5 shadow-sm"
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
                className="vsv-enter group rounded-lg border border-line bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-navy-300 hover:shadow-md"
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
        <section className="vsv-enter rounded-lg border border-line bg-white p-5 shadow-sm">
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

        <section
          className="vsv-enter rounded-lg border border-line bg-white p-5 shadow-sm"
          style={{ animationDelay: "80ms" }}
        >
          <h2 className="flex items-center gap-2 text-lg font-bold text-navy-900">
            <History className="h-5 w-5 text-saffron-600" />{" "}
            <T>Recent XP activity</T>
          </h2>
          {stats.recent.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">
              <T>
                No activity yet. Take your first objective test to start earning
                XP!
              </T>
            </p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {stats.recent.map((e) => (
                <li key={e.id} className="flex items-start gap-3">
                  <span className="mt-0.5 rounded-md bg-saffron-50 px-2 py-0.5 text-[13px] font-extrabold text-saffron-700">
                    +{e.amount}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-navy-800">
                      {e.note}
                    </p>
                    <p className="text-[12px] text-slate-500">
                      {e.type} ·{" "}
                      {new Date(e.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
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
