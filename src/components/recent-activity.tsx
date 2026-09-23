"use client";

import { useState } from "react";
import { History } from "lucide-react";
import { TranslatedText as T } from "./language-provider";
import { ActivityPanel, type ActivityEntry } from "./activity-panel";

/**
 * "Recent XP activity" card with a slide-in full history panel
 * (GIGW-friendly: all content reachable via keyboard, Esc closes).
 */
export function RecentActivityCard({
  entries,
  delay = "80ms",
}: {
  entries: ActivityEntry[];
  delay?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <section className="card card-hover vsv-enter p-5" style={{ animationDelay: delay }}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-bold text-navy-900">
            <History className="h-5 w-5 text-saffron-600" />{" "}
            <T>Recent XP activity</T>
          </h2>
          {entries.length > 0 && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-[12px] font-bold text-navy-700 transition hover:border-navy-300 hover:text-navy-900"
            >
              <T>Open history</T>
            </button>
          )}
        </div>
        {entries.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">
            <T>
              No activity yet. Take your first objective test to start earning
              XP!
            </T>
          </p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {entries.slice(0, 5).map((e) => (
              <li key={e.id} className="flex items-start gap-3">
                <span className="mt-0.5 rounded-md bg-saffron-50 px-2 py-0.5 text-[13px] font-extrabold text-saffron-700">
                  +{e.amount}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-navy-800">{e.note}</p>
                  <p className="text-[12px] text-slate-500">
                    {e.type} · {e.date}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <ActivityPanel
        open={open}
        onClose={() => setOpen(false)}
        entries={entries}
      />
    </>
  );
}
