"use client";

/**
 * The teacher heatmap.
 *
 * Rows are the class, columns are NCERT learning outcomes, and a cell is a
 * learner's mastery of one outcome computed from the answers they actually
 * submitted. Clicking a column opens the evidence: which wrong option the group
 * chose, how many learners share that idea, and the textbook paragraph to
 * reteach from. Nothing here is a black box — that is the point.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Users, CheckCircle2, CircleDashed, Info, MapPin, ChevronRight } from "lucide-react";
import { masteryTone, type MasteryLevel } from "@/lib/outcomes/mastery";

export type HeatmapCell = {
  code: string;
  level: MasteryLevel;
  accuracy: number;
  confidence: "low" | "medium" | "high";
};

export type HeatmapOutcome = {
  code: string;
  concept: string;
  statement: string;
  textbookPage: number;
  kind: string;
  rosterSize: number;
  attempted: number;
  secure: number;
  developing: number;
  needsHelp: number;
  notStarted: number;
  notUnderstood: number;
  notUnderstoodPct: number;
  confidence: "low" | "medium" | "high";
  headline: string;
  topMistake: {
    questionId: number;
    qtext: string;
    chosenIndex: number;
    chosenText: string;
    correctText: string;
    count: number;
    misconception: string | null;
  } | null;
  misconceptions: string[];
  evidence: {
    questionId: number;
    qtext: string;
    answered: number;
    correct: number;
    chosen: { optionIndex: number; text: string; count: number; isCorrect: boolean }[];
    misconception: string | null;
  }[];
};

export type HeatmapStudent = {
  id?: number;
  label: string;
  handle: string | null;
  secureCount: number;
  needsHelpCount: number;
  cells: HeatmapCell[];
};

export type Cluster = {
  label: string;
  misconception: string | null;
  chosenText: string;
  count: number;
  reteach: string;
};

export type ReteachCitation = { code: string; label: string; snippet: string; href: string };

export function MasteryHeatmap({
  chapterTitle,
  classNo,
  rosterSize,
  attemptedStudents,
  named,
  outcomes,
  students,
  clusters,
  reteach,
  focusCode,
  sourceLinkBase,
}: {
  chapterTitle: string;
  classNo: number;
  rosterSize: number;
  attemptedStudents: number;
  named: boolean;
  outcomes: HeatmapOutcome[];
  students: HeatmapStudent[];
  clusters: Record<string, Cluster[]>;
  reteach: Record<string, ReteachCitation[]>;
  focusCode: string | null;
  sourceLinkBase: string;
}) {
  const [focus, setFocus] = useState<string | null>(focusCode ?? outcomes[0]?.code ?? null);
  const [hover, setHover] = useState<{ student: string; code: string } | null>(null);
  const focused = useMemo(
    () => outcomes.find((outcome) => outcome.code === focus) ?? outcomes[0] ?? null,
    [focus, outcomes],
  );

  if (outcomes.length === 0)
    return (
      <div className="rounded-lg border border-line bg-white p-6">
        <h2 className="text-lg font-extrabold text-navy-900">
          This chapter has no learning-outcome map yet
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Mastery colours are only shown for outcomes that exist. For this
          chapter a teacher can draft the outcomes in the content studio — the
          generated question bank is then tagged to them automatically — or paste
          the official NCERT outcome statements.
        </p>
        <Link
          href="/faculty/studio"
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-navy-800 px-4 py-2 text-sm font-bold text-white hover:bg-navy-700"
        >
          Open the content studio <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    );

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {outcomes
          .slice()
          .sort((a, b) => b.notUnderstood - a.notUnderstood)
          .slice(0, 3)
          .map((outcome) => (
            <button
              key={outcome.code}
              type="button"
              onClick={() => setFocus(outcome.code)}
              className={`rounded-lg border p-4 text-left transition ${
                focus === outcome.code
                  ? "border-saffron-500 bg-saffron-50 shadow-sm"
                  : "border-line bg-white hover:border-saffron-300"
              }`}
            >
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                <MapPin className="h-3 w-3" /> {outcome.code} · page {outcome.textbookPage}
              </p>
              <p className="mt-1.5 text-[15px] font-extrabold leading-snug text-navy-900">
                {outcome.headline}
              </p>
              <p className="mt-2 text-[12.5px] text-slate-600">
                {outcome.needsHelp} need help · {outcome.developing} developing ·{" "}
                {outcome.secure} secure
                {outcome.notStarted > 0 ? ` · ${outcome.notStarted} not attempted` : ""}
              </p>
              {outcome.topMistake && (
                <p className="mt-2 rounded-md bg-rose-50 px-2 py-1.5 text-[12px] font-semibold text-rose-800">
                  Most common: {outcome.topMistake.count} chose “{outcome.topMistake.chosenText}”
                </p>
              )}
            </button>
          ))}
      </section>

      <section className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <h2 className="text-[15px] font-extrabold text-navy-900">
              Class {classNo} · {chapterTitle} — mastery by learning outcome
            </h2>
            <p className="text-[12.5px] text-slate-500">
              {attemptedStudents} of {rosterSize} learners have attempted ·{" "}
              {named
                ? "verified faculty view with names"
                : "aggregate view — learner names are hidden until a verified faculty signs in"}
            </p>
          </div>
          <Legend />
        </header>

        <div className="max-h-[540px] overflow-auto">
          <table className="w-full border-separate border-spacing-0 text-left">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 top-0 z-20 min-w-[168px] border-b border-r border-line bg-navy-50 px-3 py-2 text-[11.5px] font-extrabold uppercase tracking-wide text-navy-700"
                >
                  Learner
                </th>
                {outcomes.map((outcome) => (
                  <th
                    key={outcome.code}
                    scope="col"
                    className="sticky top-0 z-10 border-b border-line bg-navy-50 px-1.5 py-2 align-bottom"
                  >
                    <button
                      type="button"
                      onClick={() => setFocus(outcome.code)}
                      title={outcome.statement}
                      className={`h-full w-full min-w-[86px] rounded px-1.5 py-1 text-left text-[11.5px] font-bold leading-tight ${
                        focus === outcome.code
                          ? "bg-navy-800 text-white"
                          : "text-navy-700 hover:bg-white"
                      }`}
                    >
                      {outcome.concept}
                      <span className="mt-0.5 block text-[10.5px] font-semibold opacity-70">
                        {outcome.notUnderstood}/{outcome.rosterSize} not yet
                      </span>
                    </button>
                  </th>
                ))}
                <th
                  scope="col"
                  className="sticky top-0 z-10 border-b border-l border-line bg-navy-50 px-2 py-2 text-[11px] font-extrabold uppercase text-navy-700"
                >
                  Secure
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.label} className="hover:bg-navy-50/40">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 border-b border-r border-line bg-white px-3 py-1.5 text-[12.5px] font-bold text-navy-800"
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy-100 text-[10px] font-extrabold text-navy-700">
                        {student.label
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                      <span className="truncate">{student.label}</span>
                    </span>
                  </th>
                  {student.cells.map((cell) => {
                    const tone = masteryTone(cell.level);
                    return (
                      <td
                        key={cell.code}
                        className="border-b border-line p-0.5"
                        onMouseEnter={() => setHover({ student: student.label, code: cell.code })}
                        onMouseLeave={() => setHover(null)}
                      >
                        <button
                          type="button"
                          onClick={() => setFocus(cell.code)}
                          aria-label={`${student.label}: ${cell.code} ${tone.label}, ${cell.accuracy}% correct`}
                          className={`h-7 w-full rounded ${tone.cell} text-[10.5px] font-bold transition hover:ring-2 hover:ring-navy-400`}
                          title={`${student.label} · ${cell.code} · ${tone.label} · ${cell.accuracy}% correct on ${cell.confidence} evidence`}
                        >
                          {cell.level === "not_started" ? "—" : `${cell.accuracy}%`}
                        </button>
                      </td>
                    );
                  })}
                  <td className="border-b border-l border-line px-2 text-center text-[12.5px] font-extrabold text-navy-700">
                    {student.secureCount}
                    {student.needsHelpCount > 0 && (
                      <span className="ml-1 text-rose-600">/ {student.needsHelpCount}!</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <footer className="border-t border-line bg-paper px-4 py-2 text-[11.5px] text-slate-500">
          {hover
            ? `${hover.student} → ${outcomes.find((o) => o.code === hover.code)?.concept}`
            : "Percentages are correct answers on the questions mapped to that outcome. “—” means no attempt: absence is never shown as failure."}
        </footer>
      </section>

      {focused && (
        <section className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
          <article className="rounded-lg border border-line bg-white p-4 shadow-sm">
            <h3 className="flex items-center gap-2 text-[15px] font-extrabold text-navy-900">
              <Info className="h-4 w-4 text-saffron-600" /> Why is {focused.concept} flagged?
            </h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-navy-800">{focused.statement}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-[12.5px] sm:grid-cols-4">
              <Stat label="Secure" value={focused.secure} tone="leaf" />
              <Stat label="Developing" value={focused.developing} tone="amber" />
              <Stat label="Needs help" value={focused.needsHelp} tone="rose" />
              <Stat label="Not attempted" value={focused.notStarted} tone="slate" />
            </dl>
            <p className="mt-3 rounded-md border border-line bg-paper px-3 py-2 text-[12px] text-slate-600">
              Evidence quality: <strong>{focused.confidence}</strong> —{" "}
              {focused.evidence.length} question
              {focused.evidence.length === 1 ? "" : "s"} in the bank carry this outcome
              {focused.confidence === "low"
                ? ". Add more tagged questions for a firmer judgement."
                : "."}
            </p>

            <h4 className="mt-4 text-[13px] font-extrabold uppercase tracking-wide text-slate-500">
              Question by question
            </h4>
            <ul className="mt-2 space-y-3">
              {focused.evidence.map((question) => (
                <li key={question.questionId} className="rounded-md border border-line p-3">
                  <p className="text-[13px] font-bold text-navy-900">{question.qtext}</p>
                  <p className="mt-1 text-[11.5px] text-slate-500">
                    {question.correct} of {question.answered} answered correctly
                  </p>
                  <ul className="mt-2 space-y-1">
                    {question.chosen.map((option) => (
                      <li
                        key={option.optionIndex}
                        className="flex items-center justify-between gap-2 text-[12.5px]"
                      >
                        <span className={option.isCorrect ? "text-leaf-700" : "text-rose-700"}>
                          {option.isCorrect ? <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" /> : null}
                          {option.text}
                        </span>
                        <span className="shrink-0 font-bold text-navy-700">
                          {option.count} learner{option.count === 1 ? "" : "s"}
                        </span>
                      </li>
                    ))}
                    {question.chosen.length === 0 && (
                      <li className="text-[12.5px] text-leaf-700">
                        <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" /> Everyone who answered got this
                        right.
                      </li>
                    )}
                  </ul>
                </li>
              ))}
            </ul>
          </article>

          <div className="space-y-4">
            <article className="rounded-lg border border-saffron-200 bg-saffron-50/60 p-4">
              <h3 className="flex items-center gap-2 text-[15px] font-extrabold text-navy-900">
                <Users className="h-4 w-4 text-saffron-700" /> Group this by wrong idea
              </h3>
              <p className="mt-1 text-[12.5px] text-slate-600">
                One cluster usually means one short reteach, not a whole period.
              </p>
              <ul className="mt-3 space-y-3">
                {(clusters[focused.code] ?? []).map((cluster) => (
                  <li
                    key={cluster.label}
                    className="rounded-md border border-saffron-200 bg-white p-3"
                  >
                    <p className="flex items-start gap-2 text-[13px] font-bold text-navy-900">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" />
                      {cluster.count} learner{cluster.count === 1 ? "" : "s"} — {cluster.label}
                    </p>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-600">
                      {cluster.reteach}
                    </p>
                  </li>
                ))}
                {(clusters[focused.code] ?? []).length === 0 && (
                  <li className="rounded-md border border-line bg-white p-3 text-[12.5px] text-slate-500">
                    <CircleDashed className="mr-1 inline h-3.5 w-3.5" />
                    Everyone who attempted has secured this outcome.
                  </li>
                )}
              </ul>
            </article>

            <article className="rounded-lg border border-navy-200 bg-navy-800 p-4 text-white">
              <h3 className="text-[15px] font-extrabold">Reteach from a source, not from memory</h3>
              <ul className="mt-3 space-y-2">
                {(reteach[focused.code] ?? []).map((citation) => (
                  <li key={citation.label + citation.snippet.slice(0, 12)}>
                    <Link
                      href={citation.href}
                      className="block rounded-md bg-navy-900/60 p-2.5 transition hover:bg-navy-900"
                    >
                      <span className="block text-[11.5px] font-extrabold uppercase tracking-wide text-saffron-300">
                        {citation.label}
                      </span>
                      <span className="mt-1 block text-[12.5px] text-navy-100">
                        “{citation.snippet}”
                      </span>
                    </Link>
                  </li>
                ))}
                {(reteach[focused.code] ?? []).length === 0 && (
                  <li className="text-[12.5px] text-navy-100">
                    No indexed source yet for this outcome — add the textbook page in the content
                    studio and it will appear here.
                  </li>
                )}
              </ul>
              {focused.misconceptions.length > 0 && (
                <p className="mt-3 text-[12px] text-navy-200">
                  Watch for: {focused.misconceptions.join(" · ")}
                </p>
              )}
              <Link
                href={`${sourceLinkBase}?tab=revision`}
                className="mt-4 block rounded-md bg-saffron-500 py-2 text-center text-[13px] font-extrabold text-navy-950 hover:bg-saffron-400"
              >
                Print the revision sheet for this chapter
              </Link>
            </article>
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "leaf" | "amber" | "rose" | "slate" }) {
  const tones = {
    leaf: "border-leaf-500/40 bg-leaf-50 text-leaf-700",
    amber: "border-amber-400/50 bg-amber-50 text-amber-800",
    rose: "border-rose-300 bg-rose-50 text-rose-700",
    slate: "border-slate-200 bg-slate-50 text-slate-500",
  };
  return (
    <div className={`rounded-md border px-3 py-2 ${tones[tone]}`}>
      <dt className="text-[11px] font-bold uppercase tracking-wide opacity-80">{label}</dt>
      <dd className="text-lg font-extrabold">{value}</dd>
    </div>
  );
}

function Legend() {
  const entries: { level: MasteryLevel; label: string }[] = [
    { level: "secure", label: "Secure ≥80%" },
    { level: "developing", label: "Developing 50–79%" },
    { level: "needs_help", label: "Needs help <50%" },
    { level: "not_started", label: "Not attempted" },
  ];
  return (
    <ul className="flex flex-wrap items-center gap-2 text-[11.5px] font-semibold text-slate-600">
      {entries.map((entry) => (
        <li key={entry.level} className="flex items-center gap-1.5">
          <span className={`inline-block h-3 w-3 rounded-sm ${masteryTone(entry.level).cell}`} />
          {entry.label}
        </li>
      ))}
    </ul>
  );
}
