"use client";

import { TranslatedText as T, useTranslation } from "@/components/language-provider";
import { percentileBand } from "@/lib/analytics/model";

/**
 * Peer benchmark — deliberately rank-free. Students see which fraction of
 * classmates they are ahead of (XP percentile) with encouraging copy; the
 * leaderboard-style "you are Nth" number never appears. Hidden entirely when
 * the cohort is too small to compare meaningfully.
 */
export function PercentileBar({
  percentile,
  cohort,
}: {
  percentile: number;
  cohort: number;
}) {
  const { t } = useTranslation();
  const band = percentileBand(percentile);

  return (
    <div>
      <h3 className="text-base font-extrabold text-navy-900">
        <T>Among your classmates</T>
      </h3>
      <div
        className="mt-4 h-3.5 overflow-hidden rounded-full bg-navy-100"
        role="img"
        aria-label={t("Ahead of {percent}% of your class", { percent: percentile })}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-navy-500 to-saffron-500"
          style={{ width: `${Math.max(3, percentile)}%` }}
        />
      </div>
      <p className="mt-2.5 text-sm font-bold text-navy-800">
        {band === "top-quarter" ? (
          <T values={{ percent: percentile }}>
            {"Ahead of {percent}% of your class — top quarter!"}
          </T>
        ) : band === "upper-half" ? (
          <T values={{ percent: percentile }}>
            {"Ahead of {percent}% of your class — solidly in the upper half."}
          </T>
        ) : (
          <T>Every session counts — your momentum is building.</T>
        )}
      </p>
      <p className="mt-0.5 text-[11px] text-slate-500">
        <T values={{ count: cohort }}>{"Compared with {count} classmates by total XP earned"}</T>
      </p>
    </div>
  );
}
