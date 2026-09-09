import { db, databaseKind } from "@/db";
import { sql } from "drizzle-orm";
import { withDatabase } from "@/lib/database-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withDatabase(async () => {
  try {
    await db.get(sql`select 1`);
    return Response.json({ ok: true, storage: `${databaseKind}-sqlite`, persistent: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false, error: "The learning database is unavailable." }, { status: 503 });
  }
});
export const maxDuration = 60;
