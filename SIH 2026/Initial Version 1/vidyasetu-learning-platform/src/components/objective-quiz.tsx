"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  RotateCcw,
  Send,
  Target,
  Timer,
  Trophy,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { PyqTag } from "./ui";

type Q = {
  id: number;
  qtext: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  isPyq: boolean;
  pyqTag: string | null;
};

const TOTAL_SECONDS = 20 * 60;

export function ObjectiveQuiz({
  chapterId,
  chapterTitle,
  pyqPct,
  questions,
  best,
}: {
  chapterId: number;
  chapterTitle: string;
  pyqPct: number;
  questions: Q[];
  best: { score: number; total: number } | null;
}) {
  const [phase, setPhase] = useState<"intro" | "test" | "result">("intro");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [timeLeft, setTimeLeft] = useState(TOTAL_SECONDS);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; xpEarned: number; firstTime: boolean } | null>(null);
  const startedAt = useRef(0);

  const pyqCount = useMemo(() => questions.filter((q) => q.isPyq).length, [questions]);
  const answered = answers.filter((a) => a !== null).length;

  const doSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    const durationSec = TOTAL_SECONDS - timeLeft;
    try {
      const res = await fetch(`/api/objective/${chapterId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answers.map((a) => a ?? -1), durationSec }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submission failed");
      setResult({
        score: data.score,
        total: data.total,
        xpEarned: data.xpEarned,
        firstTime: data.firstTime,
      });
      setPhase("result");
      window.scrollTo({ top: 0 });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (phase !== "test") return;
    const iv = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(iv);
          doSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const mm = Math.floor(timeLeft / 60);
  const ss = (timeLeft % 60).toString().padStart(2, "0");
  const low = timeLeft < 120;

  if (phase === "intro") {
    return (
      <div className="rounded-lg border border-line bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start gap-4">
          <span className="rounded-md bg-navy-800 p-3 text-saffron-400">
            <Target className="h-7 w-7" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-extrabold text-navy-900">
              Objective Assessment · {chapterTitle}
            </h2>
            <div className="mt-2 flex flex-wrap gap-2 text-[13px] font-bold">
              <span className="rounded-md border border-navy-200 bg-navy-50 px-2.5 py-1 text-navy-700">
                {questions.length} MCQs
              </span>
              <span className="rounded-md border border-saffron-200 bg-saffron-50 px-2.5 py-1 text-saffron-700">
                {pyqCount}/{questions.length} PYQs · {pyqPct}% previous-year
              </span>
              <span className="rounded-md border border-line bg-white px-2.5 py-1 text-slate-600">
                20:00 timer
              </span>
              <span className="rounded-md border border-saffron-200 bg-saffron-50 px-2.5 py-1 text-saffron-700">
                +10 XP per correct answer
              </span>
            </div>
            <ul className="mt-4 space-y-1.5 text-[15px] text-slate-600">
              <li>• Each question is annotated with its source exam (CBSE / State Board / Exemplar).</li>
              <li>• Instant auto-evaluation with step-by-step solution explanations.</li>
              {best && (
                <li>
                  • Your best so far: <b className="text-navy-800">{best.score}/{best.total}</b> — you can retake any time, but XP is awarded on your first submission.
                </li>
              )}
            </ul>
          </div>
          <button
            type="button"
            onClick={() => {
              startedAt.current = Date.now();
              setAnswers(questions.map(() => null));
              setCurrent(0);
              setTimeLeft(TOTAL_SECONDS);
              setPhase("test");
            }}
            className="inline-flex items-center gap-2 rounded-md bg-navy-800 px-6 py-3 text-[16px] font-bold text-white transition hover:bg-navy-700"
          >
            <Timer className="h-5 w-5 text-saffron-400" /> Start Test
          </button>
        </div>
      </div>
    );
  }

  if (phase === "test") {
    const q = questions[current];
    return (
      <div>
        <div className="sticky top-[64px] z-30 -mx-1 rounded-lg border-2 border-navy-800 bg-white px-4 py-2.5 shadow-md">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-lg font-extrabold tabular-nums ${
                low ? "vs-pulse bg-rose-50 text-rose-600" : "bg-navy-50 text-navy-800"
              }`}
              aria-live="polite"
            >
              <Clock3 className="h-5 w-5" /> {mm}:{ss}
            </span>
            <span className="text-sm font-bold text-slate-600">
              Question {current + 1} of {questions.length}
            </span>
            <div className="h-2 min-w-24 flex-1 overflow-hidden rounded-full bg-navy-100">
              <div
                className="h-full rounded-full bg-saffron-500 transition-all"
                style={{ width: `${(answered / questions.length) * 100}%` }}
              />
            </div>
            <span className="text-[13px] font-bold text-slate-500">{answered} answered</span>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-saffron-500 px-4 py-1.5 text-sm font-extrabold text-navy-950 transition hover:bg-saffron-400"
            >
              <Send className="h-4 w-4" /> Submit
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Question palette">
            {questions.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrent(i)}
                aria-label={`Go to question ${i + 1}`}
                className={`h-8 w-8 rounded text-[13px] font-extrabold transition ${
                  i === current
                    ? "bg-saffron-500 text-navy-950 ring-2 ring-saffron-300"
                    : answers[i] !== null
                      ? "bg-navy-800 text-white"
                      : "border border-line bg-white text-slate-500 hover:border-navy-300"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        <div className="vsv-enter mt-4 rounded-lg border border-line bg-white p-5 shadow-sm" key={current}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-navy-800 px-2.5 py-1 text-sm font-extrabold text-white">
              Q{current + 1}
            </span>
            {q.pyqTag && <PyqTag tag={q.pyqTag} />}
          </div>
          <h3 className="mt-3 text-[18px] font-bold leading-relaxed text-navy-950">{q.qtext}</h3>
          <div className="mt-4 grid gap-2.5" role="radiogroup" aria-label="Answer options">
            {q.options.map((opt, i) => {
              const sel = answers[current] === i;
              return (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={sel}
                  onClick={() =>
                    setAnswers((prev) => prev.map((a, j) => (j === current ? i : a)))
                  }
                  className={`flex items-center gap-3 rounded-md border-2 px-4 py-3 text-left text-[15px] font-semibold transition ${
                    sel
                      ? "border-navy-800 bg-navy-50 text-navy-950"
                      : "border-line bg-white text-slate-700 hover:border-navy-300"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
                      sel ? "bg-navy-800 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
          <div className="mt-5 flex justify-between border-t border-line pt-4">
            <button
              type="button"
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              className="inline-flex items-center gap-1 rounded-md border border-line px-4 py-2 text-sm font-bold text-navy-700 transition hover:border-navy-300 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            {current < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
                className="inline-flex items-center gap-1 rounded-md bg-navy-800 px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-700"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="inline-flex items-center gap-1 rounded-md bg-saffron-500 px-4 py-2 text-sm font-extrabold text-navy-950 transition hover:bg-saffron-400"
              >
                <Send className="h-4 w-4" /> Finish & Submit
              </button>
            )}
          </div>
        </div>

        {confirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4" role="dialog" aria-modal="true" aria-label="Confirm submission">
            <div className="vsv-enter w-full max-w-md rounded-lg bg-white p-6 shadow-2xl">
              <h3 className="flex items-center gap-2 text-lg font-extrabold text-navy-900">
                <AlertTriangle className="h-5 w-5 text-saffron-600" /> Submit test?
              </h3>
              <p className="mt-2 text-[15px] text-slate-600">
                You have answered <b>{answered}</b> of <b>{questions.length}</b> questions.
                Unanswered questions will be marked incorrect.
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  className="flex-1 rounded-md border border-line px-4 py-2 text-sm font-bold text-navy-700 hover:border-navy-300"
                >
                  Keep working
                </button>
                <button
                  type="button"
                  onClick={doSubmit}
                  disabled={submitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-navy-800 px-4 py-2 text-sm font-bold text-white hover:bg-navy-700 disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Submit now
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // result phase
  const r = result!;
  const pct = Math.round((r.score / r.total) * 100);
  const msg =
    pct >= 90 ? "Outstanding! You are chapter-master material." :
    pct >= 70 ? "Great work — a revision pass and you'll be on top." :
    pct >= 50 ? "Solid attempt. Review the explanations below and retake." :
    "Keep going — use the Learning Hub, then retake the test.";
  return (
    <div>
      <div className="vsv-enter rounded-lg border-2 border-navy-800 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-5">
          <div
            className={`flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full border-4 ${
              pct >= 50 ? "border-leaf-500 text-leaf-700" : "border-saffron-500 text-saffron-700"
            }`}
          >
            <span className="text-3xl font-extrabold">{pct}%</span>
            <span className="text-[11px] font-bold uppercase">score</span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-extrabold text-navy-900">
              {r.score} / {r.total} correct
            </h2>
            <p className="mt-1 text-[15px] text-slate-600">{msg}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-extrabold ${
                  r.xpEarned > 0 ? "bg-saffron-500 text-navy-950" : "bg-slate-100 text-slate-500"
                }`}
              >
                <Award className="h-4 w-4" />
                {r.xpEarned > 0
                  ? `+${r.xpEarned} XP added to your profile`
                  : "Practice attempt — XP is awarded on your first submission"}
              </span>
              {r.firstTime && (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-navy-50 px-3 py-1.5 text-sm font-bold text-navy-700">
                  First attempt on this chapter
                </span>
              )}
            </div>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Link
              href={`/leaderboard?chapter=${chapterId}`}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-navy-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-navy-700 sm:flex-none"
            >
              <Trophy className="h-4 w-4 text-saffron-400" /> Chapter leaderboard
            </Link>
            <button
              type="button"
              onClick={() => setPhase("intro")}
              className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5 text-sm font-bold text-navy-700 hover:border-navy-300"
            >
              <RotateCcw className="h-4 w-4" /> Retake
            </button>
          </div>
        </div>
      </div>

      <h3 className="mt-6 mb-3 text-lg font-extrabold text-navy-900">
        Step-by-step solutions ({r.score} correct · {r.total - r.score} to review)
      </h3>
      <ol className="space-y-3">
        {questions.map((q, i) => {
          const mine = answers[i];
          const correct = mine === q.correctIndex;
          return (
            <li key={q.id} className={`rounded-lg border-l-4 bg-white p-4 shadow-sm ${correct ? "border-leaf-500" : "border-rose-400"} border border-line`}>
              <div className="flex flex-wrap items-center gap-2">
                {correct ? (
                  <CheckCircle2 className="h-5 w-5 text-leaf-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-rose-500" />
                )}
                <span className="text-sm font-extrabold text-navy-800">Q{i + 1}</span>
                {q.pyqTag && <PyqTag tag={q.pyqTag} />}
              </div>
              <p className="mt-1.5 text-[15px] font-bold text-navy-950">{q.qtext}</p>
              <p className="mt-1 text-sm text-slate-600">
                {mine === null || mine === -1 ? (
                  <span className="font-bold text-rose-600">Not answered</span>
                ) : !correct ? (
                  <>
                    Your answer: <b className="text-rose-600">{String.fromCharCode(65 + mine)}. {q.options[mine]}</b>
                  </>
                ) : null}
                <br />
                Correct: <b className="text-leaf-700">{String.fromCharCode(65 + q.correctIndex)}. {q.options[q.correctIndex]}</b>
              </p>
              <p className="mt-2 rounded-md bg-navy-50 p-3 text-sm leading-relaxed text-navy-800">
                <b className="text-navy-950">Why:</b> {q.explanation}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
