"use client";

import { useMemo, useState } from "react";
import { TranslatedText as T, useTranslation } from "@/components/language-provider";
import type { RadarView } from "@/lib/analytics/model";

/**
 * Five-axis competency radar, drawn as inline SVG: conceptual depth,
 * analytical reasoning, revision retention, curriculum coverage and
 * consistency. A filter switches between the holistic view and any subject
 * the student has data for. The values list beside the chart doubles as an
 * accessible, non-visual rendering of the same data.
 */

const DIMENSIONS: { key: keyof RadarView; label: string; hint: string }[] = [
  { key: "conceptual", label: "Conceptual Depth", hint: "Objective quiz accuracy — recent tests weigh more" },
  { key: "analytical", label: "Analytical Reasoning", hint: "Written subjective practice completed" },
  { key: "retention", label: "Revision Retention", hint: "AI recall-drill correctness" },
  { key: "coverage", label: "Curriculum Coverage", hint: "Share of your class's chapters practised" },
  { key: "consistency", label: "Consistency", hint: "Regular practice, independent of volume" },
];

const SIZE = 300;
const CENTER = SIZE / 2;
const RADIUS = 104;
const RINGS = [0.25, 0.5, 0.75, 1];

function axisPoint(index: number, value: number): [number, number] {
  // Pentagon: first axis points up, then clockwise.
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / DIMENSIONS.length;
  const r = (Math.max(0, Math.min(100, value)) / 100) * RADIUS;
  return [CENTER + r * Math.cos(angle), CENTER + r * Math.sin(angle)];
}

function ringPolygon(ratio: number): string {
  return DIMENSIONS.map((_, i) => axisPoint(i, ratio * 100).join(","))
    .join(" ");
}

export function CompetencyRadar({
  all,
  subjects,
  subjectsAvailable,
}: {
  all: RadarView;
  subjects: Record<string, RadarView>;
  subjectsAvailable: { slug: string; name: string }[];
}) {
  const { t } = useTranslation();
  const [scope, setScope] = useState<string>("all");

  const view = scope === "all" ? all : subjects[scope] ?? all;

  const polygon = useMemo(
    () =>
      DIMENSIONS.map((d, i) => axisPoint(i, view[d.key]).join(",")).join(" "),
    [view],
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-extrabold text-navy-900">
          <T>Skill diagnostic</T>
        </h3>
        <label className="flex items-center gap-1.5 text-xs font-bold text-navy-700">
          <span className="sr-only">
            <T>Subject view</T>
          </span>
          <select
            value={scope}
            onChange={(event) => setScope(event.target.value)}
            className="rounded-lg border border-line bg-paper px-2 py-1.5 text-xs font-bold text-navy-800"
          >
            <option value="all">{t("All subjects")}</option>
            {subjectsAvailable.map((subject) => (
              <option key={subject.slug} value={subject.slug}>
                {subject.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 grid items-center gap-4 sm:grid-cols-[auto_1fr]">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          width={SIZE}
          height={SIZE}
          className="mx-auto h-auto w-full max-w-[300px]"
          role="img"
          aria-label={t("Competency radar across five dimensions")}
        >
          {/* grid rings */}
          {RINGS.map((ring) => (
            <polygon
              key={ring}
              points={ringPolygon(ring)}
              fill="none"
              stroke="var(--color-navy-200)"
              strokeWidth={1}
            />
          ))}
          {/* axes */}
          {DIMENSIONS.map((_, i) => {
            const [x, y] = axisPoint(i, 100);
            return (
              <line
                key={i}
                x1={CENTER}
                y1={CENTER}
                x2={x}
                y2={y}
                stroke="var(--color-navy-200)"
                strokeWidth={1}
              />
            );
          })}
          {/* data polygon */}
          <polygon
            points={polygon}
            fill="var(--color-saffron-500)"
            fillOpacity={0.25}
            stroke="var(--color-saffron-600)"
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {/* data points */}
          {DIMENSIONS.map((d, i) => {
            const [x, y] = axisPoint(i, view[d.key]);
            return (
              <circle
                key={d.key}
                cx={x}
                cy={y}
                r={3.5}
                fill="var(--color-saffron-600)"
              />
            );
          })}
        </svg>

        {/* accessible values list */}
        <ul className="space-y-2.5">
          {DIMENSIONS.map((d) => {
            const value = Math.round(view[d.key]);
            return (
              <li key={d.key}>
                <div className="flex items-baseline justify-between gap-2 text-[13px]">
                  <span className="font-bold text-navy-800">
                    <T>{d.label}</T>
                  </span>
                  <span className="font-extrabold text-navy-900">{value}</span>
                </div>
                <div
                  className="mt-1 h-1.5 overflow-hidden rounded-full bg-navy-100"
                  role="presentation"
                >
                  <div
                    className="h-full rounded-full bg-saffron-500"
                    style={{ width: `${Math.max(2, value)}%` }}
                  />
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  <T>{d.hint}</T>
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
