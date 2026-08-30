import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoading } from "@/components/page-loading";
import AccountClient from "./account-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Account — Pragyan (प्रज्ञान)",
};

export default function AccountPage() {
  return (
    <Suspense fallback={<PageLoading label="Loading your account…" />}>
      <AccountClient />
    </Suspense>
  );
}
