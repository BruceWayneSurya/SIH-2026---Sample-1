"use client";

import { useMemo, useState } from "react";
import { TranslatedText as T, useTranslation } from "@/components/language-provider";
import { addDaysKey, diffDays, heatTier, keyToDate, weekStartKey } from "@/lib/analytics/model";
import type { ActivityDay } from "@/lib/analytics/model";

/**
 * Year-at-a-glance activity heatmap — a GitHub-style 53-week × 7-weekday
 * grid rendered as one inline SVG (no chart library). Intensity tiers come
 * from CSS variables, so light/dark/high-contrast themes restyle the grid
 * without a re-render, and Data Saver mode freezes transitions.
 *
 * Hydration safety: the server never renders this grid. The client builds
 * it from UTC day keys shipped by the API, so server/client timezone
 * offsets can never disagree.
 */

const CELL = 11;
const GAP = 3;
const PITCH = CELL + GAP;
const LABEL_W = 30;
const MONTH_H = 18;

type Cell = {
  key: string;
  week: number;
  dow: number;
  tier: 0 | 1 | 2 | 3 | 4;
  day: ActivityDay | null;
};

export function ActivityHeatmap({
  activity,
  today,
  subjectNames,
}: {
  activity: ActivityDay[];
  today: string;
  /** slug → display name, for tooltip subject chips. */
  subjectNames: Record<string, string>;
}) {
  const { language, t } = useTranslation();
  const [hover, setHover] = useState<{ key: string; left: number; top: number } | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, ActivityDay>();
    for (const day of activity) map.set(day.d, day);
    return map;
  }, [activity]);

  const locale = language === "en" ? "en-IN" : language;

  const grid = useMemo(() => {
    const start = addDaysKey(today, -364);
    const gridStart = weekStartKey(start); // Monday alignment
    const weeks = Math.ceil((diffDays(gridStart, today) + 1) / 7);
    const cells: Cell[] = [];
    const monthLabels: { week: number; label: string }[] = [];
    const monthFmt = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" });
    const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });

    for (let w = 0; w < weeks; w++) {
      let monthLabelled = false;
      for (let dow = 0; dow < 7; dow++) {
        const key = addDaysKey(gridStart, w * 7 + dow);
        if (key < start || key > today) continue;
        const day = byDay.get(key) ?? null;
        const volume = day ? day.q + day.s + day.a + day.f : 0;
        cells.push({ key, week: w, dow, tier: heatTier(volume), day });
        if (!monthLabelled && keyToDate(key).getUTCDate() <= 7 && w > 0) {
          monthLabels.push({ week: w, label: monthFmt.format(keyToDate(key)) });
          monthLabelled = true;
        }
      }
    }
    // Mon / Wed / Fri labels from the first full week of the grid.
    const weekdayLabels = [0, 2, 4].map((dow) => ({
      dow,
      label: weekdayFmt.format(keyToDate(addDaysKey(gridStart, dow))),
    }));

    return { cells, monthLabels, weekdayLabels, weeks };
  }, [byDay, today, locale]);

  const vbWidth = LABEL_W + grid.weeks * PITCH;
  const vbHeight = MONTH_H + 7 * PITCH;
  const dateFmt = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  const hoverDay = hover ? byDay.get(hover.key) : undefined;
  const activeDays = activity.length;

  function cellHandlers(key: string, week: number, dow: number) {
    const left = ((LABEL_W + week * PITCH + CELL / 2) / vbWidth) * 100;
    const top = ((MONTH_H + dow * PITCH + CELL) / vbHeight) * 100;
    return {
      onMouseEnter: () => setHover({ key, left, top }),
      onClick: () => setHover((prev) => (prev?.key === key ? null : { key, left, top })),
    };
  }

  return (
    <div>
      <div className="relative overflow-x-auto pb-1">
        <svg
          viewBox={`0 0 ${vbWidth} ${vbHeight}`}
          width={vbWidth}
          height={vbHeight}
          className="heat-grid"
          role="img"
          aria-label={t("{days} active days in the last year", { days: activeDays })}
          onMouseLeave={() => setHover(null)}
        >
          {/* month labels */}
          {grid.monthLabels.map(({ week, label }) => (
            <text
              key={`m-${week}`}
              x={LABEL_W + week * PITCH}
              y={12}
              fill="currentColor"
              className="text-slate-500"
              style={{ fontSize: "9px" }}
            >
              {label}
            </text>
          ))}
          {/* weekday labels: Mon / Wed / Fri */}
          {grid.weekdayLabels.map(({ dow, label }) => (
            <text
              key={`d-${dow}`}
              x={0}
              y={MONTH_H + dow * PITCH + CELL}
              fill="currentColor"
              className="text-slate-500"
              style={{ fontSize: "9px" }}
            >
              {label}
            </text>
          ))}
          {/* day cells */}
          {grid.cells.map((cell) => (
            <rect
              key={cell.key}
              x={LABEL_W + cell.week * PITCH}
              y={MONTH_H + cell.dow * PITCH}
              width={CELL}
              height={CELL}
              rx={2}
              className={`heat-cell ${hover?.key === cell.key ? "heat-cell-hover" : ""}`}
              fill={`var(--heat-${cell.tier})`}
              aria-hidden="true"
              {...cellHandlers(cell.key, cell.week, cell.dow)}
            />
          ))}
        </svg>

        {/* hover / tap tooltip — placed below the cell so it never clips */}
        {hover && (
          <div
            className="heat-tip pointer-events-none absolute z-10 w-48 -translate-x-1/2 rounded-lg border border-line bg-white p-2.5 text-xs shadow-lg"
            style={{
              left: `${Math.min(86, Math.max(14, hover.left))}%`,
              top: `calc(${hover.top}% + 6px)`,
            }}
            role="status"
          >
            <p className="font-bold text-navy-900">{dateFmt.format(keyToDate(hover.key))}</p>
            {hoverDay ? (
              <>
                <p className="mt-0.5 text-navy-700">
                  {t("{count} activities · {xp} XP", {
                    count: hoverDay.q + hoverDay.s + hoverDay.a + hoverDay.f,
                    xp: hoverDay.xp,
                  })}
                </p>
                {hoverDay.subjects.length > 0 && (
                  <p className="mt-0.5 text-slate-500">
                    {t("Practised: {subjects}", {
                      subjects: hoverDay.subjects
                        .slice(0, 3)
                        .map((s) => subjectNames[s] ?? s)
                        .join(", "),
                    })}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-0.5 text-slate-500">
                <T>No activity recorded</T>
              </p>
            )}
          </div>
        )}
      </div>

      {/* legend */}
      <div className="mt-2 flex items-center justify-end gap-1.5 text-[11px] text-slate-500">
        <T>Less</T>
        {[0, 1, 2, 3, 4].map((tier) => (
          <span
            key={tier}
            className="inline-block h-3 w-3 rounded-sm"
            style={{ background: `var(--heat-${tier})` }}
            aria-hidden="true"
          />
        ))}
        <T>More</T>
      </div>
    </div>
  );
}
