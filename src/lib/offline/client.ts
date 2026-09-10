/**
 * Browser-side offline storage. Shared by the portal UI and mirrored (by hand,
 * deliberately, so the offline app needs no bundler) in
 * `public/offline/offline-app.html`.
 *
 * Storage contract — do not change one side without the other:
 *   DB "pragyan-offline" v1
 *     packs  keyPath "chapterId"  { chapterId, pack, savedAt, sizeKb }
 *     queue  keyPath "clientId"   { clientId, chapterId, chapterTitle, answers,
 *                                   durationSec, completedAt, packVersion }
 *     meta   keyPath "key"        { key, value }
 *
 * The service worker handles files; IndexedDB handles data. Offline study then
 * needs neither the network nor a running Next.js server to render.
 */

import type { ChapterPack } from "./pack";

export const OFFLINE_DB = "pragyan-offline";
export const OFFLINE_DB_VERSION = 1;

export type StoredPack = {
  chapterId: number;
  pack: ChapterPack;
  savedAt: string;
  sizeKb: number;
};

export type QueuedAttempt = {
  clientId: string;
  chapterId: number;
  chapterTitle: string;
  answers: number[];
  durationSec: number;
  completedAt: string;
  packVersion: number;
};

type StoreName = "packs" | "queue" | "meta";

function supported(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_DB, OFFLINE_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("packs")) db.createObjectStore("packs", { keyPath: "chapterId" });
      if (!db.objectStoreNames.contains("queue")) db.createObjectStore("queue", { keyPath: "clientId" });
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta", { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(store: StoreName, mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(store, mode);
    const request = run(transaction.objectStore(store));
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
  });
}

export async function listPacks(): Promise<StoredPack[]> {
  if (!supported()) return [];
  try {
    const rows = await withStore<StoredPack[]>("packs", "readonly", (store) => store.getAll());
    return (rows ?? []).sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
  } catch {
    return [];
  }
}

export async function savePack(pack: ChapterPack): Promise<StoredPack> {
  const entry: StoredPack = {
    chapterId: pack.chapterId,
    pack,
    savedAt: new Date().toISOString(),
    sizeKb: pack.sizeKb,
  };
  await withStore("packs", "readwrite", (store) => store.put(entry));
  return entry;
}

export async function deletePack(chapterId: number): Promise<void> {
  await withStore("packs", "readwrite", (store) => store.delete(chapterId));
}

export async function readQueue(): Promise<QueuedAttempt[]> {
  if (!supported()) return [];
  try {
    return (await withStore<QueuedAttempt[]>("queue", "readonly", (store) => store.getAll())) ?? [];
  } catch {
    return [];
  }
}

export async function queueAttempt(attempt: QueuedAttempt): Promise<void> {
  await withStore("queue", "readwrite", (store) => store.put(attempt));
}

export async function removeQueued(clientId: string): Promise<void> {
  await withStore("queue", "readwrite", (store) => store.delete(clientId));
}

export async function getMeta<T>(key: string, fallback: T): Promise<T> {
  if (!supported()) return fallback;
  try {
    const row = await withStore<{ key: string; value: T } | undefined>("meta", "readonly", (store) => store.get(key));
    return row ? row.value : fallback;
  } catch {
    return fallback;
  }
}

export async function setMeta<T>(key: string, value: T): Promise<void> {
  await withStore("meta", "readwrite", (store) => store.put({ key, value }));
}

/* --------------------------- service worker --------------------------- */

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

/** Ask the worker to keep the offline shell and a pack URL for offline use. */
export async function cacheThroughWorker(urls: string[]): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.serviceWorker?.controller) return false;
  navigator.serviceWorker.controller.postMessage({ type: "CACHE_URLS", urls });
  return true;
}

/* ------------------------------- sync ------------------------------- */

export type SyncResponse = {
  ok?: boolean;
  applied?: number;
  duplicates?: number;
  rejected?: number;
  xpTotal?: number;
  totalXp?: number;
  error?: string;
};

/**
 * Upload queued offline attempts. The server recomputes every score, so this
 * function never sends a mark — only the options the learner chose.
 */
export async function syncQueuedAttempts(): Promise<SyncResponse> {
  const queue = await readQueue();
  if (queue.length === 0) return { ok: true, applied: 0, xpTotal: 0 };
  const response = await fetch("/api/offline/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      attempts: queue.map((attempt) => ({
        clientId: attempt.clientId,
        chapterId: attempt.chapterId,
        answers: attempt.answers,
        durationSec: attempt.durationSec,
        completedAt: attempt.completedAt,
        packVersion: attempt.packVersion,
      })),
    }),
  });
  const data = (await response.json().catch(() => null)) as SyncResponse | null;
  if (!response.ok) return { ok: false, error: data?.error ?? "Could not sync right now." };
  for (const attempt of queue) await removeQueued(attempt.clientId);
  return data ?? { ok: true };
}

export function newClientId(): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `off-${Date.now().toString(36)}-${random}`;
}
