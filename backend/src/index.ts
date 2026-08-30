import app from "./app";
import { ensureDemoDatabase } from "./db/ensure-db";

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? "0.0.0.0";

async function main() {
  // Bootstrap the SQLite database (migrate + seed) before serving requests.
  await ensureDemoDatabase();

  app.listen(PORT, HOST, () => {
    console.log(`[api] Pragyan backend listening on http://${HOST}:${PORT}`);
  });
}

main().catch((err) => {
  console.error("[api] failed to start:", err);
  process.exit(1);
});
