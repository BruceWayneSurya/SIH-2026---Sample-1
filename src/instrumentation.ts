export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { ensureDemoDatabase } = await import("./server/db/ensure-db");
  try {
    await ensureDemoDatabase();
  } catch (err) {
    console.error("[instrumentation] database bootstrap failed", err);
  }
}
