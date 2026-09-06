import "server-only";
import { getActiveUser } from "@/lib/session";
import { AiServiceError, completeGroqChat, getGroqConfig, validateChatMessages } from "@/lib/ai/groq-client";

export const runtime = "nodejs";

// A small per-account demo safeguard, shared between server bundles in-process.
// Production deployments should additionally rate-limit at their gateway.
const globalForAi = globalThis as typeof globalThis & {
  __vsAiRequests?: Map<number, { count: number; until: number }>;
};
const requests = globalForAi.__vsAiRequests ??= new Map();

export async function POST(req: Request) {
  try {
    const messages = validateChatMessages(await req.json().catch(() => null));
    const config = getGroqConfig({
      GROQ_API_KEY: process.env.GROQ_API_KEY,
      GROQ_MODEL: process.env.GROQ_MODEL,
    });
    const user = await getActiveUser();
    if (!user) return Response.json({ error: "The portal session is unavailable. Please try again." }, { status: 401 });

    const now = Date.now();
    for (const [id, window] of requests) if (window.until <= now) requests.delete(id);
    const window = requests.get(user.id) ?? { count: 0, until: now + 60_000 };
    if (window.count >= 10) {
      return Response.json({ error: "Too many AI requests. Please wait a minute." }, {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((window.until - now) / 1_000)) },
      });
    }
    requests.set(user.id, { ...window, count: window.count + 1 });
    const reply = await completeGroqChat(messages, config);
    return Response.json({ ok: true, reply }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AiServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    // Never log the request, environment, key, or raw upstream response.
    return Response.json({ error: "Could not complete the AI request. Please try again." }, { status: 500 });
  }
}
