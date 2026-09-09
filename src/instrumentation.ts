export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.VERCEL === "1") return;
  // Local convenience only. Serverless instances initialize lazily on a request;
  // builds and public pages must not require network access to the database.
  try {
    const { ensureDemoDatabase } = await import("./lib/ensure-db");
    await ensureDemoDatabase();
  } catch {
    console.error("[startup] Database setup is incomplete. See the database settings and /api/health.");
  }
}
