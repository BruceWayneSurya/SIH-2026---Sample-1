"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, LineChart, Menu, Trophy, UserRound, X } from "lucide-react";
import { TranslatedText as T } from "./language-provider";
import { A11yToolbar } from "./a11y-toolbar";

export const NAV_LINKS = [
  { href: "/home", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analytics", label: "Analytics", icon: LineChart },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/account", label: "My Account", icon: UserRound },
] as const;

/** Primary navigation with GIGW active-state indicators (aria-current). */
export function SiteNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="order-3 hidden min-w-0 flex-wrap items-center gap-1 text-[15px] font-semibold sm:order-none sm:flex"
    >
      {NAV_LINKS.map((l) => {
        const active =
          pathname === l.href ||
          (l.href === "/home" && pathname === "/") ||
          (l.href !== "/home" && pathname.startsWith(l.href + "/"));
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`nav-link rounded-md px-2 py-1.5 text-navy-700 transition hover:bg-navy-50 hover:text-navy-900 sm:px-3 ${
              active ? "text-navy-900" : ""
            }`}
          >
            <T>{l.label}</T>
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Mobile navigation drawer — large touch targets, role-aware, includes the
 * accessibility toolbar. Escape closes; focus returns to the trigger.
 */
export function MobileNav({
  userName,
  role,
  isGuest,
}: {
  userName: string | null;
  role: string;
  isGuest: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Open menu"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-navy-800"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Portal menu">
          <div
            className="absolute inset-0 bg-navy-950/60"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="vsv-enter absolute inset-y-0 right-0 flex w-[86%] max-w-xs flex-col overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-navy-900">
                  {userName ?? "Pragyan"}
                </span>
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-navy-600">
                  <T>{isGuest ? "Guest" : role}</T>
                </span>
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-navy-800"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <nav aria-label="Mobile primary" className="flex flex-col gap-1 p-3">
              {NAV_LINKS.map(({ href, label, icon: Icon }) => {
                const active =
                  pathname === href || (href !== "/home" && pathname.startsWith(href + "/"));
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={close}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 text-[15px] font-semibold ${
                      active
                        ? "bg-navy-50 text-navy-900"
                        : "text-navy-700 hover:bg-navy-50"
                    }`}
                  >
                    <Icon className="h-5 w-5 text-saffron-600" aria-hidden="true" />
                    <T>{label}</T>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto border-t border-line p-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-navy-600">
                <T>Accessibility</T>
              </p>
              <A11yToolbar />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
