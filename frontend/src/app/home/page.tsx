import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoading } from "@/components/page-loading";
import HomeClient from "./home-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard — Pragyan (प्रज्ञान)",
};

export default function HomePage() {
  return (
    <Suspense fallback={<PageLoading label="Loading your dashboard…" />}>
      <HomeClient />
    </Suspense>
  );
}
