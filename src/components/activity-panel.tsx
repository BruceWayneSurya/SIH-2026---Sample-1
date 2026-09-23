"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Clock, X } from "lucide-react";
import { TranslatedText as T } from "./language-provider";

export type ActivityEntry = {
  id: number;
  note: string;
  type: string;
  amount: number;
  date: string;
  href?: string;
};

/**
 * Slide-in learning history panel — the dashboard's "open history" affordance.
 * Esc / backdrop close; focus moves to the panel and returns on close.
 */
export function ActivityPanel({
  open,
  onClose,
  entries,
}: {
  open: boolean;
  onClose: () => void;
  entries: ActivityEntry[];
}) {
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFocused(true);
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Learning history">
      <div className="absolute inset-0 bg-navy-950/60" onClick={onClose} aria-hidden="true" />
      <div className="vsv-enter absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-navy-900">
            <Clock className="h-4 w-4 text-saffron-600" /> <T>Learning history</T>
          </h2>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            aria-label="Close history"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-navy-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {entries.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line p-4 text-sm text-slate-500">
              <T>No activity yet. Take your first objective test to start earning XP!</T>
            </p>
          ) : (
            <ul className="space-y-2">
              {entries.map((e) => (
                <li key={e.id}>
                  {e.href ? (
                    <Link
                      href={e.href}
                      className="flex items-center gap-3 rounded-lg border border-line p-3 transition hover:border-navy-300 hover:bg-navy-50"
                    >
                      <span className="shrink-0 rounded-md bg-saffron-50 px-2 py-1 text-[13px] font-extrabold text-saffron-700">
                        +{e.amount}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold text-navy-800">
                          {e.note}
                        </span>
                        <span className="block text-[12px] text-slate-500">
                          {e.type} · {e.date}
                        </span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-saffron-600" />
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 rounded-lg border border-line p-3">
                      <span className="shrink-0 rounded-md bg-saffron-50 px-2 py-1 text-[13px] font-extrabold text-saffron-700">
                        +{e.amount}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold text-navy-800">
                          {e.note}
                        </span>
                        <span className="block text-[12px] text-slate-500">
                          {e.type} · {e.date}
                        </span>
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-line p-4">
          <Link href="/report" className="btn-navy w-full justify-center py-2.5 text-sm">
            <T>Open printable Progress Report</T>
          </Link>
        </div>
      </div>
    </div>
  );
}
