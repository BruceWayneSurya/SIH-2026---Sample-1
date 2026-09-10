import "server-only";
import { withDatabase } from "@/lib/database-route";
import { getActiveUser } from "@/lib/session";
import { canModerateNotes } from "@/lib/faculty-email";
import { getClassMasteryView, getStudentMasteryView } from "@/lib/queries-learning";
import { validClass, validSubject } from "@/lib/curriculum";
import { outcomeHeadline } from "@/lib/outcomes/mastery";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Mastery JSON for the dashboard.
 *
 *   GET /api/mastery?classNo=8&subject=science&chapter=6   → class heatmap
 *   GET /api/mastery?view=self&classNo=8&...               → one learner's map
 *
 * Privacy: the class view only carries learner names for verified faculty. A
 * student (or an anonymous visitor) gets the same aggregates with anonymous
 * labels, which is enough to see the class picture but not who is behind it.
 */
async function handleGET(req: Request) {
  const user = await getActiveUser();
  if (!user) return Response.json({ error: "Sign-in required." }, { status: 401 });

  const url = new URL(req.url);
  const classNo = Number(url.searchParams.get("classNo"));
  const subjectSlug = url.searchParams.get("subject") ?? "";
  const chapterNum = Number(url.searchParams.get("chapter"));
  const view = url.searchParams.get("view") === "self" ? "self" : "class";

  if (!validClass(String(classNo)) || !validSubject(subjectSlug) || !Number.isSafeInteger(chapterNum))
    return Response.json({ error: "Choose a class, subject and chapter." }, { status: 400 });

  if (view === "self") {
    const own = await getStudentMasteryView(user.id, classNo, subjectSlug, chapterNum);
    if (!own) return Response.json({ error: "Chapter not found." }, { status: 404 });
    return Response.json(
      {
        view: "self",
        chapter: { id: own.chapterId, title: own.chapterTitle, classNo, subjectSlug, chapterNum },
        attempt: own.attempt
          ? { score: own.attempt.score, total: own.attempt.total }
          : null,
        mastery: {
          secureCount: own.mastery.secureCount,
          needsHelpCount: own.mastery.needsHelpCount,
          notStartedCount: own.mastery.notStartedCount,
          outcomes: own.mastery.outcomes,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const mastery = await getClassMasteryView(classNo, subjectSlug, chapterNum);
  if (!mastery) return Response.json({ error: "Chapter not found." }, { status: 404 });

  // Only verified faculty see who is behind a cell.
  const maySeeNames = user.role === "faculty" && canModerateNotes(user);

  return Response.json(
    {
      view: "class",
      chapter: { id: mastery.chapterId, title: mastery.chapterTitle, classNo, subjectSlug, chapterNum },
      rosterSize: mastery.rosterSize,
      attemptedStudents: mastery.attemptedStudents,
      named: maySeeNames,
      headlines: mastery.headlines,
      outcomes: mastery.outcomes.map((outcome) => ({
        code: outcome.code,
        concept: outcome.concept,
        statement: outcome.statement,
        textbookPage: outcome.textbookPage,
        kind: outcome.kind,
        rosterSize: outcome.rosterSize,
        attempted: outcome.attempted,
        secure: outcome.secure,
        developing: outcome.developing,
        needsHelp: outcome.needsHelp,
        notStarted: outcome.notStarted,
        notUnderstood: outcome.notUnderstood,
        notUnderstoodPct: outcome.notUnderstoodPct,
        confidence: outcome.confidence,
        headline: outcomeHeadline(outcome),
        topMistake: outcome.topMistake,
        misconceptions: outcome.misconceptions,
        evidence: outcome.evidence,
      })),
      students: mastery.students.map((student, index) => ({
        id: maySeeNames ? student.userId : undefined,
        label: maySeeNames
          ? student.name
          : `Student ${String(index + 1).padStart(2, "0")}`,
        handle: maySeeNames ? student.handle : null,
        secureCount: student.mastery.secureCount,
        needsHelpCount: student.mastery.needsHelpCount,
        cells: student.mastery.outcomes.map((cell) => ({
          code: cell.code,
          level: cell.level,
          accuracy: Math.round(cell.accuracy * 100),
          confidence: cell.confidence,
        })),
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export const GET = withDatabase(handleGET);
