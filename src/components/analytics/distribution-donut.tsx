"use client";

import { TranslatedText as T, useTranslation } from "@/components/language-provider";

/**
 * Question-distribution donut: how practice splits across objective tests,
 * written answers, AI recall drills and AI tutor sessions. Inline SVG ring
 * segments — no chart library.
 */

const R = 52;
const C = 2 * Math.PI * R;

const SEGMENTS = [
  { key: "quizzes", label: "Objective tests", color: "var(--color-navy-500)" },
  { key: "subjective", label: "Written answers", color: "var(--color-saffron-500)" },
  { key: "drills", label: "AI recall drills", color: "var(--color-leaf-500)" },
  { key: "aiSessions", label: "AI tutor chats", color: "var(--color-navy-200)" },
] as const;

type SegmentKey = (typeof SEGMENTS)[number]["key"];

export function DistributionDonut({
  distribution,
}: {
  distribution: Record<SegmentKey, number>;
}) {
  const { t } = useTranslation();
  const rows = SEGMENTS.map((s) => ({ ...s, value: distribution[s.key] ?? 0 }));
  const total = rows.reduce((sum, r) => sum + r.value, 0);

  const arcs = (() => {
    const out: { color: string; dash: number; offset: number }[] = [];
    if (total === 0) return out;
    let used = 0;
    for (const row of rows) {
      if (row.value <= 0) continue;
      const dash = (row.value / total) * C;
      out.push({ color: row.color, dash, offset: -used });
      used += dash;
    }
    return out;
  })();

  return (
    <div>
      <h3 className="text-base font-extrabold text-navy-900">
        <T>Practice mix</T>
      </h3>
      {total === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-navy-200 bg-navy-50/50 p-4 text-sm text-navy-700">
          <T>
            Your practice mix appears here as soon as you take a test, write an
            answer or revise with the AI tutor.
          </T>
        </p>
      ) : (
        <div className="mt-3 grid items-center gap-4 sm:grid-cols-[auto_1fr]">
          <svg
            viewBox="0 0 140 140"
            className="mx-auto h-auto w-full max-w-[150px]"
            role="img"
            aria-label={t("Practice mix across activity types")}
          >
            <g transform="rotate(-90 70 70)">
              <circle cx={70} cy={70} r={R} fill="none" stroke="var(--color-navy-100)" strokeWidth={16} />
              {arcs.map((arc, i) => (
                <circle
                  key={i}
                  cx={70}
                  cy={70}
                  r={R}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth={16}
                  strokeDasharray={`${Math.max(0, arc.dash - 2)} ${C}`}
                  strokeDashoffset={arc.offset}
                  strokeLinecap="butt"
                />
              ))}
            </g>
            <text
              x={70}
              y={66}
              textAnchor="middle"
              fill="currentColor"
              className="text-navy-900"
              style={{ fontSize: "22px", fontWeight: 800 }}
            >
              {total}
            </text>
            <text
              x={70}
              y={84}
              textAnchor="middle"
              fill="currentColor"
              className="text-slate-500"
              style={{ fontSize: "9px", fontWeight: 700 }}
            >
              {t("sessions")}
            </text>
          </svg>

          <ul className="space-y-2">
            {rows.map((row) => (
              <li key={row.key} className="flex items-center gap-2 text-[13px]">
                <span
                  className="inline-block h-3 w-3 shrink-0 rounded-sm"
                  style={{ background: row.color }}
                  aria-hidden="true"
                />
                <span className="font-bold text-navy-800">
                  <T>{row.label}</T>
                </span>
                <span className="ml-auto font-extrabold text-navy-900">
                  {row.value}
                  <span className="ml-1 text-[11px] font-bold text-slate-500">
                    {total > 0 ? `${Math.round((row.value / total) * 100)}%` : "0%"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
