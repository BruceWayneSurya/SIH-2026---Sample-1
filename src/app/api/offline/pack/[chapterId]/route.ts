import "server-only";
import { withDatabase } from "@/lib/database-route";
import { buildChapterPack } from "@/lib/offline/server";
import { packFileName } from "@/lib/offline/pack";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Download a chapter pack for offline study.
 *
 *   GET /api/offline/pack/12            → JSON pack (download)
 *   GET /api/offline/pack/12?manifest=1 → sizes only, for the UI
 *
 * The pack is generated fresh from the database, so it can never contain a
 * question or note the school has since withdrawn. `ETag` is the pack version,
 * which lets the service worker skip a re-download when nothing changed.
 */
async function handleGET(
  req: Request,
  ctx: { params: Promise<{ chapterId: string }> },
) {
  const { chapterId } = await ctx.params;
  const id = Number(chapterId);
  if (!Number.isSafeInteger(id) || id < 1)
    return Response.json({ error: "Invalid chapter." }, { status: 400 });

  const url = new URL(req.url);
  const pack = await buildChapterPack(id);
  if (!pack) return Response.json({ error: "Chapter not found." }, { status: 404 });

  const manifest = url.searchParams.get("manifest") === "1";
  const headers = {
    "Cache-Control": "no-store",
    ETag: `"pack-${pack.packVersion}-${pack.chapterId}-${pack.questions.length}-${pack.outcomes.length}-${pack.sources.length}"`,
    "Content-Disposition": `inline; filename="${packFileName(pack.chapterId)}"`,
  };

  if (manifest)
    return Response.json(
      {
        chapterId: pack.chapterId,
        chapterTitle: pack.chapterTitle,
        generatedAt: pack.generatedAt,
        sizeKb: pack.sizeKb,
        counts: {
          outcomes: pack.outcomes.length,
          questions: pack.questions.length,
          notes: pack.notes.length,
          sources: pack.sources.length,
          videos: pack.videos.length,
        },
        fileName: packFileName(pack.chapterId),
      },
      { headers },
    );

  return Response.json(pack, { headers });
}

export const GET = withDatabase(handleGET);
