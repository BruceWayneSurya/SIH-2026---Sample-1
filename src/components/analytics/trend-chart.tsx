"use client";

import { useMemo, useState } from "react";
import { TranslatedText as T, useTranslation } from "@/components/language-provider";
import { keyToDate, weekStartKey, addDaysKey } from "@/lib/analytics/model";
import type { TrendPoint } from "@/lib/analytics/model";

/**
 * Weekly average assessment accuracy over the last 3 or 6 months, drawn as
 * a smoothed SVG line (Catmull-Rom → cubic Bézier — no chart library).
 * Only weeks with at least one attempt become points, so the line never
 * invents data.
 */

const W = 560;
const H = 210;
const M = { top: 14, right: 14, bottom: 26, left: 36 };
const PLOT_W = W - M.left - M.right;
const PLOT_H = H - M.top - M.bottom;

type Pt = { x: number; y: number; week: string; avg: number; attempts: number };

function smoothPath(points: Pt[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    d += ` C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6}, ${
      p2.x - (p3.x - p1.x) / 6
    } ${p2.y - (p3.y - p1.y) / 6}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function TrendChart({ trend, today }: { trend: TrendPoint[]; today: string }) {
  const { t, language } = useTranslation();
  const [months, setMonths] = useState<3 | 6>(6);
  const [hover, setHover] = useState<Pt | null>(null);

  const locale = language === "en" ? "en-IN" : language;
  const monthFmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }),
    [locale],
  );

  const data = useMemo(() => {
    const weeks = months === 3 ? 13 : 26;
    const windowStart = weekStartKey(addDaysKey(today, -(weeks * 7 - 1)));
    const inWindow = trend.filter((p) => p.week >= windowStart && p.attempts > 0);
    const firstWeek = inWindow[0]?.week ?? windowStart;
    const lastWeek = inWindow[inWindow.length - 1]?.week ?? windowStart;
    const span = Math.max(1, Math.round((Date.parse(`${lastWeek}T00:00:00Z`) - Date.parse(`${firstWeek}T00:00:00Z`)) / 86_400_000 / 7));
    const points: Pt[] = inWindow.map((p) => ({
      ...p,
      x:
        M.left +
        (Math.round((Date.parse(`${p.week}T00:00:00Z`) - Date.parse(`${firstWeek}T00:00:00Z`)) / 86_400_000 / 7) /
          span) *
          PLOT_W,
      y: M.top + PLOT_H - (Math.max(0, Math.min(100, p.avg)) / 100) * PLOT_H,
    }));
    // month tick labels across the x axis
    const ticks: { x: number; label: string }[] = [];
    const seen = new Set<string>();
    for (const p of points) {
      const d = keyToDate(p.week);
      const monthKey = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
      if (!seen.has(monthKey)) {
        seen.add(monthKey);
        ticks.push({ x: p.x, label: monthFmt.format(d) });
      }
    }
    return { points, ticks };
  }, [trend, months, today, monthFmt]);

  const yFor = (pct: number) => M.top + PLOT_H - (pct / 100) * PLOT_H;
  const line = smoothPath(data.points);
  const area =
    data.points.length > 1
      ? `${line} L ${data.points[data.points.length - 1].x} ${M.top + PLOT_H} L ${data.points[0].x} ${M.top + PLOT_H} Z`
      : "";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-extrabold text-navy-900">
          <T>Accuracy trend</T>
        </h3>
        <div
          className="flex gap-1 rounded-lg bg-paper p-1"
          role="group"
          aria-label={t("Trend range")}
        >
          {([3, 6] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={months === m}
              onClick={() => setMonths(m)}
              className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                months === m
                  ? "bg-navy-800 text-white"
                  : "text-navy-600 hover:bg-navy-100"
              }`}
            >
              <T values={{ months: m }}>{"{months} months"}</T>
            </button>
          ))}
        </div>
      </div>

      {data.points.length < 2 ? (
        <p className="mt-6 rounded-lg border border-dashed border-navy-200 bg-navy-50/50 p-4 text-sm text-navy-700">
          <T>
            Take a few objective tests to start your accuracy trajectory — your
            weekly averages will appear here.
          </T>
        </p>
      ) : (
        <div className="relative mt-3">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-auto w-full"
            role="img"
            aria-label={t("Weekly average accuracy over the last {months} months", { months })}
            onMouseLeave={() => setHover(null)}
          >
            {/* gridlines + y labels */}
            {[0, 25, 50, 75, 100].map((pct) => (
              <g key={pct}>
                <line
                  x1={M.left}
                  y1={yFor(pct)}
                  x2={W - M.right}
                  y2={yFor(pct)}
                  stroke="var(--color-navy-100)"
                  strokeWidth={1}
                />
                <text
                  x={M.left - 6}
                  y={yFor(pct) + 3}
                  textAnchor="end"
                  fill="currentColor"
                  className="text-slate-500"
                  style={{ fontSize: "9px" }}
                >
                  {pct}%
                </text>
              </g>
            ))}
            {/* month ticks */}
            {data.ticks.map((tick) => (
              <text
                key={`${tick.label}-${tick.x}`}
                x={tick.x}
                y={H - 8}
                textAnchor="middle"
                fill="currentColor"
                className="text-slate-500"
                style={{ fontSize: "9px" }}
              >
                {tick.label}
              </text>
            ))}
            {/* area + line */}
            <path d={area} fill="var(--color-saffron-500)" fillOpacity={0.12} />
            <path
              d={line}
              fill="none"
              stroke="var(--color-saffron-600)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* points + hover targets */}
            {data.points.map((p) => (
              <g key={p.week}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={hover?.week === p.week ? 5 : 3}
                  fill="var(--color-saffron-600)"
                />
                <rect
                  x={p.x - PLOT_W / (data.points.length * 2)}
                  y={M.top}
                  width={PLOT_W / data.points.length}
                  height={PLOT_H}
                  fill="transparent"
                  onMouseEnter={() => setHover(p)}
                  onClick={() => setHover(p)}
                >
                  <title>{`${p.week}: ${p.avg}%`}</title>
                </rect>
              </g>
            ))}
          </svg>

          {hover && (
            <div
              className="heat-tip pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs shadow-lg"
              style={{
                left: `${(hover.x / W) * 100}%`,
                top: `${(hover.y / H) * 100 - 2}%`,
              }}
              role="status"
            >
              <p className="font-bold text-navy-900">
                {t("Week of {date}", {
                  date: new Intl.DateTimeFormat(locale, {
                    day: "numeric",
                    month: "short",
                    timeZone: "UTC",
                  }).format(keyToDate(hover.week)),
                })}
              </p>
              <p className="text-navy-700">
                {t("{avg}% average · {attempts} test(s)", {
                  avg: hover.avg,
                  attempts: hover.attempts,
                })}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
