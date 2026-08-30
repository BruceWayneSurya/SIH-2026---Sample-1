import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoading } from "@/components/page-loading";
import LeaderboardClient from "./leaderboard-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leaderboard — Pragyan (प्रज्ञान)",
};

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<PageLoading label="Loading leaderboard…" />}>
      <LeaderboardClient />
    </Suspense>
  );
}
