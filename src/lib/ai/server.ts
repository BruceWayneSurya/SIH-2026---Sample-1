import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { chapters } from "@/db/schema";
import { getActiveUser } from "@/lib/session";
import { AiServiceError, getGroqConfig } from "./groq-client";

const state = globalThis as typeof globalThis & { __pragyanAiRequests?: Map<number, { count: number; until: number }> };
const requests = state.__pragyanAiRequests ??= new Map();

/** Best-effort instance limit; use a gateway/provider quota for distributed deployments. */
export async function authorizeAi() {
  const config = getGroqConfig({ GROQ_API_KEY: process.env.GROQ_API_KEY, GROQ_MODEL: process.env.GROQ_MODEL });
  const user = await getActiveUser();
  if (!user) throw new AiServiceError("The learning database is unavailable. Check /api/health or try again shortly.", 503);
  const now = Date.now();
  for (const [id, window] of requests) if (window.until <= now) requests.delete(id);
  const window = requests.get(user.id) ?? { count: 0, until: now + 60_000 };
  if (window.count >= 10) throw new AiServiceError("Too many AI requests. Please wait a minute.", 429);
  requests.set(user.id, { ...window, count: window.count + 1 });
  return { config, userId: user.id };
}

export async function chapterContext(id: number) {
  const [chapter] = await db.select({ title: chapters.title, subjectName: chapters.subjectName, classNo: chapters.classNo }).from(chapters).where(eq(chapters.id, id)).limit(1);
  if (!chapter) throw new AiServiceError("Chapter not found.", 404);
  return `NCERT Class ${chapter.classNo} · ${chapter.subjectName} · ${chapter.title}`;
}

export function aiErrorResponse(error: unknown): Response {
  const known = error instanceof AiServiceError;
  return Response.json({ error: known ? error.message : "Could not complete the AI request. Please try again." }, {
    status: known ? error.status : 500,
    headers: { "Cache-Control": "no-store", ...(known && error.status === 429 ? { "Retry-After": "60" } : {}) },
  });
}
