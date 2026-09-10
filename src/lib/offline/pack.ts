/**
 * Offline chapter packs.
 *
 * A pack is a single JSON document containing everything needed to keep
 * studying with no network: the outcome map, the MCQ bank with explanations,
 * the curated notes, the printable revision sheet (as SVG) and the indexed
 * textbook paragraphs so the tutor can still answer from sources.
 *
 * It is deliberately *plain data with a version number*: the bundled offline
 * app in `public/offline/` is a dependency-free HTML file that reads the same
 * pack from IndexedDB, so "offline" does not depend on React, Next.js, or this
 * server being reachable. `validateSyncPayload()` is the only place the server
 * trusts anything that came back from a device, and it trusts nothing: scores
 * are recomputed in SQL from the stored answer key.
 */

export const PACK_VERSION = 1;
export const PACK_FORMAT = "pragyan.chapter-pack";

export type PackOutcome = {
  code: string;
  concept: string;
  statement: string;
  definition: string;
  parent: string | null;
  page: number;
  keywords: string[];
  diagram: string;
};

export type PackQuestion = {
  id: number;
  qtext: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  loCode: string | null;
  trapIndex: number | null;
  trap: string | null;
};

export type PackNote = {
  title: string;
  body: string;
  author: string;
  facultyVerified: boolean;
};

export type PackSource = {
  chunkId: number;
  label: string;
  page: number | null;
  para: number;
  heading: string | null;
  text: string;
  kind: string;
};

export type PackVideo = {
  title: string;
  url: string;
  durationSec: number;
  sizeMb: number | null;
  /** False when the file itself is not cached and needs a network stream. */
  cached: boolean;
};

export type ChapterPack = {
  format: typeof PACK_FORMAT;
  packVersion: number;
  chapterId: number;
  classNo: number;
  subjectSlug: string;
  subjectName: string;
  chapterNum: number;
  chapterTitle: string;
  book: string | null;
  dikshaCode: string | null;
  generatedAt: string;
  outcomes: PackOutcome[];
  questions: PackQuestion[];
  notes: PackNote[];
  sources: PackSource[];
  videos: PackVideo[];
  revision: { svg: string; title: string };
  /** Suggested time limit so the offline quiz matches the online one. */
  quiz: { seconds: number; xpPerCorrect: number };
  /** Approximate download size in kilobytes. */
  sizeKb: number;
};

export function packSizeKb(pack: unknown): number {
  return Math.max(1, Math.round(JSON.stringify(pack).length / 1024));
}

/** Filename used by the offline app and the service worker cache. */
export function packFileName(chapterId: number): string {
  return `pragyan-pack-${chapterId}-v${PACK_VERSION}.json`;
}

/* ---------------------------- sync payload ---------------------------- */

export type QueuedAttempt = {
  /** Random id generated on the device; makes sync idempotent. */
  clientId: string;
  chapterId: number;
  answers: number[];
  durationSec: number;
  /** ISO timestamp from the device clock (recorded, never trusted for ordering). */
  completedAt: string;
  packVersion: number;
};

export type SyncPayload = { attempts: QueuedAttempt[] };

export class SyncError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "SyncError";
  }
}

const MAX_ATTEMPTS_PER_SYNC = 25;

/**
 * Validates an offline sync. Any field can be wrong; nothing is coerced
 * silently, and the answer key is never accepted from the client.
 */
export function validateSyncPayload(body: unknown): SyncPayload {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new SyncError("Send a JSON object with an attempts array.");
  const raw = (body as { attempts?: unknown }).attempts;
  if (!Array.isArray(raw))
    throw new SyncError("Send a JSON object with an attempts array.");
  if (raw.length === 0) return { attempts: [] };
  if (raw.length > MAX_ATTEMPTS_PER_SYNC)
    throw new SyncError(`Sync at most ${MAX_ATTEMPTS_PER_SYNC} attempts at a time.`, 413);

  return {
    attempts: raw.map((entry, index) => {
      const label = `attempt ${index + 1}`;
      if (!entry || typeof entry !== "object") throw new SyncError(`Invalid ${label}.`);
      const attempt = entry as Record<string, unknown>;
      const clientId = attempt.clientId;
      if (typeof clientId !== "string" || clientId.length < 8 || clientId.length > 80)
        throw new SyncError(`${label} needs a clientId of 8–80 characters.`);
      const chapterId = Number(attempt.chapterId);
      if (!Number.isSafeInteger(chapterId) || chapterId < 1)
        throw new SyncError(`${label} needs a valid chapterId.`);
      if (!Array.isArray(attempt.answers) || attempt.answers.length > 200)
        throw new SyncError(`${label} needs an answers array.`);
      const answers = attempt.answers.map((value) => {
        const number = Number(value);
        if (!Number.isInteger(number) || number < -1 || number > 3)
          throw new SyncError(`${label} has an invalid answer option.`);
        return number;
      });
      const durationSec = Math.max(0, Math.min(7200, Number(attempt.durationSec) || 0));
      const completedAt =
        typeof attempt.completedAt === "string" && attempt.completedAt.length <= 40
          ? attempt.completedAt
          : new Date(0).toISOString();
      const packVersion = Number(attempt.packVersion) || PACK_VERSION;
      return { clientId, chapterId, answers, durationSec, completedAt, packVersion };
    }),
  };
}

/** Pure scoring used by tests and by the offline app (mirrored in its JS). */
export function scoreAnswers(
  answers: number[],
  key: { correctIndex: number }[],
): { score: number; total: number } {
  const total = key.length;
  const score = key.reduce(
    (sum, question, index) => sum + (answers[index] === question.correctIndex ? 1 : 0),
    0,
  );
  return { score, total };
}
