import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Award,
  BadgeCheck,
  Building2,
  GraduationCap,
  Lock,
  Mail,
  MapPin,
  Medal,
  Target,
  UserRound,
  Zap,
} from "lucide-react";
import { getActiveUser } from "@/lib/session";
import { getUserStats } from "@/lib/queries";
import { allBadges } from "@/lib/badges";
import { StatCard } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Account() {
  const user = await getActiveUser();
  if (!user) redirect("/home");

  const stats = await getUserStats(user.id, user.className);
  const badges = allBadges(await (async () => {
    const { getBadgesForUser } = await import("@/lib/queries");
    return getBadgesForUser(user.id);
  })());

  const rows: [string, string | null][] = [
    ["Handle", `@${user.handle}`],
    ["Role", user.isGuest ? `Guest ${user.role}` : user.role === "faculty" ? "Faculty / Teacher" : "Student"],
    [
      user.role === "faculty" ? "Specialization" : "Class",
      user.role === "faculty" ? user.subjectSpecialization : user.className ? `Class ${user.className}` : null,
    ],
    ["State / UT", user.state],
    [
      user.role === "faculty" ? "Institution ID" : "School",
      user.role === "faculty" ? user.institutionId : user.school,
    ],
    ["Email", user.email],
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="vsv-enter flex flex-wrap items-center gap-4 rounded-lg border border-line bg-white p-5 shadow-sm">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-navy-800 text-2xl font-extrabold text-white">
          {user.name.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold text-navy-900">{user.name}</h1>
          <p className="text-[14px] font-semibold text-slate-500">
            @{user.handle} · {user.role === "faculty" ? "Faculty" : `Class ${user.className ?? "—"}`}
          </p>
          {user.isGuest && (
            <span className="mt-1 inline-block rounded-sm bg-saffron-100 px-2 py-0.5 text-[12px] font-bold text-saffron-700">
              Guest session — data persists for the demo
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BadgeCheck className="h-8 w-8 text-leaf-500" aria-label="Verified portal account" />
          <Link
            href="/login"
            className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-bold text-navy-800 transition hover:border-navy-400 hover:bg-paper"
          >
            Switch Account
          </Link>
          <a
            href="/api/auth/logout"
            className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
          >
            Sign Out
          </a>
        </div>
      </div>

      <div className="vsv-enter mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Zap} label="Total XP" value={stats.xp} tone="saffron" />
        <StatCard icon={Medal} label="Class Rank" value={stats.rank ? `#${stats.rank}` : "—"} />
        <StatCard
          icon={Target}
          label="Accuracy"
          value={stats.accuracy !== null ? `${stats.accuracy}%` : "—"}
          sub={`${stats.objectiveAttempts} objective tests`}
        />
        <StatCard icon={Award} label="Notes Shared" value={stats.notes} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="vsv-enter rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="text-lg font-extrabold text-navy-900">Profile</h2>
          <dl className="mt-3 divide-y divide-line">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-center gap-3 py-2.5 text-[15px]">
                <dt className="flex w-40 shrink-0 items-center gap-2 font-bold text-slate-500">
                  {k === "Email" ? (
                    <Mail className="h-4 w-4" />
                  ) : k === "State / UT" ? (
                    <MapPin className="h-4 w-4" />
                  ) : k === "Handle" ? (
                    <UserRound className="h-4 w-4" />
                  ) : k === "Role" ? (
                    <GraduationCap className="h-4 w-4" />
                  ) : (
                    <Building2 className="h-4 w-4" />
                  )}
                  {k}
                </dt>
                <dd className="min-w-0 truncate font-semibold text-navy-900">{v ?? "—"}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="vsv-enter rounded-lg border border-line bg-white p-5 shadow-sm" style={{ animationDelay: "60ms" }}>
          <h2 className="text-lg font-extrabold text-navy-900">Badges</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {badges.map((b) => (
              <li
                key={b.id}
                className={`flex items-start gap-2.5 rounded-md border p-3 ${
                  b.earned ? "border-saffron-200 bg-saffron-50" : "border-line bg-paper opacity-70"
                }`}
              >
                <span className={`rounded-full p-1.5 ${b.earned ? "bg-saffron-500 text-navy-950" : "bg-slate-200 text-slate-500"}`}>
                  {b.earned ? <Award className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                </span>
                <div>
                  <p className="text-[14px] font-extrabold text-navy-900">{b.name}</p>
                  <p className="text-[12px] leading-snug text-slate-600">{b.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Quick Role / Persona Switcher for Evaluators */}
      <section className="vsv-enter mt-6 rounded-lg border border-saffron-300 bg-saffron-50/60 p-5 shadow-xs">
        <h2 className="text-base font-extrabold text-navy-900">
          SIH Evaluator Sandbox · Quick Persona Switch
        </h2>
        <p className="mt-1 text-xs text-slate-600">
          Switch between roles with 1 click to test Student learning/quizzing vs Faculty moderation and lecture verification:
        </p>
        <div className="mt-3 flex flex-wrap gap-2.5">
          <a
            href="/api/auth/guest?role=student"
            className="inline-flex items-center gap-1.5 rounded-md border border-navy-300 bg-white px-3 py-2 text-xs font-bold text-navy-900 transition hover:bg-navy-50"
          >
            <UserRound className="h-3.5 w-3.5 text-navy-600" />
            Switch to Guest Student (Class 8)
          </a>
          <a
            href="/api/auth/guest?role=faculty"
            className="inline-flex items-center gap-1.5 rounded-md border border-saffron-300 bg-white px-3 py-2 text-xs font-bold text-saffron-900 transition hover:bg-saffron-50"
          >
            <GraduationCap className="h-3.5 w-3.5 text-saffron-600" />
            Switch to Guest Faculty (Science)
          </a>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-md bg-navy-800 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-navy-700"
          >
            Choose from 5+ Demo Accounts →
          </Link>
        </div>
      </section>

      <section className="vsv-enter mt-6 rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold text-navy-900">XP activity</h2>
        {stats.recent.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">
            No activity yet — complete an objective test to earn your first +XP!
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {stats.recent.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2.5">
                <span className="rounded-md bg-saffron-50 px-2.5 py-1 text-[14px] font-extrabold text-saffron-700">
                  +{e.amount}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold text-navy-800">{e.note}</p>
                  <p className="text-[12px] text-slate-500">
                    {new Date(e.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <span className="ml-auto rounded-sm bg-navy-50 px-2 py-0.5 text-[11px] font-bold uppercase text-navy-500">
                  {e.type}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
