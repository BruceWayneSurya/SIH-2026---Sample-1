"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, UserRound } from "lucide-react";
import { DataSaverToggle } from "./data-saver-toggle";
import { ThemeToggle } from "./theme-toggle";
import { Wordmark } from "./ui";
import { api } from "@/lib/api";
import type { ApiUser } from "@/lib/api";

export { ChakraMark, Wordmark } from "./ui";

export function SiteHeader() {
  const pathname = usePathname();
  const [user, setUser] = useState<ApiUser | null | undefined>(undefined);
  const [xp, setXp] = useState(0);

  useEffect(() => {
    let active = true;
    api
      .getMe()
      .then((data) => {
        if (!active) return;
        setUser(data.user);
        setXp(data.xp);
      })
      .catch(() => {
        if (active) setUser(null);
      });
    return () => {
      active = false;
    };
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b-2 border-saffron-500/70 bg-white/95 backdrop-blur">
      <div className="tricolor-strip h-1.5 w-full" aria-hidden="true" />
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
        <Link href="/home" className="shrink-0" aria-label="Pragyan home">
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
          <ThemeToggle />
          <DataSaverToggle />
          {user ? (
            <>
              <span
                className="hidden items-center gap-1.5 rounded-full border border-saffron-200 bg-saffron-50 px-3 py-1 text-sm font-bold text-saffron-700 md:inline-flex"
                title="Total experience points"
              >
                <GraduationCap className="h-4 w-4" /> {xp} XP
              </span>
              <Link
                href="/account"
                className="inline-flex max-w-[210px] items-center gap-2 rounded-full border border-line bg-white px-3 py-1 transition hover:border-navy-400 hover:shadow-xs"
                title="View profile and switch accounts"
              >
                <UserRound className="h-4 w-4 shrink-0 text-navy-600" />
                <span className="truncate text-sm font-semibold text-navy-800">{user.name}</span>
                <span className={`shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${user.role === "faculty" ? "bg-saffron-600" : "bg-navy-800"}`}>
                  {user.isGuest ? "Guest" : user.role}
                </span>
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-md bg-navy-800 px-3.5 py-1.5 text-sm font-bold text-white transition hover:bg-navy-700"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
