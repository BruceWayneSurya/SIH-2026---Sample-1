import Link from "next/link";
import { GraduationCap, UserRound } from "lucide-react";
import { getActiveUser } from "@/lib/session";
import { DataSaverToggle } from "./data-saver-toggle";
import { db } from "@/db";
import { xpEvents } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

function ChakraMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <circle cx="20" cy="20" r="3.2" fill="currentColor" />
      {Array.from({ length: 24 }).map((_, i) => (
        <line
          key={i}
          x1="20"
          y1="20"
          x2="20"
          y2="4.5"
          stroke="currentColor"
          strokeWidth="1.1"
          transform={`rotate(${i * 15} 20 20)`}
        />
      ))}
    </svg>
  );
}

export const Wordmark = ({ light = false }: { light?: boolean }) => (
  <span className="flex items-center gap-2.5">
    <ChakraMark className={light ? "h-9 w-9 text-saffron-400" : "h-9 w-9 text-navy-800"} />
    <span className="leading-none">
      <span
        className={`block font-display text-[22px] font-bold ${light ? "text-white" : "text-navy-900"}`}
      >
        विद्यासेतु
      </span>
      <span
        className={`block text-[10.5px] font-semibold uppercase tracking-[0.14em] ${light ? "text-navy-200" : "text-navy-500"}`}
      >
        VidyaSetu · Learning Portal
      </span>
    </span>
  </span>
);

export async function SiteHeader() {
  const user = await getActiveUser();
  let xp = 0;
  if (user) {
    try {
      const [row] = await db
        .select({ x: sql<number>`coalesce(sum(${xpEvents.amount}), 0)` })
        .from(xpEvents)
        .where(eq(xpEvents.userId, user.id));
      xp = Number(row?.x ?? 0);
    } catch {
      xp = 0;
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b-2 border-saffron-500/70 bg-white/95 backdrop-blur">
      <div className="tricolor-strip h-1.5 w-full" aria-hidden="true" />
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
        <Link href="/home" className="shrink-0" aria-label="VidyaSetu home">
          <Wordmark />
        </Link>

        <nav aria-label="Primary" className="order-3 flex w-full items-center gap-1 text-[15px] font-semibold sm:order-none sm:w-auto sm:flex-1">
          {[
            { href: "/home", label: "Dashboard" },
            { href: "/leaderboard", label: "Leaderboard" },
            { href: "/account", label: "My Account" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-1.5 text-navy-700 transition hover:bg-navy-50 hover:text-navy-900"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <DataSaverToggle />
          {user && (
            <>
              <span
                className="hidden items-center gap-1.5 rounded-full border border-saffron-200 bg-saffron-50 px-3 py-1 text-sm font-bold text-saffron-700 md:inline-flex"
                title="Total experience points"
              >
                <GraduationCap className="h-4 w-4" /> {xp} XP
              </span>
              <span className="inline-flex max-w-[190px] items-center gap-2 rounded-full border border-line bg-white px-3 py-1">
                <UserRound className="h-4 w-4 shrink-0 text-navy-600" />
                <span className="truncate text-sm font-semibold text-navy-800">{user.name}</span>
                <span className="shrink-0 rounded-sm bg-navy-800 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  {user.isGuest ? "Guest" : user.role}
                </span>
              </span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
