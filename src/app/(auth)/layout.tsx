import Link from "next/link";
import { AppearanceControls } from "@/components/appearance-controls";
import { TranslatedText as T } from "@/components/language-provider";
import type { ReactNode } from "react";

/**
 * Auth shell — Government of India masthead framing around the sign-in and
 * registration forms: tricolor rule, appearance controls, chakra watermark
 * backdrop and a statutory footer strip with policy links.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main" className="relative min-h-screen overflow-hidden">
      <div className="tricolor-strip h-1.5" aria-hidden="true" />

      {/* faint institutional watermark */}
      <div
        className="chakra-watermark -left-24 bottom-10 h-[420px] w-[420px] opacity-[0.05] -rotate-12"
        aria-hidden="true"
      >
        <svg viewBox="0 0 40 40" className="h-full w-full text-navy-900">
          <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="20" cy="20" r="3" fill="currentColor" />
          {Array.from({ length: 24 }).map((_, i) => (
            <line key={i} x1="20" y1="20" x2="20" y2="4.5" stroke="currentColor" strokeWidth="0.9" transform={`rotate(${i * 15} 20 20)`} />
          ))}
        </svg>
      </div>

      <div className="relative mx-auto flex max-w-6xl justify-end px-4 pt-4">
        <AppearanceControls />
      </div>
      {children}

      <div className="relative mt-10 border-t border-line bg-white px-4 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-5 gap-y-2 text-center text-[12px] font-semibold text-slate-500">
          <T>
            Ministry of Education · Department of School Education &amp;
            Literacy · Government of India
          </T>
          <span className="hidden h-3 w-px bg-line sm:block" aria-hidden="true" />
          <Link href="/policies/accessibility" className="hover:text-navy-800 hover:underline">
            <T>Accessibility Statement</T>
          </Link>
          <Link href="/policies/privacy" className="hover:text-navy-800 hover:underline">
            <T>Privacy Policy</T>
          </Link>
          <Link href="/policies/terms" className="hover:text-navy-800 hover:underline">
            <T>Terms of Use</T>
          </Link>
          <span className="hidden h-3 w-px bg-line sm:block" aria-hidden="true" />
          <T>Toll-free helpline 1800-11-8004</T>
        </div>
      </div>
    </main>
  );
}
