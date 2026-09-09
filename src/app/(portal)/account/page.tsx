import { TranslatedText as T } from "@/components/language-provider";
import { AccountActions } from "@/components/account-actions";
import { DatabaseSetup } from "@/components/database-setup";

import {
  Award,
  BadgeCheck,
  Building2,
  GraduationCap,
  Lock,
  Mail,
  MapPin,
  Medal,
  ShieldCheck,
  Target,
  UserRound,
  Zap,
} from "lucide-react";
import { getActiveUser } from "@/lib/session";
import { getUserStats } from "@/lib/queries";
import { allBadges } from "@/lib/badges";
import { verificationLabel } from "@/lib/faculty-email";
import { StatCard } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Account() {
  const user = await getActiveUser();
  if (!user) return <DatabaseSetup />;

  const stats = await getUserStats(user.id, user.className);
  const badges = allBadges(
    await (async () => {
      const { getBadgesForUser } = await import("@/lib/queries");
      return getBadgesForUser(user.id);
    })(),
  );

  const rows: [string, string | null][] = [
    ["Handle", `@${user.handle}`],
    [
      "Role",
      user.isGuest
        ? `Guest ${user.role}`
        : user.role === "faculty"
          ? "Faculty / Teacher"
          : "Student",
    ],
    [
      user.role === "faculty" ? "Specialization" : "Class",
      user.role === "faculty"
        ? user.subjectSpecialization
        : user.className
          ? `Class ${user.className}`
          : null,
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
            @{user.handle} ·{" "}
            {user.role === "faculty"
              ? "Faculty"
              : `Class ${user.className ?? "—"}`}
          </p>
          {user.isGuest && (
            <span className="mt-1 inline-block rounded-sm bg-saffron-100 px-2 py-0.5 text-[12px] font-bold text-saffron-700">
              Shared demo guest — sign in for your own notes, votes, and scores
            </span>
          )}
        </div>
        <BadgeCheck
          className="h-8 w-8 text-leaf-500"
          aria-label="Verified portal account"
        />
      </div>

      <AccountActions />

      <div className="vsv-enter mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Zap} label="Total XP" value={stats.xp} tone="saffron" />
        <StatCard
          icon={Medal}
          label="Class Rank"
          value={stats.rank ? `#${stats.rank}` : "—"}
        />
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
          <h2 className="text-lg font-extrabold text-navy-900">
            <T>Profile</T>
          </h2>
          <dl className="mt-3 divide-y divide-line">
            {rows.map(([k, v]) => (
              <div
                key={k}
                className="flex items-center gap-3 py-2.5 text-[15px]"
              >
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
                  <T>{k}</T>
                </dt>
                <dd className="min-w-0 truncate font-semibold text-navy-900">
                  {v ?? "—"}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="vsv-enter rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-navy-900">
            <ShieldCheck className="h-5 w-5 text-saffron-600" aria-hidden="true" />
            <T>Email verification</T>
          </h2>
          <p className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[13px] font-extrabold ${
                user.verificationStatus === "verified"
                  ? "border-leaf-500/50 bg-leaf-50 text-leaf-700"
                  : user.verificationStatus === "pending_review"
                    ? "border-saffron-300 bg-saffron-50 text-saffron-700"
                    : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              <BadgeCheck className="h-4 w-4" aria-hidden="true" />
              <T>{verificationLabel(user.verificationStatus)}</T>
            </span>
            <span className="break-all text-[14px] font-semibold text-slate-600">
              {user.email}
            </span>
          </p>
          <p className="mt-2 text-[14px] leading-relaxed text-slate-600">
            {user.role === "faculty"
              ? user.verificationStatus === "verified"
                ? "Your institutional mailbox is confirmed. You can verify community notes and confirm pending teachers."
                : user.verificationStatus === "pending_review"
                  ? "Your mailbox is confirmed. A verified reviewer must confirm your institution before note verification is unlocked."
                  : "Sign in again to receive a one-time code at this address and complete verification."
              : "Student accounts are activated at registration; faculty accounts need this check before they can moderate content."}
          </p>
        </section>

        <section
          className="vsv-enter rounded-lg border border-line bg-white p-5 shadow-sm"
          style={{ animationDelay: "60ms" }}
        >
          <h2 className="text-lg font-extrabold text-navy-900">
            <T>Badges</T>
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {badges.map((b) => (
              <li
                key={b.id}
                className={`flex items-start gap-2.5 rounded-md border p-3 ${
                  b.earned
                    ? "border-saffron-200 bg-saffron-50"
                    : "border-line bg-paper opacity-70"
                }`}
              >
                <span
                  className={`rounded-full p-1.5 ${b.earned ? "bg-saffron-500 text-navy-950" : "bg-slate-200 text-slate-500"}`}
                >
                  {b.earned ? (
                    <Award className="h-4 w-4" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                </span>
                <div>
                  <p className="text-[14px] font-extrabold text-navy-900">
                    {b.name}
                  </p>
                  <p className="text-[12px] leading-snug text-slate-600">
                    {b.desc}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

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
                  <p className="truncate text-[14px] font-bold text-navy-800">
                    {e.note}
                  </p>
                  <p className="text-[12px] text-slate-500">
                    {new Date(e.createdAt).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
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
