"use client";

import { useMemo, useState } from "react";
import {
  Award,
  CheckCheck,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  NotebookPen,
} from "lucide-react";
import Link from "next/link";
import { Trophy } from "lucide-react";

type Q = {
  id: number;
  qtext: string;
  marks: 2 | 3 | 5;
  rubric: { step: string; marks: number }[];
  modelAnswer: string;
};

const GROUPS: { marks: 2 | 3 | 5; label: string; desc: string }[] = [
  { marks: 2, label: "Short Answer", desc: "5 questions × 2 marks" },
  { marks: 3, label: "Medium Answer", desc: "5 questions × 3 marks" },
  { marks: 5, label: "Long Answer", desc: "5 questions × 5 marks" },
];

export function SubjectivePractice({
  chapterId,
  chapterTitle,
  questions,
}: {
  chapterId: number;
  chapterTitle: string;
  questions: Q[];
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ xpEarned: number; firstTime: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalMarks = useMemo(() => questions.reduce((a, q) => a + q.marks, 0), [questions]);
  const written = questions.filter((q) => (drafts[q.id] ?? "").trim().length > 0).length;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/subjective/${chapterId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: drafts }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submission failed");
      setDone({ xpEarned: data.xpEarned, firstTime: data.firstTime });
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit.");
    } finally {
      setSubmitting(false);
    }
  };

  const downloadScheme = () => {
    const lines: string[] = [
      `PRAGYAN (प्रज्ञान) — MODEL MARKING SCHEME`,
      `Chapter: ${chapterTitle}`,
      `Total: ${questions.length} questions · ${totalMarks} marks`,
      ``,
    ];
    for (const g of GROUPS) {
      const qs = questions.filter((q) => q.marks === g.marks);
      if (qs.length === 0) continue;
      lines.push(`— ${g.label} (${g.desc}) —`, ``);
      for (const q of qs) {
        lines.push(`Q. ${q.qtext} [${q.marks} M]`);
        for (const r of q.rubric) lines.push(`   • ${r.step} — ${r.marks}M`);
        lines.push(`   Model answer: ${q.modelAnswer}`, ``);
      }
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `marking-scheme-${chapterTitle.toLowerCase().replace(/\s+/g, "-").slice(0, 40)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (done) {
    return (
      <div className="vsv-enter rounded-lg border-2 border-leaf-500/50 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto mb-4 inline-flex rounded-full bg-leaf-50 p-4 text-leaf-600">
          <CheckCheck className="h-10 w-10" />
        </span>
        <h2 className="text-2xl font-extrabold text-navy-900">Subjective practice completed</h2>
        <p className="mx-auto mt-2 max-w-md text-[15px] text-slate-600">
          Your drafted answers were saved. Cross-check them with each scoring key below (or
          download the full scheme for classroom evaluation with your teacher).
        </p>
        <div className="mt-4 flex justify-center">
          <span
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-base font-extrabold ${
              done.xpEarned > 0 ? "bg-saffron-500 text-navy-950" : "bg-slate-100 text-slate-500"
            }`}
          >
            <Award className="h-5 w-5" />
            {done.xpEarned > 0
              ? `+${done.xpEarned} XP for completing the chapter's subjective set`
              : "Already credited on your first completion — practice as much as you like"}
          </span>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href={`/leaderboard?chapter=${chapterId}`}
            className="inline-flex items-center gap-2 rounded-md bg-navy-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-navy-700"
          >
            <Trophy className="h-4 w-4 text-saffron-400" /> Chapter leaderboard
          </Link>
          <button
            type="button"
            onClick={downloadScheme}
            className="inline-flex items-center gap-2 rounded-md border border-line px-5 py-2.5 text-sm font-bold text-navy-700 hover:border-navy-300"
          >
            <Download className="h-4 w-4" /> Download marking scheme
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 rounded-lg border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <span className="rounded-md bg-navy-800 p-3 text-saffron-400">
            <NotebookPen className="h-7 w-7" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-extrabold text-navy-900">
              Subjective Assessment · {chapterTitle}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              {questions.length} questions · {totalMarks} marks · write your answer (or on paper),
              then reveal the scoring key to self-assess.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadScheme}
              className="inline-flex items-center gap-1.5 rounded-md border border-line px-3.5 py-2 text-sm font-bold text-navy-700 hover:border-navy-300"
            >
              <Download className="h-4 w-4" /> Marking scheme
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-md bg-saffron-500 px-4 py-2 text-sm font-extrabold text-navy-950 hover:bg-saffron-400 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
              Complete practice (+30 XP)
            </button>
          </div>
        </div>
        {error && <p role="alert" className="mt-3 text-sm font-bold text-rose-600">{error}</p>}
      </div>

      {GROUPS.map((g) => {
        const qs = questions.filter((q) => q.marks === g.marks);
        if (qs.length === 0) return null;
        return (
          <section key={g.marks} className="mb-6">
            <div className="mb-3 flex items-baseline gap-2">
              <h3 className="text-lg font-extrabold text-navy-900">{g.label}</h3>
              <span className="text-[13px] font-bold text-slate-500">{g.desc}</span>
            </div>
            <ol className="space-y-3">
              {qs.map((q, i) => {
                const open = !!revealed[q.id];
                return (
                  <li key={q.id} className="rounded-lg border border-line bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-navy-800 px-2 py-0.5 text-[13px] font-extrabold text-white">
                        {i + 1}
                      </span>
                      <span className="rounded-sm border border-saffron-200 bg-saffron-50 px-2 py-0.5 text-[12px] font-extrabold text-saffron-700">
                        {q.marks} marks
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setRevealed((r) => ({ ...r, [q.id]: !r[q.id] }))
                        }
                        className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-[13px] font-bold text-navy-700 transition hover:border-navy-300"
                      >
                        {open ? <EyeOff className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
                        {open ? "Hide scoring key" : "Reveal scoring key"}
                      </button>
                    </div>
                    <p className="mt-2 text-[16px] font-bold text-navy-950">{q.qtext}</p>

                    <textarea
                      value={drafts[q.id] ?? ""}
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [q.id]: e.target.value }))
                      }
                      rows={3}
                      placeholder="Draft your answer here (optional — you can also write on paper)."
                      className="mt-3 w-full rounded-md border border-line bg-paper px-3 py-2 text-[15px] focus:border-navy-500"
                      aria-label={`Your answer to question ${i + 1}`}
                    />

                    {open && (
                      <div className="vsv-enter mt-3 rounded-md border border-leaf-100 bg-leaf-50/60 p-4">
                        <p className="text-[13px] font-extrabold uppercase tracking-wide text-leaf-700">
                          Model answer &amp; scoring key
                        </p>
                        <p className="mt-2 text-[15px] leading-relaxed text-slate-700">{q.modelAnswer}</p>
                        <ul className="mt-3 space-y-1.5">
                          {q.rubric.map((r, ri) => (
                            <li key={ri} className="flex items-start gap-2 text-sm text-slate-700">
                              <span className="mt-0.5 shrink-0 rounded-sm bg-white px-1.5 py-0.5 font-mono text-[12px] font-bold text-leaf-700 ring-1 ring-leaf-100">
                                {r.marks}M
                              </span>
                              <span>
                                Step {ri + 1}: {r.step}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}

      <div className="sticky bottom-4 z-30 flex flex-wrap items-center gap-3 rounded-lg border-2 border-navy-800 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
        <span className="text-sm font-bold text-slate-600">
          {written}/{questions.length} drafted · {totalMarks} marks total
        </span>
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="ml-auto inline-flex items-center gap-2 rounded-md bg-saffron-500 px-5 py-2.5 text-sm font-extrabold text-navy-950 transition hover:bg-saffron-400 disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
          Complete practice set — earn +30 XP
        </button>
      </div>
    </div>
  );
}
