import { TranslatedText as T } from "@/components/language-provider";
import { TranslatedElement } from "@/components/translated-element";
import { DatabaseSetup } from "@/components/database-setup";
import Link from "next/link";

import { Award, Medal, Target, Trophy } from "lucide-react";
import { getActiveUser } from "@/lib/session";
import { db } from "@/db";
import { chapters, mcqAttempts } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getClassLeaderboard, getChapterLeaderboard } from "@/lib/queries";
import { BADGES } from "@/lib/badges";
import { CLASSES, classNumber } from "@/lib/curriculum";

export const dynamic = "force-dynamic";

const MEDALS = [
  "bg-saffron-500 text-navy-950",
  "bg-navy-200 text-navy-900",
  "bg-amber-800/70 text-white",
];

export default async function Leaderboard({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; chapter?: string }>;
}) {
  const user = await getActiveUser();
  if (!user) return <DatabaseSetup />;
  const { class: classParam, chapter: chapterParam } = await searchParams;

  const classNo = classNumber(classParam) ?? classNumber(user.className ?? 8) ?? 8;

  const board = await getClassLeaderboard(classNo);

  // chapters that have any attempts, for this class
  const chapterOpts = await db
    .select({
      id: chapters.id,
      title: chapters.title,
      subjectName: chapters.subjectName,
      num: chapters.num,
    })
    .from(mcqAttempts)
    .innerJoin(chapters, eq(mcqAttempts.chapterId, chapters.id))
    .where(inArray(chapters.classNo, [classNo]))
    .orderBy(chapters.num);
  const seen = new Set<number>();
  const opts = chapterOpts.filter((c) =>
    seen.has(c.id) ? false : (seen.add(c.id), true),
  );

  const chapterId = chapterParam ? Number(chapterParam) : null;
  const chapterBoard =
    chapterId && !Number.isNaN(chapterId)
      ? await getChapterLeaderboard(chapterId)
      : null;
  const chapterMeta =
    chapterBoard && chapterId
      ? (opts.find((o) => o.id === chapterId) ??
        (
          await db
            .select()
            .from(chapters)
            .where(eq(chapters.id, chapterId))
            .limit(1)
        )[0])
      : null;

  const myRank = board.findIndex((r) => r.id === user.id) + 1;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="vsv-enter flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-saffron-600">
            <T>Peer Benchmarking Engine</T>
          </p>
          <h1 className="mt-1 flex items-center gap-3 text-3xl font-extrabold text-navy-900">
            <Trophy className="h-8 w-8 text-saffron-500" /> <T>Leaderboard</T>
          </h1>
          <p className="mt-1 text-[15px] text-slate-600">
            {user.role === "faculty"
              ? `Viewing the Class ${classNo} board. Switch scope to benchmark any chapter.`
              : `You are ranked ${myRank > 0 ? `#${myRank}` : "outside the top list"} in Class ${classNo} · ${board.length} active learners.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TranslatedElement
            as="div"
            label="Class scope"
            role="tablist"
            className="flex rounded-md border border-line bg-white p-1"
          >
            {[...CLASSES].map((c) => (
              <Link
                key={c}
                href={`/leaderboard?class=${c}${chapterId ? `&chapter=${chapterId}` : ""}`}
                role="tab"
                aria-selected={classNo === c}
                className={`rounded px-4 py-1.5 text-sm font-bold transition ${
                  classNo === c
                    ? "bg-navy-800 text-white"
                    : "text-navy-600 hover:text-navy-900"
                }`}
              >
                <T>Class</T> {c}
              </Link>
            ))}
          </TranslatedElement>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="vsv-enter rounded-lg border border-line bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
            <Medal className="h-5 w-5 text-saffron-600" />
            <h2 className="text-lg font-extrabold text-navy-900">
              <T values={{ classNo }}>{"Class-Wide Leaderboard · Class {classNo}"}</T>
            </h2>
            <span className="ml-auto text-[12px] font-bold uppercase tracking-wide text-slate-400">
              <T>XP · accuracy · badges</T>
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[14px]">
              <thead>
                <tr className="border-b border-line bg-navy-50/70 text-[12px] uppercase tracking-wide text-navy-500">
                  <th className="px-4 py-2.5 font-bold">
                    <T>Rank</T>
                  </th>
                  <th className="px-4 py-2.5 font-bold">
                    <T>Learner</T>
                  </th>
                  <th className="px-4 py-2.5 font-bold">
                    <T>Badges</T>
                  </th>
                  <th className="px-4 py-2.5 text-right font-bold">
                    <T>Tests</T>
                  </th>
                  <th className="px-4 py-2.5 text-right font-bold">
                    <T>Accuracy</T>
                  </th>
                  <th className="px-4 py-2.5 text-right font-bold">
                    <T>XP</T>
                  </th>
                </tr>
              </thead>
              <tbody>
                {board.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      <T>No learners in this class yet.</T>
                    </td>
                  </tr>
                )}
                {board.map((r, i) => {
                  const me = r.id === user.id;
                  return (
                    <tr
                      key={r.id}
                      className={`border-b border-line/70 last:border-0 ${
                        me
                          ? "bg-saffron-50/80"
                          : i % 2
                            ? "bg-paper/60"
                            : "bg-white"
                      }`}
                    >
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-extrabold ${
                            i < 3 ? MEDALS[i] : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="font-bold text-navy-900">
                          @{r.handle}
                          {me && (
                            <span className="ml-1.5 rounded-sm bg-saffron-500 px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-navy-950">
                              <T>You</T>
                            </span>
                          )}
                        </p>
                        <p className="text-[12px] text-slate-500">
                          {r.name}
                          {r.school ? ` · ${r.school}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex max-w-56 flex-wrap gap-1">
                          {r.badges.length === 0 ? (
                            <span className="text-[12px] text-slate-400">
                              —
                            </span>
                          ) : (
                            r.badges.slice(0, 2).map((b) => (
                              <span
                                key={b}
                                title={BADGES[b]?.desc}
                                className="inline-flex items-center gap-1 rounded-full border border-saffron-200 bg-saffron-50 px-2 py-0.5 text-[11px] font-bold text-saffron-700"
                              >
                                <Award className="h-3 w-3" /> {BADGES[b]?.name}
                              </span>
                            ))
                          )}
                          {r.badges.length > 2 && (
                            <span className="text-[11px] font-bold text-slate-400">
                              +{r.badges.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-navy-700">
                        {r.attempts}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {r.accuracy !== null ? (
                          <span
                            className={`font-extrabold ${r.accuracy >= 80 ? "text-leaf-600" : r.accuracy >= 50 ? "text-saffron-600" : "text-rose-500"}`}
                          >
                            {r.accuracy}%
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-lg font-extrabold text-navy-900">
                        {r.xp}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-4">
          <section
            className="vsv-enter rounded-lg border border-line bg-white p-4 shadow-sm"
            style={{ animationDelay: "60ms" }}
          >
            <h3 className="flex items-center gap-2 text-[15px] font-extrabold text-navy-900">
              <Target className="h-4 w-4 text-saffron-600" /> <T>Chapter-Wise Masters</T>
            </h3>
            <p className="mt-1 text-[13px] text-slate-500">
              <T>Ranks based solely on test performance in a single chapter.</T>
            </p>
            <div className="mt-3 space-y-1.5">
              {opts.length === 0 ? (
                <p className="text-[13px] text-slate-400">
                  <T values={{ classNo }}>
                    {"No assessed chapters in Class {classNo} yet."}
                  </T>
                </p>
              ) : (
                opts.map((o) => (
                  <Link
                    key={o.id}
                    href={`/leaderboard?class=${classNo}&chapter=${o.id}`}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-[13px] font-bold transition ${
                      chapterId === o.id
                        ? "border-navy-800 bg-navy-800 text-white"
                        : "border-line bg-white text-navy-700 hover:border-navy-300"
                    }`}
                  >
                    <span className="truncate">
                      Ch {o.num} · {o.title}
                    </span>
                    <span
                      className={`ml-auto shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-extrabold uppercase ${
                        chapterId === o.id
                          ? "bg-saffron-500 text-navy-950"
                          : "bg-navy-50 text-navy-500"
                      }`}
                    >
                      {o.subjectName}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </section>

          {chapterBoard && chapterMeta && (
            <section className="vsv-enter rounded-lg border-2 border-saffron-500/60 bg-white p-4 shadow-sm">
              <h3 className="text-[15px] font-extrabold text-navy-900">
                Top Performers · Ch {chapterMeta.num}: {chapterMeta.title}
              </h3>
              <p className="text-[12px] font-semibold text-slate-500">
                {chapterMeta.subjectName}
              </p>
              {chapterBoard.length === 0 ? (
                <p className="mt-3 text-[13px] text-slate-500">
                  <T>No attempts on this chapter yet.</T>
                </p>
              ) : (
                <ol className="mt-3 space-y-2">
                  {chapterBoard.slice(0, 8).map((r, i) => {
                    const me = r.id === user.id;
                    return (
                      <li
                        key={r.id}
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${
                          me ? "bg-saffron-50 ring-1 ring-saffron-300" : ""
                        }`}
                      >
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold ${
                            i < 3 ? MEDALS[i] : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-navy-800">
                            @{r.handle}
                            {me && (
                              <span className="text-saffron-600">
                                {" "}
                                <T>(you)</T>
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            <T
                              values={{
                                score: r.bestScore ?? "—",
                                total: r.bestTotal ?? "—",
                                attempts: r.attempts,
                              }}
                            >
                              {"best {score}/{total} · {attempts} attempt(s)"}
                            </T>
                          </p>
                        </div>
                        <span className="ml-auto shrink-0 text-[14px] font-extrabold text-navy-800">
                          {r.chapterXp}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}
              <Link
                href={`/leaderboard?class=${classNo}`}
                className="mt-3 block text-center text-[12px] font-bold text-navy-500 hover:text-navy-800 hover:underline"
              >
                <T>Clear chapter filter</T>
              </Link>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
