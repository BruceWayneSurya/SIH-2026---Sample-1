import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { handleFromName, hashPassword, startSession } from "@/server/auth/session";

const SUBJECTS = [
  "Mathematics",
  "Science",
  "Social Science",
  "English",
  "Hindi",
  "Arts & Vocational",
];

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const role = body.role === "faculty" ? "faculty" : "student";
  const name = str(body.name).replace(/\s+/g, " ");
  const email = str(body.email).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  const state = str(body.state);
  const school = str(body.school);
  const className = str(body.className);
  const subjectSpecialization = str(body.subjectSpecialization);
  const institutionId = str(body.institutionId);

  if (name.length < 3)
    return Response.json({ error: "Please enter your full name." }, { status: 400 });
  if (name.length > 80)
    return Response.json({ error: "Name is too long (max 80 characters)." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120)
    return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
  if (password.length < 6)
    return Response.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  if (password.length > 200)
    return Response.json({ error: "Password is too long." }, { status: 400 });

  if (role === "student") {
    if (!state)
      return Response.json({ error: "State / UT is required." }, { status: 400 });
    if (!school)
      return Response.json({ error: "School name is required." }, { status: 400 });
    if (!["7", "8"].includes(className))
      return Response.json({ error: "Select your target class (7 or 8)." }, { status: 400 });
  } else {
    if (!SUBJECTS.includes(subjectSpecialization))
      return Response.json(
        { error: "Please choose a valid subject specialization." },
        { status: 400 },
      );
    if (!institutionId)
      return Response.json({ error: "School / Institution ID is required." }, { status: 400 });
  }

  try {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing)
      return Response.json(
        { error: "An account with this email already exists. Please sign in instead." },
        { status: 409 },
      );

    // handle is unique — retry a few times in case the random suffix collides
    let created: { id: number; role: "student" | "faculty" } | null = null;
    for (let attempt = 0; attempt < 5 && !created; attempt++) {
      const rows = await db
        .insert(users)
        .values({
          handle: handleFromName(name),
          name,
          email,
          passwordHash: hashPassword(password),
          role,
          className: role === "student" ? Number(className) : null,
          state: state || null,
          school: role === "student" ? school : null,
          subjectSpecialization: role === "faculty" ? subjectSpecialization : null,
          institutionId: role === "faculty" ? institutionId : null,
        })
        .onConflictDoNothing({ target: users.handle })
        .returning({ id: users.id, role: users.role });
      created = rows[0] ?? null;
    }

    if (!created)
      return Response.json(
        { error: "Could not create your account just now. Please try again." },
        { status: 500 },
      );

    await startSession(req, created);
    return Response.json({ ok: true, redirect: "/home", user: { name, role } });
  } catch {
    return Response.json(
      { error: "Registration failed due to a server error. Please try again." },
      { status: 500 },
    );
  }
}
