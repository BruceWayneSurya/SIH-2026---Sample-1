"use client";

import { useEffect, useState } from "react";
import { TranslatedText as T, useTranslation } from "@/components/language-provider";
import { BarChart3, CalendarRange, RefreshCcw } from "lucide-react";
import { SUBJECTS } from "@/lib/curriculum";
import type { AnalyticsPayload } from "@/lib/analytics/model";
import { ActivityHeatmap } from "./activity-heatmap";
import { StreakPanel } from "./streak-panel";
import { CompetencyRadar } from "./competency-radar";
import { TrendChart } from "./trend-chart";
import { DistributionDonut } from "./distribution-donut";
import { PercentileBar } from "./percentile-bar";

/**
 * Student Learning Analytics dashboard. One fetch → /api/analytics returns
 * the complete payload; every chart is inline SVG rendered on the client
 * from UTC day keys, so there is nothing timezone-sensitive to hydrate and
 * no chart library in the bundle. Data Saver mode freezes all transitions.
 */
export function AnalyticsDashboard({ userName }: { userName: string }) {
  const { t } = useTranslation();
  const [payload, setPayload] = useState<AnalyticsPayload | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/analytics")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("failed"))))
      .then((data: AnalyticsPayload) => {
        if (!cancelled) setPayload(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const subjectNames: Record<string, string> = {};
  for (const subject of SUBJECTS) subjectNames[subject.slug] = subject.name;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <span className="rounded-lg bg-navy-800 p-2.5 text-white">
          <BarChart3 className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold text-navy-900">
            <T>Learning Analytics</T>
          </h1>
          <p className="text-sm text-slate-500">
            <T values={{ name: userName }}>
              {"{name}'s year of practice, skills and momentum"}
            </T>
          </p>
        </div>
      </header>

      {failed && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
          <p className="font-bold">
            <T>Could not load your analytics right now.</T>
          </p>
          <button
            type="button"
            onClick={() => {
              setFailed(false);
              setPayload(null);
              fetch("/api/analytics")
                .then((res) => (res.ok ? res.json() : Promise.reject(new Error("failed"))))
                .then((data: AnalyticsPayload) => setPayload(data))
                .catch(() => setFailed(true));
            }}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-navy-800 px-3.5 py-2 text-xs font-bold text-white"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            <T>Try again</T>
          </button>
        </div>
      )}

      {!payload && !failed && (
        <div aria-busy="true" aria-label={t("Loading analytics")}>
          <div className="grid gap-4 lg:grid-cols-[1fr_270px]">
            <div className="h-56 animate-pulse rounded-xl border border-line bg-white" />
            <div className="h-56 animate-pulse rounded-xl border border-line bg-white" />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="h-72 animate-pulse rounded-xl border border-line bg-white" />
            <div className="h-72 animate-pulse rounded-xl border border-line bg-white" />
          </div>
        </div>
      )}

      {payload && (
        <div className="space-y-4">
          {/* Year-at-a-glance heatmap + streak metrics */}
          <section className="grid gap-4 lg:grid-cols-[1fr_270px]">
            <div className="rounded-xl border border-line bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                <CalendarRange className="h-5 w-5 text-leaf-600" aria-hidden="true" />
                <h2 className="text-base font-extrabold text-navy-900">
                  <T>Year of activity</T>
                </h2>
              </div>
              <ActivityHeatmap
                activity={payload.activity}
                today={payload.today}
                subjectNames={subjectNames}
              />
            </div>
            <StreakPanel
              current={payload.streaks.current}
              longest={payload.streaks.longest}
              activeDays={payload.streaks.activeDays}
              totalActivities={payload.streaks.totalActivities}
            />
          </section>

          {/* Competency radar + accuracy trend */}
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-line bg-white p-4 shadow-sm sm:p-5">
              <CompetencyRadar
                all={payload.radar.all}
                subjects={payload.radar.subjects}
                subjectsAvailable={payload.subjectsAvailable}
              />
            </div>
            <div className="rounded-xl border border-line bg-white p-4 shadow-sm sm:p-5">
              <TrendChart trend={payload.trend} today={payload.today} />
            </div>
          </section>

          {/* Practice mix + peer benchmark */}
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-line bg-white p-4 shadow-sm sm:p-5">
              <DistributionDonut distribution={payload.distribution} />
            </div>
            <div className="rounded-xl border border-line bg-white p-4 shadow-sm sm:p-5">
              {payload.percentile ? (
                <PercentileBar
                  percentile={payload.percentile.value}
                  cohort={payload.percentile.cohort}
                />
              ) : (
                <div className="flex h-full flex-col justify-center rounded-lg border border-dashed border-navy-200 bg-navy-50/50 p-4 text-center text-sm text-navy-700">
                  <p className="font-bold">
                    <T>Among your classmates</T>
                  </p>
                  <p className="mt-1">
                    <T>
                      Keep practising — as more classmates join your class,
                      you&apos;ll see how your momentum compares.
                    </T>
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
