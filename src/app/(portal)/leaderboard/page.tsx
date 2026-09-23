import { TranslatedText as T } from "@/components/language-provider";
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
import { Breadcrumbs } from "@/components/ui";

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
      <Breadcrumbs
        items={[
          { href: "/home", label: <T>Home</T> },
          { label: "Leaderboard" },
        ]}
      />
      <div className="vsv-enter flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-saffron-600">
            <T>Peer Benchmarking Engine</T>
          </p>
          <h1 className="mt-1 flex items-center gap-3 text-3xl font-extrabold text-navy-900">
            <Trophy className="h-8 w-8 text-saffron-500" /> <T>Leaderboard</T>
          </h1>
          <p className="mt-1 text-[15px] text-slate-600">
            {user.role === "faculty" ? (
              <T values={{ classNo }}>
                {"Viewing the Class {classNo} board. Switch scope to benchmark any chapter."}
              </T>
            ) : myRank > 0 ? (
              <T values={{ rank: `#${myRank}`, classNo, count: board.length }}>
                {"You are ranked {rank} in Class {classNo} · {count} active learners."}
              </T>
            ) : (
              <T values={{ classNo, count: board.length }}>
                {"You are ranked {rank} in Class {classNo} · {count} active learners."}
              </T>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex rounded-md border border-line bg-white p-1"
            role="tablist"
            aria-label="Class scope"
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
          </div>
        </div>
      </div>

      {/* ── Podium — top three learners ─────────────────────────────── */}
      {board.length >= 3 && (
        <section
          className="vsv-enter mt-6"
          aria-label="Top three learners"
          style={{ animationDelay: "60ms" }}
        >
          <div className="grid grid-cols-3 items-end gap-2.5 sm:gap-4">
            {([1, 0, 2] as const).map((idx) => {
              const r = board[idx];
              const place = idx + 1;
              const me = r.id === user.id;
              const podiumStyles = [
                {
                  card: "border-saffron-400/70 bg-gradient-to-b from-saffron-50 to-white pt-6 sm:pt-7",
                  avatar: "bg-saffron-500 text-navy-950 ring-4 ring-saffron-300/60",
                  base: "h-2.5 sm:h-3 bg-gradient-to-r from-saffron-500 to-saffron-400",
                  rank: "text-saffron-600",
                },
                {
                  card: "border-navy-200 bg-gradient-to-b from-navy-50 to-white pt-4 sm:pt-5",
                  avatar: "bg-navy-300 text-navy-950 ring-4 ring-navy-200/70",
                  base: "h-2 sm:h-2.5 bg-gradient-to-r from-navy-400 to-navy-300",
                  rank: "text-navy-500",
                },
                {
                  card: "border-amber-700/30 bg-gradient-to-b from-amber-50 to-white pt-3.5 sm:pt-4",
                  avatar: "bg-amber-700/80 text-white ring-4 ring-amber-700/20",
                  base: "h-1.5 sm:h-2 bg-gradient-to-r from-amber-700 to-amber-600",
                  rank: "text-amber-800",
                },
              ][idx];
              const initials = r.name
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();
              return (
                <div
                  key={r.id}
                  className={`card card-hover relative flex flex-col items-center rounded-xl border text-center ${podiumStyles.card} ${
                    me ? "ring-2 ring-saffron-500" : ""
                  }`}
                >
                  {place === 1 && (
                    <Trophy
                      className="absolute -top-3.5 left-1/2 h-7 w-7 -translate-x-1/2 text-saffron-500 drop-shadow"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-full text-sm font-extrabold sm:h-14 sm:w-14 sm:text-base ${podiumStyles.avatar}`}
                    aria-hidden="true"
                  >
                    {initials}
                  </span>
                  <p className="mt-2 flex items-center gap-1.5 text-[13px] font-bold text-navy-900 sm:text-[15px]">
                    <span className="truncate">@{r.handle}</span>
                    {me && (
                      <span className="shrink-0 rounded-sm bg-saffron-500 px-1 text-[9px] font-extrabold uppercase text-navy-950">
                        <T>You</T>
                      </span>
                    )}
                  </p>
                  <p className={`text-xl font-extrabold tabular-nums sm:text-2xl ${podiumStyles.rank}`}>
                    {r.xp}
                    <span className="ml-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      XP
                    </span>
                  </p>
                  {r.accuracy !== null && (
                    <p className="text-[11px] font-semibold text-slate-500">
                      <T values={{ accuracy: r.accuracy }}>{"{accuracy}% accuracy"}</T>
                    </p>
                  )}
                  <span
                    className={`mt-3 w-full rounded-b-xl ${podiumStyles.base}`}
                    aria-hidden="true"
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="card vsv-enter overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
            <Medal className="h-5 w-5 text-saffron-600" />
            <h2 className="text-lg font-extrabold text-navy-900">
              <T values={{ classNo }}>
                {"Class-Wide Leaderboard · Class {classNo}"}
              </T>
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
                  <th className="px-4 py-2.5 text-right font-bold">XP</th>
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
            className="card card-hover vsv-enter p-4"
            style={{ animationDelay: "60ms" }}
          >
            <h3 className="flex items-center gap-2 text-[15px] font-extrabold text-navy-900">
              <Target className="h-4 w-4 text-saffron-600" />{" "}
              <T>Chapter-Wise Masters</T>
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
            <section className="card-hover vsv-enter rounded-xl border-2 border-saffron-500/60 bg-white p-4 shadow-sm">
              <h3 className="text-[15px] font-extrabold text-navy-900">
                <T values={{ num: chapterMeta.num, title: chapterMeta.title }}>
                  {"Top Performers · Ch {num}: {title}"}
                </T>
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
                              <span className="text-saffron-600"> (<T>you</T>)</span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            <T
                              values={{
                                score: r.bestScore ?? "—",
                                total: r.bestTotal ?? "—",
                                count: r.attempts,
                              }}
                            >
                              {r.attempts === 1
                                ? "best {score}/{total} · {count} attempt"
                                : "best {score}/{total} · {count} attempts"}
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
