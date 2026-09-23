"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  Search,
  Trophy,
  UserRound,
} from "lucide-react";
import { TranslatedText as T } from "./language-provider";
import { CLASSES } from "@/lib/curriculum";

type Entry = {
  href: string;
  label: string;
  hint: string;
  group: "Pages" | "Classes" | "Actions";
  values?: Record<string, string | number>;
};

const ENTRIES: Entry[] = [
  { href: "/home", label: "Dashboard", hint: "Your learning home", group: "Pages" },
  { href: "/analytics", label: "Learning Analytics", hint: "Streaks, heatmap, skills", group: "Pages" },
  { href: "/leaderboard", label: "Leaderboard", hint: "Class and chapter boards", group: "Pages" },
  { href: "/account", label: "My Account", hint: "Profile and preferences", group: "Pages" },
  { href: "/about", label: "About this portal", hint: "Vision and standards", group: "Pages" },
  { href: "/report", label: "Progress Report", hint: "Printable report card", group: "Pages" },
  { href: "/login", label: "Sign In", hint: "Demo accounts available", group: "Pages" },
  ...CLASSES.map(
    (c) =>
      ({
        href: `/class/${c}`,
        label: "Class {classNo}",
        values: { classNo: c },
        hint: "Subjects and chapters",
        group: "Classes",
      }) as Entry,
  ),
  {
    href: "/api/auth/guest?role=student",
    label: "Continue as guest student",
    hint: "One click, no signup",
    group: "Actions",
  },
  {
    href: "/api/auth/guest?role=faculty",
    label: "Continue as guest faculty",
    hint: "One click, no signup",
    group: "Actions",
  },
];

const GROUP_ICONS = {
  Pages: LayoutDashboard,
  Classes: GraduationCap,
  Actions: BadgeCheck,
} as const;

/**
 * Global search / command palette (Ctrl+K or the header button). Filters the
 * portal's destinations instantly; free-text queries fall through to the full
 * chapter search page. Fully keyboard-driven and screen-reader labelled.
 */
export function SearchTrigger() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const openRef = useRef(false);
  const router = useRouter();

  const togglePalette = useCallback(() => {
    const next = !openRef.current;
    openRef.current = next;
    if (next) {
      setQuery("");
      setActive(0);
    }
    setOpen(next);
  }, []);

  const closePalette = useCallback(() => {
    openRef.current = false;
    setOpen(false);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        togglePalette();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [togglePalette]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? ENTRIES.filter(
          (e) =>
            e.label.toLowerCase().includes(q) || e.hint.toLowerCase().includes(q),
        )
      : ENTRIES;
    return list.slice(0, 9);
  }, [query]);

  const go = useCallback(
    (entry?: Entry) => {
      const target = entry ?? results[active];
      if (!target) {
        const q = query.trim();
        if (q) {
          closePalette();
          router.push(`/search?q=${encodeURIComponent(q)}`);
        }
        return;
      }
      closePalette();
      if (target.href.startsWith("/api/")) window.location.href = target.href;
      else router.push(target.href);
    },
    [active, query, results, router, closePalette],
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search the portal"
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-white pl-2.5 pr-2 text-navy-600 transition hover:border-navy-300 hover:text-navy-800"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        <span className="hidden text-[13px] font-semibold lg:inline">
          <T>Search</T>
        </span>
        <kbd className="hidden rounded border border-line bg-navy-50 px-1.5 py-0.5 text-[10px] font-bold text-navy-600 lg:inline">
          Ctrl K
        </kbd>
      </button>
    );
  }

  const showFallback = query.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Search the portal"
    >
      <div
        className="absolute inset-0 bg-navy-950/60"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <div className="vsv-enter relative w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-white shadow-2xl">
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <Search className="h-5 w-5 shrink-0 text-saffron-600" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") closePalette();
              else if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => (i + 1) % Math.max(results.length, 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive(
                  (i) => (i - 1 + Math.max(results.length, 1)) % Math.max(results.length, 1),
                );
              } else if (e.key === "Enter") {
                e.preventDefault();
                go();
              }
            }}
            placeholder="Search chapters, pages…"
            aria-label="Search chapters, pages"
            className="w-full bg-transparent text-[15px] font-semibold text-navy-900 outline-none placeholder:font-normal placeholder:text-slate-500"
            role="combobox"
            aria-expanded="true"
            aria-controls="search-results"
            aria-activedescendant={`search-option-${active}`}
          />
        </div>

        <ul id="search-results" role="listbox" className="max-h-[46vh] overflow-y-auto p-2">
          {results.map((entry, i) => {
            const Icon = GROUP_ICONS[entry.group];
            return (
              <li key={entry.href + entry.label} id={`search-option-${i}`} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onClick={() => go(entry)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${
                    i === active ? "bg-navy-50" : "hover:bg-navy-50/60"
                  }`}
                >
                  <Icon className="h-4.5 w-4.5 shrink-0 text-navy-600" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-navy-900">
                      <T values={entry.values}>{entry.label}</T>
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      <T>{entry.hint}</T>
                    </span>
                  </span>
                  <ArrowRight
                    className={`ml-auto h-4 w-4 shrink-0 text-saffron-600 ${i === active ? "opacity-100" : "opacity-0"}`}
                    aria-hidden="true"
                  />
                </button>
              </li>
            );
          })}

          {showFallback && (
            <li role="option" aria-selected={active === results.length} id={`search-option-${results.length}`}>
              <button
                type="button"
                onClick={() => go()}
                onMouseEnter={() => setActive(results.length)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${
                  active === results.length ? "bg-navy-50" : "hover:bg-navy-50/60"
                }`}
              >
                <Trophy className="h-4.5 w-4.5 shrink-0 text-saffron-600" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-navy-900">
                    <T values={{ query: query.trim() }}>
                      {"Search all chapters for “{query}”"}
                    </T>
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    <T>Full chapter search</T>
                  </span>
                </span>
              </button>
            </li>
          )}

          {!showFallback && (
            <li className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <T>Press Enter to open · Esc to close</T>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
