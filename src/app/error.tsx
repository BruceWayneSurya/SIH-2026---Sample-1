"use client";

import Link from "next/link";
import { TranslatedText as T } from "@/components/language-provider";

export default function PortalError({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-2xl font-extrabold text-navy-900">
        <T>We couldn’t load this page</T>
      </h1>
      <p className="mt-3 text-slate-600">
        <T>
          The learning service may be unavailable. Please try again. If you manage this
          deployment, check its database settings and /api/health.
        </T>
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-lg bg-navy-800 px-5 py-2 font-bold text-white"
      >
        <T>Try again</T>
      </button>
      <Link href="/" className="ml-4 text-sm font-bold text-navy-700 underline">
        <T>Back to welcome</T>
      </Link>
    </main>
  );
}
