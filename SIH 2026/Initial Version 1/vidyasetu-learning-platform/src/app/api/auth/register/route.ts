import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { handleFromName, hashPassword, redirectTo, startSession } from "@/lib/session";

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
  // Browsers navigating a real form send `Accept: text/html`; fetch() sends */*
  const wantsPage = (req.headers.get("accept") ?? "").includes("text/html");
  const fail = (error: string, status: number) =>
    wantsPage
      ? redirectTo("/?error=register")
      : Response.json({ error }, { status });

  let body: Record<string, unknown>;
  const ct = (req.headers.get("content-type") ?? "").toLowerCase();
  try {
    if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
      const fd = await req.formData();
      body = Object.fromEntries(fd.entries());
    } else {
      body = await req.json();
    }
  } catch {
    return fail("Invalid request body.", 400);
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
    return fail("Please enter your full name.", 400);
  if (name.length > 80)
    return fail("Name is too long (max 80 characters).", 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120)
    return fail("Please enter a valid email address.", 400);
  if (password.length < 6)
    return fail("Password must be at least 6 characters.", 400);
  if (password.length > 200)
    return fail("Password is too long.", 400);

  if (role === "student") {
    if (!state)
      return fail("State / UT is required.", 400);
    if (!school)
      return fail("School name is required.", 400);
    if (!["7", "8"].includes(className))
      return fail("Select your target class (7 or 8).", 400);
  } else {
    if (!SUBJECTS.includes(subjectSpecialization))
      return fail("Please choose a valid subject specialization.", 400);
    if (!institutionId)
      return fail("School / Institution ID is required.", 400);
  }

  try {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing)
      return fail(
        "An account with this email already exists. Please sign in instead.",
        409,
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
      return fail("Could not create your account just now. Please try again.", 500);

    await startSession(req, created);
    if (wantsPage) return redirectTo("/home");
    return Response.json({ ok: true, redirect: "/home", user: { name, role } });
  } catch {
    return fail("Registration failed due to a server error. Please try again.", 500);
  }
}
