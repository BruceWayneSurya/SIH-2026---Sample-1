import { TranslatedText as T } from "@/components/language-provider";
import Link from "next/link";
import { GraduationCap, UserRound } from "lucide-react";
import { getActiveUser } from "@/lib/session";
import { DataSaverToggle } from "./data-saver-toggle";
import { AppearanceControls } from "./appearance-controls";
import { db } from "@/db";
import { xpEvents } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

import { Wordmark } from "./ui";
import { GovBanner } from "./gov-banner";
import { MobileNav, SiteNav } from "./site-nav";
import { SearchTrigger } from "./command-palette";
export { Wordmark } from "./ui";

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
    <>
    <GovBanner />
    <header className="sticky top-0 z-40 border-b-2 border-saffron-500/70 bg-white/95 backdrop-blur">
      <div className="tricolor-strip h-1.5 w-full" aria-hidden="true" />
      <div className="mx-auto flex max-w-6xl items-center gap-x-4 px-4 py-2.5">
        <Link href="/" className="shrink-0" aria-label="Pragyan home">
          <Wordmark />
        </Link>

        <SiteNav />

        <div className="ml-auto flex items-center gap-2">
          <SearchTrigger />
          <AppearanceControls />
          <DataSaverToggle />
          {user && (
            <>
              <span
                className="hidden items-center gap-1.5 rounded-full border border-saffron-200 bg-saffron-50 px-3 py-1 text-sm font-bold text-saffron-700 md:inline-flex"
                title="Total experience points"
              >
                <GraduationCap className="h-4 w-4" /> {xp} XP
              </span>
              <Link
                href="/account"
                aria-label="My account"
                className="hidden min-w-0 max-w-[190px] items-center gap-2 rounded-full border border-line bg-white px-3 py-1 sm:inline-flex"
              >
                <UserRound className="h-4 w-4 shrink-0 text-navy-600" />
                <span className="truncate text-sm font-semibold text-navy-800">
                  {user.name}
                </span>
                <span className="shrink-0 rounded-sm bg-navy-800 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  <T>{user.isGuest ? "Guest" : user.role}</T>
                </span>
              </Link>
            </>
          )}
          <MobileNav
            userName={user?.name ?? null}
            role={user?.role ?? "visitor"}
            isGuest={user?.isGuest ?? false}
          />
        </div>
      </div>
    </header>
    </>
  );
}
