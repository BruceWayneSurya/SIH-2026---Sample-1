import { withDatabase } from "@/lib/database-route";
import { getActiveUser } from "@/lib/session";
import { reviewFaculty } from "@/lib/faculty-verification";

/** A verified reviewer confirms (or rejects) a pending institutional claim. */
async function handlePOST(req: Request) {
  const reviewer = await getActiveUser();
  if (!reviewer)
    return Response.json({ error: "Please log in first." }, { status: 401 });

  let body: { facultyId?: unknown; approve?: unknown };
  try {
    body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid body");
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const facultyId = Number(body.facultyId);
  if (!Number.isSafeInteger(facultyId) || facultyId < 1)
    return Response.json({ error: "A valid faculty account is required." }, { status: 400 });

  const result = await reviewFaculty(
    {
      role: reviewer.role,
      verificationStatus: reviewer.verificationStatus,
      name: reviewer.name,
    },
    facultyId,
    body.approve === true,
  );
  if (!result.ok)
    return Response.json({ error: result.error }, { status: 403 });
  return Response.json({ ok: true, approved: body.approve === true });
}

export const POST = withDatabase(handlePOST);

export const runtime = "nodejs";
export const maxDuration = 60;
