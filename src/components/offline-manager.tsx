"use client";

/**
 * Download a chapter, study it offline, sync the marks later.
 *
 * This is the whole loop in one component: the pack manifest comes from the
 * server, the pack body is stored in IndexedDB, the service worker keeps the
 * offline shell, and the queued results are uploaded with a score the server
 * recalculates. The UI is explicit about what is on the device and what is not —
 * including that the sample lecture video still needs a connection.
 */

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  CloudUpload,
  Download,
  HardDriveDownload,
  Loader2,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  cacheThroughWorker,
  deletePack,
  getMeta,
  listPacks,
  readQueue,
  registerServiceWorker,
  savePack,
  syncQueuedAttempts,
  type QueuedAttempt,
  type StoredPack,
} from "@/lib/offline/client";
import type { ChapterPack } from "@/lib/offline/pack";

type Manifest = {
  chapterId: number;
  chapterTitle: string;
  generatedAt: string;
  sizeKb: number;
  counts: { outcomes: number; questions: number; notes: number; sources: number; videos: number };
  fileName: string;
};

export function OfflineManager({
  chapterId,
  chapterTitle,
  compact = false,
}: {
  chapterId: number;
  chapterTitle: string;
  compact?: boolean;
}) {
  const [online, setOnline] = useState(true);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [packs, setPacks] = useState<StoredPack[]>([]);
  const [queue, setQueue] = useState<QueuedAttempt[]>([]);
  const [busy, setBusy] = useState<"download" | "sync" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setPacks(await listPacks());
    setQueue(await readQueue());
    await getMeta("xp", 0);
  }, []);

  useEffect(() => {
    void registerServiceWorker();
    let cancelled = false;
    // Read storage and connectivity once after paint: IndexedDB is an external
    // system, so it is read in an async pass rather than during render.
    void (async () => {
      const [storedPacks, storedQueue] = await Promise.all([listPacks(), readQueue()]);
      if (cancelled) return;
      setPacks(storedPacks);
      setQueue(storedQueue);
      setOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    })();
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/offline/pack/${chapterId}?manifest=1`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled) setManifest(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [chapterId]);

  const stored = packs.find((pack) => pack.chapterId === chapterId) ?? null;

  async function download() {
    setBusy("download");
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/offline/pack/${chapterId}`);
      if (!response.ok)
        throw new Error(
          (await response.json().catch(() => null))?.error ?? "Could not build the pack.",
        );
      const pack = (await response.json()) as ChapterPack;
      await savePack(pack);
      // Keep the offline shell + the pack URL so airplane mode still opens.
      await cacheThroughWorker(["/offline/offline-app.html", `/api/offline/pack/${chapterId}`]);
      setMessage(
        `Saved ${pack.questions.length} questions, ${pack.outcomes.length} outcomes and the revision sheet on this device (${pack.sizeKb} KB).`,
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download the pack.");
    } finally {
      setBusy(null);
    }
  }

  async function sync() {
    setBusy("sync");
    setError(null);
    setMessage(null);
    try {
      const result = await syncQueuedAttempts();
      if (result.error) throw new Error(result.error);
      setMessage(
        `Synced ${result.applied ?? 0} offline result(s). ${
          (result.xpTotal ?? 0) > 0 ? `+${result.xpTotal} XP. ` : ""
        }${(result.duplicates ?? 0) > 0 ? `${result.duplicates} were already recorded.` : ""}`,
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sync.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section
      className={`rounded-lg border border-line bg-white p-4 shadow-sm ${compact ? "" : "sm:p-5"}`}
      aria-label="Offline chapter pack"
    >
      <header className="flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-navy-800 p-2 text-saffron-400">
          <HardDriveDownload className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-extrabold text-navy-900">Study this chapter offline</h2>
          <p className="text-[12.5px] text-slate-500">
            Download over school Wi-Fi, then work with the network off — the quiz, notes, concept map
            and revision sheet all live on the device.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-bold ${
            online
              ? "border-leaf-500/40 bg-leaf-50 text-leaf-700"
              : "border-rose-300 bg-rose-50 text-rose-700"
          }`}
        >
          {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {online ? "Online" : "Airplane mode"}
        </span>
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-[12.5px] sm:grid-cols-4">
        <Cell label="Pack size" value={manifest ? `${manifest.sizeKb} KB` : "…"} />
        <Cell label="Questions" value={manifest ? String(manifest.counts.questions) : "…"} />
        <Cell label="Outcomes" value={manifest ? String(manifest.counts.outcomes) : "…"} />
        <Cell label="Passages" value={manifest ? String(manifest.counts.sources) : "…"} />
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void download()}
          disabled={busy !== null || !online}
          className="inline-flex items-center gap-2 rounded-md bg-saffron-500 px-4 py-2 text-[13px] font-extrabold text-navy-950 hover:bg-saffron-400 disabled:opacity-50"
        >
          {busy === "download" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {stored ? "Update the pack" : "Download chapter pack"}
        </button>
        <a
          href={`/offline/offline-app.html?chapter=${chapterId}`}
          className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2 text-[13px] font-bold text-navy-700 hover:border-saffron-400"
        >
          Open the offline app
        </a>
        {queue.length > 0 && (
          <button
            type="button"
            onClick={() => void sync()}
            disabled={busy !== null || !online}
            className="inline-flex items-center gap-2 rounded-md border border-navy-200 bg-navy-50 px-4 py-2 text-[13px] font-bold text-navy-800 disabled:opacity-50"
          >
            {busy === "sync" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
            Sync {queue.length} queued result{queue.length === 1 ? "" : "s"}
          </button>
        )}
        {stored && (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-leaf-700">
            <CheckCircle2 className="h-4 w-4" /> Saved {new Date(stored.savedAt).toLocaleString()}
          </span>
        )}
      </div>

      {manifest && manifest.counts.videos > 0 && (
        <p className="mt-3 rounded-md border border-line bg-paper px-3 py-2 text-[12px] text-slate-600">
          The lecture video is <strong>not</strong> inside the pack ({manifest.counts.videos} video/
          videos): these sample files are streamed from the CDN, so the pack says so instead of
          pretending to carry it. Notes, the question bank, the concept map and the revision sheet all
          work with the network off.
        </p>
      )}

      {message && (
        <p className="mt-3 rounded-md border border-leaf-500/40 bg-leaf-50 px-3 py-2 text-[12.5px] font-semibold text-leaf-700">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-800">
          {error}
        </p>
      )}

      {!compact && (
        <div className="mt-4 border-t border-line pt-3">
          <h3 className="text-[13px] font-extrabold uppercase tracking-wide text-slate-500">
            On this device ({packs.length})
          </h3>
          {packs.length === 0 ? (
            <p className="mt-1 text-[12.5px] text-slate-500">
              No packs stored yet. Nothing is downloaded without your action.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {packs.map((entry) => (
                <li
                  key={entry.chapterId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-paper px-3 py-2 text-[12.5px]"
                >
                  <span className="min-w-0 truncate font-bold text-navy-800">
                    {entry.pack.chapterTitle}{" "}
                    <span className="font-normal text-slate-500">
                      · {entry.pack.questions.length} Q · {entry.sizeKb} KB
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <a
                      href={`/offline/offline-app.html?chapter=${entry.chapterId}`}
                      className="font-bold text-navy-600 hover:underline"
                    >
                      Open
                    </a>
                    <button
                      type="button"
                      onClick={() => void deletePack(entry.chapterId).then(refresh)}
                      className="inline-flex items-center gap-1 font-bold text-rose-700 hover:underline"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {queue.length > 0 && (
            <p className="mt-2 text-[12px] text-amber-800">
              {queue.length} offline result{queue.length === 1 ? "" : "s"} waiting to sync —{" "}
              {queue.map((item) => item.chapterTitle).join(", ")}.
            </p>
          )}
        </div>
      )}

      <p className="mt-3 text-[11.5px] leading-relaxed text-slate-500">
        Offline marks are recalculated on the server from the options you chose, then credited once
        per attempt. {chapterTitle ? `Current chapter: ${chapterTitle}.` : ""}
      </p>
    </section>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-paper px-3 py-2">
      <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-[15px] font-extrabold text-navy-800">{value}</dd>
    </div>
  );
}
