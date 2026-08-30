import { Router } from "express";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import {
  startLoginSession,
  clearSessionCookie,
  setSessionCookie,
  redirectWithSession,
} from "./session-helpers";

const router = Router();

const INVALID = "Invalid email or password. Try a demo account below.";

/** POST /api/auth/login */
router.post("/login", async (req, res) => {
  let body: { email?: unknown; password?: unknown };
  try {
    body = req.body ?? {};
  } catch {
    return res.status(400).json({ error: "Invalid request body." });
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password)
    return res
      .status(400)
      .json({ error: "Please enter both your email and password." });

  let user;
  try {
    [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  } catch {
    return res
      .status(503)
      .json({ error: "Could not reach the portal database. Please try again." });
  }

  const { verifyPassword } = await import("../auth/password");
  if (!user || !verifyPassword(password, user.passwordHash))
    return res.status(401).json({ error: INVALID });

  startLoginSession(req, res, { id: user.id, role: user.role });

  return res.json({
    ok: true,
    redirect: "/home",
    user: { name: user.name, role: user.role },
  });
});

const SUBJECTS = [
  "Mathematics",
  "Science",
  "Social Science",
  "English",
  "Hindi",
  "Arts & Vocational",
];

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** POST /api/auth/register */
router.post("/register", async (req, res) => {
  const body: Record<string, unknown> = req.body ?? {};

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
    return res.status(400).json({ error: "Please enter your full name." });
  if (name.length > 80)
    return res.status(400).json({ error: "Name is too long (max 80 characters)." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120)
    return res.status(400).json({ error: "Please enter a valid email address." });
  if (password.length < 6)
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  if (password.length > 200)
    return res.status(400).json({ error: "Password is too long." });

  if (role === "student") {
    if (!state) return res.status(400).json({ error: "State / UT is required." });
    if (!school) return res.status(400).json({ error: "School name is required." });
    if (!["7", "8"].includes(className))
      return res.status(400).json({ error: "Select your target class (7 or 8)." });
  } else {
    if (!SUBJECTS.includes(subjectSpecialization))
      return res
        .status(400)
        .json({ error: "Please choose a valid subject specialization." });
    if (!institutionId)
      return res
        .status(400)
        .json({ error: "School / Institution ID is required." });
  }

  try {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing)
      return res
        .status(409)
        .json({
          error:
            "An account with this email already exists. Please sign in instead.",
        });

    const { hashPassword, handleFromName } = await import("../auth/session");

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
      return res
        .status(500)
        .json({ error: "Could not create your account just now. Please try again." });

    startLoginSession(req, res, created);
    return res.json({ ok: true, redirect: "/home", user: { name, role } });
  } catch {
    return res
      .status(500)
      .json({ error: "Registration failed due to a server error. Please try again." });
  }
});

const GUESTS: Record<
  "student" | "faculty",
  {
    handle: string;
    name: string;
    email: string;
    role: "student" | "faculty";
    className: number | null;
    state: string;
    school: string | null;
    subjectSpecialization: string | null;
    institutionId: string | null;
  }
> = {
  student: {
    handle: "guest_student",
    name: "Guest Student",
    email: "guest.student@pragyan.gov.in",
    role: "student",
    className: 8,
    state: "All India",
    school: "Pragyan Guest",
    subjectSpecialization: null,
    institutionId: null,
  },
  faculty: {
    handle: "guest_faculty",
    name: "Guest Faculty",
    email: "guest.faculty@pragyan.gov.in",
    role: "faculty",
    className: null,
    state: "All India",
    school: null,
    subjectSpecialization: "Science",
    institutionId: "SCH-DEMO",
  },
};

const GUEST_MAX_AGE = 60 * 60 * 24 * 2;

/** GET /api/auth/guest?role=student|faculty */
router.get("/guest", async (req, res) => {
  const role =
    (req.query.role as string | undefined) === "faculty" ? "faculty" : "student";
  const g = GUESTS[role];

  try {
    const { hashPassword } = await import("../auth/session");
    let [user] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.email, g.email))
      .limit(1);

    if (!user) {
      const inserted = await db
        .insert(users)
        .values({
          handle: g.handle,
          name: g.name,
          email: g.email,
          passwordHash: hashPassword(`guest-${Math.random().toString(36).slice(2)}`),
          role: g.role,
          className: g.className,
          state: g.state,
          school: g.school,
          subjectSpecialization: g.subjectSpecialization,
          institutionId: g.institutionId,
          isGuest: true,
        })
        .onConflictDoNothing()
        .returning({ id: users.id, role: users.role });

      user =
        inserted[0] ??
        (
          await db
            .select({ id: users.id, role: users.role })
            .from(users)
            .where(eq(users.email, g.email))
            .limit(1)
        )[0];
    }

    return redirectWithSession(req, res, "/home", user, GUEST_MAX_AGE);
  } catch (err) {
    console.error("[guest]", err);
    return res.redirect(303, "/home");
  }
});

/** POST /api/auth/logout (and GET for convenience) */
router.all("/logout", async (_req, res) => {
  clearSessionCookie(_req, res);
  if (_req.method === "GET") return res.redirect(303, "/");
  return res.json({ ok: true, redirect: "/" });
});

export default router;
