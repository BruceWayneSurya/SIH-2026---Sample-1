import { TranslatedText as T } from "@/components/language-provider";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { Wordmark } from "./ui";

/** Standard Government of India portal footer: ownership, help and policies. */
export function SiteFooter() {
  return (
    <footer className="mt-10 bg-navy-900 text-navy-100">
      <div className="tricolor-strip h-1.5 w-full" aria-hidden="true" />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-3">
        <div>
          <Wordmark light />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-navy-200">
            <T>
              An open digital learning &amp; assessment portal aligned with the
              official NCERT curriculum, built for Class 6 to 10 students and
              educators.
            </T>
          </p>
          <p className="mt-3 text-xs text-navy-300">
            Content owned by: Department of School Education &amp; Literacy,
            Ministry of Education, Government of India.
          </p>
        </div>

        <div className="text-sm">
          <h3 className="mb-2 font-bold uppercase tracking-wider text-saffron-400">
            <T>Help &amp; Support</T>
          </h3>
          <ul className="space-y-1.5 text-navy-200">
            <li className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-saffron-400" aria-hidden="true" />
              Toll-free 1800-11-8004 (Mon–Sat, 8 AM – 8 PM IST)
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-saffron-400" aria-hidden="true" />
              support@pragyan.gov.in
            </li>
            <li>• NCERT learning-outcome IDs on every chapter</li>
            <li>• DIKSHA course code mapping schema</li>
          </ul>
        </div>

        <div className="text-sm">
          <h3 className="mb-2 font-bold uppercase tracking-wider text-saffron-400">
            <T>Policies &amp; Standards</T>
          </h3>
          <ul className="space-y-1.5 text-navy-200">
            <li>
              <Link className="underline underline-offset-2 hover:text-white" href="/about#policies">
                Website policies, terms of use &amp; privacy
              </Link>
            </li>
            <li>
              <Link className="underline underline-offset-2 hover:text-white" href="/about#accessibility">
                Accessibility statement (WCAG 2.1 AA)
              </Link>
            </li>
            <li>
              <Link className="underline underline-offset-2 hover:text-white" href="/about#faculty-verification">
                Faculty verification policy
              </Link>
            </li>
            <li>• Low-bandwidth data saver mode for rural connections</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-navy-800 px-4 py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 text-xs text-navy-300">
          <span>विद्या ही शक्ति है · Knowledge is Power — Pragyan © 2026</span>
          <span>
            Last reviewed:{" "}
            {new Date().toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </div>
    </footer>
  );
}
