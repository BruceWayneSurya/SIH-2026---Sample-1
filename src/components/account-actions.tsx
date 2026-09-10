"use client";

import {
  TranslatedText as T,
  useTranslation,
} from "@/components/language-provider";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, UserRound } from "lucide-react";

export function AccountActions() {
  const router = useRouter();
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function signOut() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok)
        throw new Error(t("Could not sign out. Please try again."));
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Could not sign out."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="my-5 flex flex-wrap items-center gap-3 text-sm font-bold">
      <Link
        href="/login"
        className="inline-flex items-center gap-2 rounded-lg border border-navy-200 bg-white px-4 py-2 text-navy-700"
      >
        <UserRound className="h-4 w-4" /> <T>Switch account</T>
      </Link>
      <button
        type="button"
        disabled={busy}
        onClick={() => void signOut()}
        className="inline-flex items-center gap-2 rounded-lg bg-navy-800 px-4 py-2 text-white disabled:opacity-50"
      >
        <LogOut className="h-4 w-4" />
        <T>{busy ? "Signing out…" : "Sign out"}</T>
      </button>
      {error && (
        <p role="alert" className="text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}
