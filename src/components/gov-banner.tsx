import { Phone } from "lucide-react";
import { ChakraMark } from "./ui";
import { TranslatedText as T } from "@/components/language-provider";

/** Official identification strip shown above the portal navigation. */
export function GovBanner() {
  return (
    <div className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
        <span className="flex items-center gap-2.5">
          <ChakraMark className="h-8 w-8 text-navy-800 dark:text-saffron-400" />
          <span className="leading-tight">
            {/* The Devanagari name of the Union Government is fixed; it is the
                official designation, not UI copy. */}
            <span
              className="block text-[13px] font-extrabold text-navy-900 dark:text-white"
              lang="hi"
              style={{ fontFamily: "var(--font-deva), serif" }}
            >
              भारत सरकार
            </span>
            <span className="block text-[11px] font-bold uppercase tracking-wide text-navy-700 dark:text-navy-200">
              <T>Government of India</T>
            </span>
          </span>
        </span>

        <span className="hidden h-8 w-px bg-line sm:block" aria-hidden="true" />

        <span className="leading-tight">
          <span className="block text-[13px] font-bold text-navy-800 dark:text-navy-100">
            <T>Ministry of Education</T>
          </span>
          <span className="block text-[11px] font-semibold text-slate-600 dark:text-navy-200">
            <T>Department of School Education &amp; Literacy</T>
          </span>
        </span>

        <a
          href="#main"
          className="sr-only rounded-md bg-navy-800 px-3 py-1.5 text-[13px] font-bold text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50"
        >
          <T>Skip to main content</T>
        </a>

        <span className="ml-auto flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[12px] font-semibold text-slate-600 dark:text-navy-200">
          <span className="inline-flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-saffron-600" aria-hidden="true" />
            <T>Toll-free helpline 1800-11-8004</T>
          </span>
          <span className="hidden sm:inline">
            <T>Mon–Sat · 8 AM – 8 PM IST</T>
          </span>
        </span>
      </div>
    </div>
  );
}
