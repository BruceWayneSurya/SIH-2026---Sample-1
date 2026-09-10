import "server-only";
import { withDatabase } from "@/lib/database-route";
import { buildChapterPack } from "@/lib/offline/server";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * The printable revision sheet as a standalone SVG.
 *
 *   GET /api/revision/12           → SVG (opens in a new tab, prints to A4)
 *   GET /api/revision/12?json=1    → the sheet model
 *
 * It is generated from the same outcome map and question bank the dashboard
 * uses, so a teacher's print-out and the class heatmap can never disagree.
 */
async function handleGET(
  req: Request,
  ctx: { params: Promise<{ chapterId: string }> },
) {
  const { chapterId } = await ctx.params;
  const id = Number(chapterId);
  if (!Number.isSafeInteger(id) || id < 1)
    return Response.json({ error: "Invalid chapter." }, { status: 400 });

  const pack = await buildChapterPack(id);
  if (!pack) return Response.json({ error: "Chapter not found." }, { status: 404 });

  const wantsJson = new URL(req.url).searchParams.get("json") === "1";
  if (wantsJson)
    return Response.json(
      {
        chapterId: pack.chapterId,
        title: pack.revision.title,
        outcomes: pack.outcomes.length,
        questions: pack.questions.length,
      },
      { headers: { "Cache-Control": "no-store" } },
    );

  const safeName = pack.chapterTitle.replace(/[^A-Za-z0-9]+/g, "-").slice(0, 60).toLowerCase();
  return new Response(pack.revision.svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Disposition": `inline; filename="revision-${safeName}.svg"`,
    },
  });
}

export const GET = withDatabase(handleGET);
