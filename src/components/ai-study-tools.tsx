"use client";

import {
  TranslatedText as T,
  useTranslation,
} from "@/components/language-provider";

import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import type { PracticeQuestion, StudyMode } from "@/lib/ai/study";
import { MarkdownInline, MarkdownText } from "@/components/markdown-text";

export function AiStudyTools({
  chapterId,
  quiz = false,
}: {
  chapterId: number;
  quiz?: boolean;
}) {
  const { language, t } = useTranslation();
  const [mode, setMode] = useState<StudyMode>(quiz ? "quiz" : "summary");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [graded, setGraded] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const id = `study-${quiz ? "quiz" : "notes"}-${chapterId}`;

  async function generate() {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId, mode, topic, count, language }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok)
        throw new Error(
          data?.error ?? t("AI generation is unavailable. Please try again."),
        );
      setReply(data.reply ?? "");
      setQuestions(data.questions ?? []);
      setAnswers({});
      setGraded(false);
    } catch (err) {
      if (!controller.signal.aborted)
        setError(
          err instanceof Error
            ? err.message
            : t("Could not generate study material."),
        );
    } finally {
      if (!controller.signal.aborted) {
        request.current = null;
        setBusy(false);
      }
    }
  }

  return (
    <section
      className="rounded-xl border border-saffron-200 bg-white p-4 shadow-sm sm:p-5"
      aria-labelledby={`${id}-title`}
    >
      <div className="flex items-start gap-3">
        <span className="rounded-lg bg-saffron-50 p-2 text-saffron-600">
          {quiz ? (
            <Sparkles className="h-5 w-5" />
          ) : (
            <BookOpen className="h-5 w-5" />
          )}
        </span>
        <div>
          <h2 id={`${id}-title`} className="font-extrabold text-navy-900">
            <T>{quiz ? "AI Quiz Generator" : "AI Study Notes"}</T>
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            <T>
              {quiz
                ? "Fresh practice on any sub-topic. AI practice does not award XP or replace the official assessment."
                : "A summary, key points, or a simpler explanation of your chapter."}
            </T>
          </p>
        </div>
      </div>
      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void generate();
        }}
      >
        {!quiz && (
          <div className="flex flex-wrap gap-1 rounded-lg bg-paper p-1">
            {(
              [
                ["summary", "Summary"],
                ["key-points", "Key points"],
                ["explain", "Explain simply"],
              ] as const
            ).map(([value, label]) => (
              <button
                type="button"
                key={value}
                aria-pressed={mode === value}
                disabled={busy}
                onClick={() => setMode(value)}
                className={`rounded-md px-3 py-1.5 text-sm font-bold transition ${mode === value ? "bg-navy-800 text-white" : "text-navy-600 hover:bg-navy-100"}`}
              >
                {t(label)}
              </button>
            ))}
          </div>
        )}
        <label
          className="block text-xs font-bold text-navy-800"
          htmlFor={`${id}-topic`}
        >
          <T>Sub-topic (optional)</T>
        </label>
        <input
          id={`${id}-topic`}
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          disabled={busy}
          maxLength={240}
          placeholder={t("e.g. flame zones, comparing fractions…")}
          className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-navy-950"
        />
        <div className="flex flex-wrap items-center gap-2">
          {quiz && (
            <>
              <label className="sr-only" htmlFor={`${id}-count`}>
                <T>Number of questions</T>
              </label>
              <select
                id={`${id}-count`}
                value={count}
                onChange={(event) => setCount(Number(event.target.value))}
                disabled={busy}
                className="rounded-lg border border-line bg-paper px-3 py-2 text-sm text-navy-800"
              >
                {[3, 5, 7, 10].map((n) => (
                  <option key={n} value={n}>
                    {t("{count} questions", { count: n })}
                  </option>
                ))}
              </select>
            </>
          )}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-saffron-500 px-4 py-2 text-sm font-bold text-navy-950 hover:bg-saffron-400 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {t(busy ? "Generating…" : quiz ? "Generate quiz" : "Generate")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setReply("");
              setQuestions([]);
              setError(null);
              setAnswers({});
              setGraded(false);
              setTopic("");
            }}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-navy-600 hover:bg-navy-50 disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" /> <T>Reset</T>
          </button>
        </div>
      </form>
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
        >
          {error}
        </p>
      )}
      {reply && (
        <div
          className="mt-4 rounded-lg border border-line bg-paper p-4 text-sm leading-relaxed text-navy-900"
          aria-live="polite"
        >
          <MarkdownText text={reply} />
        </div>
      )}
      {!reply && questions.length === 0 && !busy && (
        <p className="mt-3 text-xs text-slate-500">
          <T>
            {quiz
              ? "Tap Generate quiz to get fresh AI-generated MCQs on this chapter."
              : "Tip: leave the sub-topic empty to get an overview of the whole chapter."}
          </T>
        </p>
      )}
      {questions.length > 0 && (
        <div className="mt-5 space-y-4">
          {graded && (
            <p
              role="status"
              className="flex items-center gap-2 rounded-lg bg-leaf-50 p-3 font-bold text-leaf-700"
            >
              <CheckCircle2 className="h-5 w-5" />{" "}
              {t("Practice result: {score}/{total}. No XP awarded.", {
                score: questions.filter((q, i) => answers[i] === q.correctIndex)
                  .length,
                total: questions.length,
              })}
            </p>
          )}
          {questions.map((question, i) => (
            <fieldset
              key={i}
              disabled={graded || busy}
              className="rounded-lg border border-line p-3"
            >
              <legend className="px-1 text-sm font-bold text-navy-900">
                {i + 1}. <MarkdownInline text={question.question} />
              </legend>
              <div className="mt-1 space-y-2">
                {question.options.map((option, j) => (
                  <label
                    key={j}
                    className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-sm ${graded && j === question.correctIndex ? "border-leaf-500 bg-leaf-50 text-leaf-700" : answers[i] === j ? "border-navy-400 bg-navy-50 text-navy-900" : "border-line text-navy-800"}`}
                  >
                    <input
                      type="radio"
                      name={`${id}-q-${i}`}
                      value={j}
                      checked={answers[i] === j}
                      onChange={() =>
                        setAnswers((previous) => ({ ...previous, [i]: j }))
                      }
                      className="mt-1 accent-[#133b5c]"
                    />
                    <span><MarkdownInline text={option} /></span>
                  </label>
                ))}
              </div>
              {graded && (
                <div className="mt-3 text-sm text-navy-700">
                  <b>{t("Explanation: ")}</b>
                  <MarkdownText text={question.explanation} />
                </div>
              )}
            </fieldset>
          ))}
          {!graded && (
            <button
              type="button"
              disabled={
                Object.keys(answers).length !== questions.length || busy
              }
              onClick={() => {
                setGraded(true);
                // Record the recall drill for learning analytics (heatmap,
                // retention competency). Fire-and-forget — never blocks UI.
                const correct = questions.filter(
                  (q, i) => answers[i] === q.correctIndex,
                ).length;
                void fetch("/api/analytics/study", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    chapterId,
                    drills: questions.length,
                    correct,
                  }),
                  keepalive: true,
                }).catch(() => undefined);
              }}
              className="rounded-lg bg-navy-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              <T>Check practice answers</T>
            </button>
          )}
          <p className="text-xs text-slate-500">
            <T>
              AI-generated practice, not verified PYQs. Cross-check answers with
              your NCERT book or teacher.
            </T>
          </p>
        </div>
      )}
    </section>
  );
}
