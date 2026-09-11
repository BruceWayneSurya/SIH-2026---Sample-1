"use client";

import { TranslatedText as T } from "@/components/language-provider";
import { CalendarCheck, Flame, Trophy, Zap } from "lucide-react";

/** Streak & volume metrics shown beside the heatmap. */
export function StreakPanel({
  current,
  longest,
  activeDays,
  totalActivities,
}: {
  current: number;
  longest: number;
  activeDays: number;
  totalActivities: number;
}) {
  const tiles = [
    {
      icon: Flame,
      value: current,
      label: "Current streak",
      sub: "consecutive active days",
      tone: "border-saffron-200 bg-saffron-50 text-saffron-700",
      iconTone: "text-saffron-600",
    },
    {
      icon: Trophy,
      value: longest,
      label: "Longest streak",
      sub: "personal best",
      tone: "border-navy-200 bg-navy-50 text-navy-700",
      iconTone: "text-navy-500",
    },
    {
      icon: CalendarCheck,
      value: activeDays,
      label: "Active days",
      sub: "in the last year",
      tone: "border-leaf-100 bg-leaf-50 text-leaf-700",
      iconTone: "text-leaf-600",
    },
    {
      icon: Zap,
      value: totalActivities,
      label: "Practice sessions",
      sub: "in the last year",
      tone: "border-navy-200 bg-white text-navy-700",
      iconTone: "text-navy-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className={`flex items-center gap-3 rounded-lg border px-3.5 py-3 ${tile.tone}`}
        >
          <tile.icon className={`h-6 w-6 shrink-0 ${tile.iconTone}`} aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-xl font-extrabold leading-tight">
              <T values={{ count: tile.value }}>{"{count}"}</T>
            </p>
            <p className="text-[12px] font-bold leading-tight">
              <T>{tile.label}</T>
            </p>
            <p className="truncate text-[11px] opacity-80">
              <T>{tile.sub}</T>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
