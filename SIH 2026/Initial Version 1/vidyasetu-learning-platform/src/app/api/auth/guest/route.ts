import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, redirectTo, startSession } from "@/lib/session";

const GUESTS = {
  student: {
    handle: "guest_student",
    name: "Guest Student",
    email: "guest.student@vidyasetu.gov.in",
    role: "student" as const,
    className: 8 as number | null,
    state: "All India",
    school: "VidyaSetu Guest" as string | null,
    subjectSpecialization: null as string | null,
    institutionId: null as string | null,
  },
  faculty: {
    handle: "guest_faculty",
    name: "Guest Faculty",
    email: "guest.faculty@vidyasetu.gov.in",
    role: "faculty" as const,
    className: null as number | null,
    state: "All India",
    school: null as string | null,
    subjectSpecialization: "Science" as string | null,
    institutionId: "SCH-DEMO" as string | null,
  },
};

const GUEST_MAX_AGE = 60 * 60 * 24 * 2;

export async function GET(req: Request) {
  const role =
    new URL(req.url).searchParams.get("role") === "faculty" ? "faculty" : "student";
  const g = GUESTS[role];

  try {
    let [user] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.email, g.email))
      .limit(1);

    if (!user) {
      // onConflictDoNothing keeps concurrent guest clicks from erroring
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

    if (!user) return redirectTo("/?error=guest");

    await startSession(req, user, GUEST_MAX_AGE);
    return redirectTo("/home");
  } catch {
    return redirectTo("/?error=guest");
  }
}
