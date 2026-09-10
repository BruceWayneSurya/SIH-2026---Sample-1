"use client";

/**
 * The grounded tutor.
 *
 * Three things are visible on screen because judges (and parents) ask for them:
 *   • a citation chip on every answer — "NCERT p. 62, para 3" — that opens the
 *     paragraph it came from;
 *   • the hint ladder, so "hints before answers" is a control the learner uses,
 *     not a promise in a slide;
 *   • photo-to-help, where the model reads the working and returns the first
 *     wrong step plus a hint (never the answer).
 */

import { useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  Camera,
  CircleAlert,
  GraduationCap,
  ImageIcon,
  Lightbulb,
  Loader2,
  Quote,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
  WifiOff,
  X,
} from "lucide-react";
import type { ChatMessage } from "@/lib/ai/groq-client";
import { MarkdownText } from "@/components/markdown-text";
import { useTranslation } from "@/components/language-provider";

type Citation = {
  chunkId: number;
  label: string;
  page: number | null;
  para: number;
  docTitle: string;
  kind: string;
  authority: string;
  href: string;
};

type TutorReply = {
  reply: string;
  citations: Citation[];
  hintLevel: number;
  followUp: string | null;
  withheld: boolean;
  source: "model" | "local-index";
  degraded: boolean;
  degradedReason?: string;
  insufficientEvidence: boolean;
  scope: { status: string; message: string; suggestion: string; topic?: string };
  evidence: { label: string; score: number; chunkId: number }[];
};

type Turn = {
  role: "user" | "assistant";
  content: string;
  meta?: TutorReply;
  imageName?: string;
};

const MODES = [
  { id: "socratic", label: "Guide me (hints first)", icon: Lightbulb },
  { id: "explain", label: "Explain it simply", icon: GraduationCap },
  { id: "photo", label: "Check my photo", icon: Camera },
] as const;

const LADDER = [
  { level: 1, label: "Help me notice" },
  { level: 2, label: "Show me the rule" },
  { level: 3, label: "Next step only" },
] as const;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.readAsDataURL(file);
  });
}

export function TutorPanel({
  chapterId,
  chapterTitle,
  classNo,
  sources,
  aiConfigured,
}: {
  chapterId: number;
  chapterTitle: string;
  classNo: number;
  sources: { title: string; kind: string; authority: string; chunks: number }[];
  aiConfigured: boolean;
}) {
  const { language, t } = useTranslation();
  const [mode, setMode] = useState<(typeof MODES)[number]["id"]>("socratic");
  const [hintLevel, setHintLevel] = useState(1);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<{ dataUrl: string; name: string; file: File } | null>(null);
  const [offline, setOffline] = useState(false);
  const log = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);

  useEffect(() => {
    const update = () => setOffline(typeof navigator !== "undefined" && !navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [turns, busy]);

  async function send(question: string, options: { level?: number; image?: File } = {}) {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError(null);

    const level = options.level ?? hintLevel;
    let imageDataUrl: string | undefined;
    if (options.image) {
      try {
        imageDataUrl = await fileToDataUrl(options.image);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not read that photo.");
        setBusy(false);
        request.current = null;
        return;
      }
    }

    const history: ChatMessage[] = [
      ...turns.map((turn) => ({ role: turn.role, content: turn.content })),
      { role: "user" as const, content: question },
    ].slice(-12);

    setTurns((current) => [
      ...current,
      { role: "user", content: question, imageName: options.image?.name },
    ]);

    try {
      const res = await fetch("/api/ai/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterId,
          mode: options.image ? "photo" : mode,
          hintLevel: level,
          language,
          messages: history,
          ...(imageDataUrl ? { image: imageDataUrl } : {}),
        }),
        signal: controller.signal,
      });
      const data = (await res.json().catch(() => null)) as (TutorReply & { error?: string }) | null;
      if (!res.ok || !data?.reply)
        throw new Error(data?.error ?? "The tutor could not reply. Please try again.");
      setTurns((current) => [...current, { role: "assistant", content: data.reply, meta: data }]);
      if (data.hintLevel) setHintLevel(data.hintLevel);
    } catch (err) {
      if (!controller.signal.aborted)
        setError(err instanceof Error ? err.message : "Unable to reach the tutor.");
    } finally {
      if (!controller.signal.aborted) {
        setBusy(false);
        request.current = null;
      }
    }
  }

  const lastReply = [...turns].reverse().find((turn) => turn.role === "assistant")?.meta ?? null;

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <header className="border-b border-line bg-navy-50/70 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-lg bg-saffron-100 p-2 text-saffron-700">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-extrabold text-navy-900">
              {t("Grounded tutor")} · {chapterTitle}
            </h2>
            <p className="text-[12px] text-slate-500">
              {t("Hints before answers. Every reply shows the NCERT passage it used.")}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-bold ${
              aiConfigured
                ? "border-leaf-500/40 bg-leaf-50 text-leaf-700"
                : "border-amber-400/60 bg-amber-50 text-amber-800"
            }`}
            title={
              aiConfigured
                ? "Model-generated prose, restricted to the indexed sources below."
                : "No GROQ_API_KEY: hints are composed from the chapter's own indexed passages."
            }
          >
            {aiConfigured ? <Sparkles className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {aiConfigured ? t("AI + sources") : t("Source-only mode")}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {MODES.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => {
                setMode(entry.id);
                if (entry.id !== "socratic") setHintLevel(1);
              }}
              aria-pressed={mode === entry.id}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-bold transition ${
                mode === entry.id
                  ? "border-navy-800 bg-navy-800 text-white"
                  : "border-line bg-white text-navy-700 hover:border-saffron-400"
              }`}
            >
              <entry.icon className="h-3.5 w-3.5" /> {t(entry.label)}
            </button>
          ))}
        </div>

        {mode === "socratic" && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-saffron-200 bg-saffron-50 px-3 py-2">
            <span className="text-[12px] font-extrabold uppercase tracking-wide text-saffron-700">
              {t("Hint step")}
            </span>
            {LADDER.map((step) => (
              <button
                key={step.level}
                type="button"
                onClick={() => {
                  setHintLevel(step.level);
                  const question =
                    turns.filter((turn) => turn.role === "user").slice(-1)[0]?.content ??
                    `Help me with ${chapterTitle}`;
                  void send(question, { level: step.level });
                }}
                className={`rounded-full px-3 py-1 text-[12px] font-bold transition ${
                  hintLevel === step.level
                    ? "bg-saffron-500 text-navy-950"
                    : "bg-white text-saffron-700 hover:bg-saffron-100"
                }`}
              >
                {step.level}. {t(step.label)}
              </button>
            ))}
            <span className="text-[11.5px] text-slate-500">
              {t("Step 3 still stops short of the final answer.")}
            </span>
          </div>
        )}
      </header>

      <div ref={log} role="log" aria-live="polite" className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {turns.length === 0 && (
          <div className="rounded-lg border border-line bg-paper p-4">
            <p className="text-[13.5px] leading-relaxed text-navy-800">
              {t("Ask a question, or photograph the page you are stuck on.")}{" "}
              {t("I will point at the paragraph in your book — not at my memory.")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                "Why does a big log take longer to catch fire?",
                "What are the three conditions for burning?",
                "Which zone of a candle flame is hottest?",
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void send(prompt)}
                  className="rounded-lg border border-saffron-200 bg-white px-3 py-2 text-left text-[12px] font-semibold text-saffron-700 hover:border-saffron-500"
                >
                  {t(prompt)}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((turn, index) => (
          <div key={index} className="space-y-2">
            <div
              className={`rounded-xl p-3 text-[13.5px] leading-relaxed ${
                turn.role === "user"
                  ? "ml-6 bg-navy-800 text-white"
                  : "mr-2 border border-line bg-paper text-navy-900"
              }`}
            >
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide opacity-70">
                {turn.role === "user" ? t("You") : "Pragyan"}
              </span>
              {turn.imageName && (
                <p className="mb-1 flex items-center gap-1.5 text-[11.5px] opacity-90">
                  <ImageIcon className="h-3.5 w-3.5" /> {turn.imageName}
                </p>
              )}
              {turn.role === "user" ? (
                <p className="whitespace-pre-wrap break-words">{turn.content}</p>
              ) : (
                <MarkdownText text={turn.content} />
              )}
            </div>

            {turn.meta && (
              <div className="mr-2 space-y-2">
                {turn.meta.scope?.status !== "in_scope" && (
                  <p className="flex items-start gap-2 rounded-md border border-amber-400/60 bg-amber-50 px-3 py-2 text-[12.5px] font-semibold text-amber-900">
                    <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {t("Outside your syllabus — refused politely, not answered from memory.")}
                  </p>
                )}
                {turn.meta.insufficientEvidence && (
                  <p className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-800">
                    <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {t("No indexed passage matched, so the tutor declined instead of guessing.")}
                  </p>
                )}
                {turn.meta.withheld && (
                  <p className="flex items-start gap-2 rounded-md border border-saffron-300 bg-saffron-50 px-3 py-2 text-[12.5px] font-semibold text-saffron-800">
                    <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {t("A sentence giving the answer away was removed by the hint guard.")}
                  </p>
                )}
                {turn.meta.citations.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Quote className="h-3.5 w-3.5 text-slate-400" />
                    {turn.meta.citations.map((citation) => (
                      <a
                        key={citation.chunkId}
                        href={`/source/${citation.chunkId}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-navy-200 bg-navy-50 px-2.5 py-1 text-[11.5px] font-bold text-navy-800 hover:border-navy-400"
                        title={`${citation.docTitle} — ${citation.kind.replace("_", " ")}`}
                      >
                        <BadgeCheck className="h-3 w-3 text-leaf-600" />
                        {citation.label}
                      </a>
                    ))}
                  </div>
                )}
                {turn.meta.followUp && (
                  <p className="rounded-md bg-navy-50 px-3 py-2 text-[12.5px] font-semibold text-navy-800">
                    {t("Next")}: {turn.meta.followUp}
                  </p>
                )}
                {turn.meta.degraded && turn.meta.degradedReason && (
                  <p className="text-[11px] text-slate-500">{turn.meta.degradedReason}</p>
                )}
              </div>
            )}
          </div>
        ))}

        {busy && (
          <p role="status" className="flex items-center gap-2 text-[13px] text-navy-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            {mode === "photo" ? t("Reading your page…") : t("Looking it up in your chapter…")}
          </p>
        )}
        {error && (
          <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-[13px] text-rose-800">
            <p>{error}</p>
          </div>
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!input.trim() && !photo) return;
          const question =
            input.trim() || "Check my working in this photo and tell me the first wrong step.";
          void send(question, photo ? { image: photo.file, level: 1 } : {});
          setInput("");
        }}
        className="border-t border-line p-3"
      >
        {photo && (
          <div className="mb-2 flex items-center gap-2 rounded-md border border-line bg-paper px-2 py-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.dataUrl} alt="" className="h-10 w-10 rounded object-cover" />
            <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-navy-800">
              {photo.name}
            </span>
            <button
              type="button"
              aria-label={t("Remove photo")}
              onClick={() => setPhoto(null)}
              className="rounded p-1 text-slate-500 hover:bg-navy-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <label className="cursor-pointer rounded-lg border border-line bg-white p-2.5 text-navy-700 hover:border-saffron-400">
            <span className="sr-only">{t("Attach a photo of the page")}</span>
            <Camera className="h-4 w-4" />
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void fileToDataUrl(file).then((dataUrl) =>
                  setPhoto({ dataUrl, name: file.name || "photo.jpg", file }),
                );
                event.target.value = "";
              }}
            />
          </label>
          <textarea
            rows={2}
            maxLength={4_000}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={t("Ask an NCERT question, or paste the line you are stuck on…")}
            className="min-w-0 flex-1 resize-none rounded-lg border border-line bg-paper px-3 py-2 text-[13px] text-navy-950"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                if (input.trim()) {
                  void send(input.trim());
                  setInput("");
                }
              }
            }}
          />
          <button
            type="submit"
            aria-label={t("Send question")}
            disabled={busy || (!input.trim() && !photo)}
            className="rounded-lg bg-saffron-500 p-3 text-navy-950 hover:bg-saffron-400 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        {photo && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void send(
                input.trim() || "Check my working in this photo and tell me the first wrong step.",
                { image: photo.file, level: 1 },
              );
              setInput("");
            }}
            className="mt-2 w-full rounded-md bg-navy-800 py-2 text-[13px] font-bold text-white hover:bg-navy-700 disabled:opacity-50"
          >
            {t("Check this photo the Socratic way")}
          </button>
        )}
        <p className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-500">
          <span>
            {t("AI can make mistakes. Every claim above links to the textbook paragraph it came from.")}
          </span>
          {turns.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setTurns([]);
                setError(null);
                setHintLevel(1);
              }}
              className="inline-flex shrink-0 items-center gap-1 font-bold text-navy-600 hover:text-navy-800"
            >
              <Trash2 className="h-3 w-3" /> {t("Clear")}
            </button>
          )}
        </p>
        {offline && (
          <p className="mt-2 flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1.5 text-[11.5px] font-semibold text-slate-600">
            <WifiOff className="h-3.5 w-3.5" />
            {t("You are offline. Downloaded chapters keep working in the offline app.")}
          </p>
        )}
      </form>

      {sources.length > 0 && (
        <details className="border-t border-line bg-paper px-4 py-3">
          <summary className="cursor-pointer text-[12.5px] font-extrabold text-navy-800">
            {t("Sources this tutor is allowed to quote")} ({sources.length})
          </summary>
          <ul className="mt-2 space-y-1.5">
            {sources.map((source) => (
              <li
                key={source.title}
                className="flex items-center justify-between gap-2 text-[12px] text-slate-600"
              >
                <span className="min-w-0 truncate">
                  {source.authority === "ncert" ? "📘" : source.authority === "student" ? "🧑‍🎓" : "🧑‍🏫"}{" "}
                  {source.title}
                </span>
                <span className="shrink-0 font-semibold text-navy-700">{source.chunks} ¶</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11.5px] text-slate-500">
            {t("Ranking is weighted by authority: textbook first, then faculty-verified notes, then classmates' notes.")}
          </p>
        </details>
      )}
      {lastReply?.evidence && lastReply.evidence.length > 0 && (
        <details className="border-t border-line px-4 py-3">
          <summary className="cursor-pointer text-[12.5px] font-extrabold text-navy-800">
            {t("Why this answer")} — retrieval scores
          </summary>
          <ul className="mt-2 space-y-1 text-[12px] text-slate-600">
            {lastReply.evidence.map((item) => (
              <li key={item.chunkId} className="flex items-center justify-between gap-2">
                <a href={`/source/${item.chunkId}`} className="truncate underline decoration-dotted">
                  {item.label}
                </a>
                <span className="shrink-0 font-mono font-bold text-navy-700">
                  {item.score.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
