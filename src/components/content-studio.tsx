"use client";

/**
 * Faculty content studio.
 *
 * A teacher brings what they already have — a PDF, a photograph, a five-minute
 * recording, or pasted text — and the pipeline returns a transcript, revision
 * notes, an outcome-tagged question bank and a translation. Nothing publishes
 * itself: the teacher reads it, fixes it and presses publish, and the page spells
 * out exactly what will land in the chapter.
 */

import { useRef, useState } from "react";
import {
  BadgeCheck,
  CircleAlert,
  FileText,
  Loader2,
  Mic,
  Send,
  Square,
  Upload,
} from "lucide-react";

type GeneratedQuestion = {
  qtext: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  loCode: string | null;
};

type JobResult = {
  job: {
    id: number;
    chapterId: number;
    chapterTitle: string;
    sourceKind: string;
    sourceName: string;
    degraded: boolean;
    degradedReason: string | null;
    model: string | null;
    passages: number;
    notes: string;
    questions: GeneratedQuestion[];
    translation: { language: string; text: string } | null;
    outcomes: { code: string; concept: string; statement: string }[];
    newOutcomes: boolean;
  };
};

type RecentJob = {
  id: number;
  chapterTitle: string;
  sourceName: string;
  sourceKind: string;
  status: string;
  questionCount: number;
  createdAt: string;
};

const TARGETS = [
  { code: "", label: "No translation" },
  { code: "te", label: "Telugu (తెలుగు)" },
  { code: "hi", label: "Hindi (हिन्दी)" },
  { code: "ta", label: "Tamil (தமிழ்)" },
  { code: "kn", label: "Kannada (ಕನ್ನಡ)" },
  { code: "ml", label: "Malayalam (മലയാളം)" },
];

export function ContentStudio({
  chapterId,
  chapterTitle,
  classNo,
  subjectName,
  hasCuratedOutcomes,
  curatedOutcomes,
  recent,
  aiConfigured,
}: {
  chapterId: number;
  chapterTitle: string;
  classNo: number;
  subjectName: string;
  hasCuratedOutcomes: boolean;
  curatedOutcomes: { code: string; concept: string }[];
  recent: RecentJob[];
  aiConfigured: boolean;
}) {
  const [text, setText] = useState("");
  const [outcomeLines, setOutcomeLines] = useState("");
  const [count, setCount] = useState(20);
  const [target, setTarget] = useState("te");
  const [mode, setMode] = useState<"text" | "file" | "audio">("text");
  const [file, setFile] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const [audio, setAudio] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JobResult["job"] | null>(null);
  const [published, setPublished] = useState<{ questionsAdded: number; outcomesAdded: number; sourcesIndexed: number; link: string } | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  async function generate() {
    setBusy(true);
    setError(null);
    setPublished(null);
    try {
      let response: Response;
      if (mode === "text") {
        response = await fetch("/api/faculty/studio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chapterId, text, count, targetLanguage: target || null, outcomes: outcomeLines }),
        });
      } else {
        const payload = mode === "audio" ? audio : file;
        if (!payload) throw new Error("Choose a file first.");
        const form = new FormData();
        form.append("file", payload);
        form.append("chapterId", String(chapterId));
        form.append("kind", mode === "audio" ? "audio" : "pdf");
        form.append("count", String(count));
        form.append("targetLanguage", target);
        form.append("outcomes", outcomeLines);
        response = await fetch("/api/faculty/studio", { method: "POST", body: form });
      }
      const data = (await response.json().catch(() => null)) as (JobResult & { error?: string }) | null;
      if (!response.ok || !data?.job) throw new Error(data?.error ?? "Generation failed.");
      setResult(data.job);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate the material.");
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (!result) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/faculty/studio/${result.id}/publish`, { method: "POST" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Could not publish.");
      setPublished({
        questionsAdded: data.questionsAdded ?? 0,
        outcomesAdded: data.outcomesAdded ?? 0,
        sourcesIndexed: data.sourcesIndexed ?? 0,
        link: data.link ?? "/",
      });
      setResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish.");
    } finally {
      setBusy(false);
    }
  }

  function startRecording() {
    void navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        chunks.current = [];
        const media = new MediaRecorder(stream);
        media.ondataavailable = (event) => chunks.current.push(event.data);
        media.onstop = () => {
          const blob = new Blob(chunks.current, { type: media.mimeType || "audio/webm" });
          setAudio(new File([blob], `lecture-${Date.now()}.webm`, { type: blob.type }));
          stream.getTracks().forEach((track) => track.stop());
        };
        media.start();
        recorder.current = media;
        setRecording(true);
      })
      .catch(() => setError("Microphone permission is needed to record a lecture. You can upload a PDF or paste text instead."));
  }

  function stopRecording() {
    recorder.current?.stop();
    recorder.current = null;
    setRecording(false);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold text-navy-900">
          {chapterTitle} · Class {classNo} {subjectName}
        </h2>
        <p className="mt-1 text-[13px] text-slate-600">
          Upload or record the material. The pipeline returns a transcript, notes, {count} MCQs tagged
          to learning outcomes, and a translation — all of it a draft until you publish.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              { id: "text", label: "Paste text", icon: FileText },
              { id: "file", label: "Upload PDF", icon: Upload },
              { id: "audio", label: "Record / upload audio", icon: Mic },
            ] as const
          ).map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setMode(entry.id)}
              aria-pressed={mode === entry.id}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold ${
                mode === entry.id
                  ? "border-navy-800 bg-navy-800 text-white"
                  : "border-line bg-white text-navy-700 hover:border-saffron-400"
              }`}
            >
              <entry.icon className="h-3.5 w-3.5" /> {entry.label}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {mode === "text" && (
            <label className="block text-[12.5px] font-bold text-navy-800">
              Chapter material
              <textarea
                rows={8}
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Paste your lecture notes, a worksheet, or the text of the pages you want turned into a chapter pack…"
                className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-[13px] font-normal text-navy-950"
              />
              <span className="mt-1 block text-[11.5px] font-normal text-slate-500">
                {text.trim().length} characters · at least a few paragraphs are needed.
              </span>
            </label>
          )}

          {mode === "file" && (
            <label className="block text-[12.5px] font-bold text-navy-800">
              PDF document (text layer required)
              <input
                type="file"
                accept="application/pdf"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-[13px] font-normal"
              />
              <span className="mt-1 block text-[11.5px] font-normal text-slate-500">
                {file ? `${file.name} · ${Math.round(file.size / 1024)} KB` : "Up to 12 MB."} A scanned
                PDF with no text layer is reported instead of being sent to the model as garbage —
                photograph the page and use the photo path.
              </span>
            </label>
          )}

          {mode === "audio" && (
            <div className="rounded-md border border-line bg-paper p-3">
              <div className="flex flex-wrap items-center gap-2">
                {recording ? (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-[13px] font-bold text-white"
                  >
                    <Square className="h-3.5 w-3.5" /> Stop recording
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="inline-flex items-center gap-2 rounded-md bg-navy-800 px-4 py-2 text-[13px] font-bold text-white"
                  >
                    <Mic className="h-3.5 w-3.5" /> Record a lecture
                  </button>
                )}
                <label className="text-[12px] font-bold text-navy-700">
                  or upload
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(event) => setAudio(event.target.files?.[0] ?? null)}
                    className="ml-2 rounded border border-line bg-white px-2 py-1 text-[12px] font-normal"
                  />
                </label>
              </div>
              <p className="mt-2 text-[11.5px] text-slate-600">
                {audio
                  ? `Ready: ${audio.name} (${Math.round(audio.size / 1024)} KB)`
                  : recording
                    ? "Recording… speak normally; the audio stays in this browser until you press generate."
                    : "Up to about five minutes / 20 MB. Transcription needs GROQ_API_KEY."}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <label className="text-[12.5px] font-bold text-navy-800">
              Questions
              <select
                value={count}
                onChange={(event) => setCount(Number(event.target.value))}
                className="ml-2 rounded-md border border-line bg-paper px-2 py-1.5 text-[13px] font-semibold"
              >
                {[5, 10, 15, 20].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[12.5px] font-bold text-navy-800">
              Translation
              <select
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                className="ml-2 rounded-md border border-line bg-paper px-2 py-1.5 text-[13px] font-semibold"
              >
                {TARGETS.map((entry) => (
                  <option key={entry.code} value={entry.code}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {!hasCuratedOutcomes && (
            <label className="block text-[12.5px] font-bold text-navy-800">
              Learning outcomes for this chapter (one per line)
              <textarea
                rows={4}
                value={outcomeLines}
                onChange={(event) => setOutcomeLines(event.target.value)}
                placeholder={"Classifies materials as combustible and non-combustible\nExplains the conditions needed for combustion\nExplains ignition temperature with an example"}
                className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-[13px] font-normal text-navy-950"
              />
              <span className="mt-1 block text-[11.5px] font-normal text-amber-800">
                This chapter has no curated NCERT outcome map yet. Outcomes you write here are stored
                as <strong>faculty draft</strong> and labelled that way on screen; questions are then
                tagged to them, and the mastery map starts working for this chapter.
              </span>
            </label>
          )}

          {hasCuratedOutcomes && curatedOutcomes.length > 0 && (
            <p className="rounded-md border border-line bg-paper px-3 py-2 text-[12px] text-slate-600">
              Tagging against {curatedOutcomes.length} curated NCERT outcomes, e.g.{" "}
              {curatedOutcomes.slice(0, 3).map((outcome) => outcome.code).join(", ")}.
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void generate()}
            disabled={busy || (mode === "text" && text.trim().length < 200) || (mode !== "text" && !file && !audio)}
            className="inline-flex items-center gap-2 rounded-md bg-saffron-500 px-5 py-2.5 text-[13px] font-extrabold text-navy-950 hover:bg-saffron-400 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Generate the chapter pack
          </button>
          {!aiConfigured && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/60 bg-amber-50 px-3 py-1 text-[11.5px] font-bold text-amber-800">
              <CircleAlert className="h-3.5 w-3.5" /> No AI key: passages are indexed and notes drafted
              from your own text; questions are not invented.
            </span>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-800">
            {error}
          </p>
        )}
        {published && (
          <div className="mt-3 rounded-md border border-leaf-500/40 bg-leaf-50 px-4 py-3 text-[13px] text-leaf-700">
            <p className="font-extrabold">Published to the chapter.</p>
            <p className="mt-1">
              {published.questionsAdded} questions added, {published.outcomesAdded} learning outcomes
              created, {published.sourcesIndexed} passages indexed for the tutor.
            </p>
            <a href={published.link} className="mt-2 inline-block font-bold underline">
              Open the chapter
            </a>
          </div>
        )}
      </section>

      {result && (
        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-navy-900">Review before publishing</h2>
              <p className="text-[12.5px] text-slate-500">
                From {result.sourceName} · {result.passages} indexed passages ·{" "}
                {result.model ? `model ${result.model}` : "no model"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void publish()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-md bg-navy-800 px-5 py-2.5 text-[13px] font-extrabold text-white hover:bg-navy-700 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
              Publish to the chapter
            </button>
          </div>

          {result.degraded && result.degradedReason && (
            <p className="mt-3 rounded-md border border-amber-400/60 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900">
              {result.degradedReason}
            </p>
          )}

          <h3 className="mt-4 text-[13px] font-extrabold uppercase tracking-wide text-slate-500">
            Notes ({result.notes.split(/\s+/).length} words)
          </h3>
          <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-line bg-paper p-3 text-[12.5px] text-navy-900">
            {result.notes}
          </pre>

          {result.questions.length > 0 && (
            <>
              <h3 className="mt-4 text-[13px] font-extrabold uppercase tracking-wide text-slate-500">
                Question bank ({result.questions.length})
              </h3>
              <ol className="mt-2 space-y-3">
                {result.questions.map((question, index) => (
                  <li key={question.qtext} className="rounded-md border border-line p-3">
                    <p className="text-[13px] font-bold text-navy-900">
                      {index + 1}. {question.qtext}
                      {question.loCode && (
                        <span className="ml-2 rounded-sm border border-navy-200 bg-navy-50 px-1.5 py-0.5 font-mono text-[10.5px] text-navy-700">
                          {question.loCode}
                        </span>
                      )}
                    </p>
                    <ul className="mt-1.5 space-y-0.5">
                      {question.options.map((option, optionIndex) => (
                        <li
                          key={option}
                          className={`text-[12.5px] ${
                            optionIndex === question.correctIndex
                              ? "font-bold text-leaf-700"
                              : "text-slate-600"
                          }`}
                        >
                          {"ABCD"[optionIndex]}. {option}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1 text-[12px] text-slate-500">{question.explanation}</p>
                  </li>
                ))}
              </ol>
            </>
          )}

          {result.translation && (
            <>
              <h3 className="mt-4 text-[13px] font-extrabold uppercase tracking-wide text-slate-500">
                Translation ({result.translation.language})
              </h3>
              <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-md border border-line bg-paper p-3 text-[12.5px] text-navy-900">
                {result.translation.text}
              </pre>
            </>
          )}
        </section>
      )}

      <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="text-[15px] font-extrabold text-navy-900">Recent pipeline runs</h2>
        {recent.length === 0 ? (
          <p className="mt-2 text-[13px] text-slate-500">
            Nothing generated yet. Every run is kept with its source and status so a school can audit
            what was added, by whom and when.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {recent.map((job) => (
              <li
                key={job.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-paper px-3 py-2 text-[12.5px]"
              >
                <span className="min-w-0 truncate font-bold text-navy-800">
                  {job.chapterTitle} · {job.sourceName}
                </span>
                <span className="flex items-center gap-2 text-slate-600">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${
                      job.status === "published"
                        ? "border-leaf-500/40 bg-leaf-50 text-leaf-700"
                        : "border-amber-400/60 bg-amber-50 text-amber-800"
                    }`}
                  >
                    {job.status}
                  </span>
                  {job.questionCount} Q · {job.createdAt}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
