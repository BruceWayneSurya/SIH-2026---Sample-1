import { TranslatedText as T } from "@/components/language-provider";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { Wordmark } from "./ui";

/**
 * Standard Government of India portal footer: ownership and hosting
 * attribution, quick links, statutory policy links (each a real page),
 * helpline details and a review/date bar — arranged per GIGW guidance.
 */
export function SiteFooter() {
  return (
    <footer className="mt-10 bg-navy-900 text-navy-100">
      <div className="tricolor-strip h-1.5 w-full" aria-hidden="true" />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <Wordmark light />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-navy-200">
            <T>
              An open digital learning &amp; assessment portal aligned with the
              official NCERT curriculum, built for Class 6 to 10 students and
              educators.
            </T>
          </p>
          <p className="mt-4 text-xs leading-relaxed text-navy-300">
            <T>Content Owned and Maintained by:</T>{" "}
            <T>
              Department of School Education &amp; Literacy, Ministry of
              Education, Government of India
            </T>
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-navy-300">
            <T>Designed, developed and hosted by:</T>{" "}
            <T>Team Pragyan · Smart India Hackathon 2026</T>
          </p>
        </div>

        <div className="text-sm">
          <h3 className="mb-3 font-bold uppercase tracking-wider text-saffron-400">
            <T>Quick Links</T>
          </h3>
          <ul className="space-y-2 text-navy-200">
            <li>
              <Link className="underline-offset-2 hover:text-white hover:underline" href="/home">
                <T>Dashboard</T>
              </Link>
            </li>
            <li>
              <Link className="underline-offset-2 hover:text-white hover:underline" href="/analytics">
                <T>Learning Analytics</T>
              </Link>
            </li>
            <li>
              <Link className="underline-offset-2 hover:text-white hover:underline" href="/leaderboard">
                <T>Leaderboard</T>
              </Link>
            </li>
            <li>
              <Link className="underline-offset-2 hover:text-white hover:underline" href="/about">
                <T>About this portal</T>
              </Link>
            </li>
            <li>
              <Link className="underline-offset-2 hover:text-white hover:underline" href="/search">
                <T>Chapter search</T>
              </Link>
            </li>
            <li>
              <Link className="underline-offset-2 hover:text-white hover:underline" href="/report">
                <T>Progress report</T>
              </Link>
            </li>
          </ul>
        </div>

        <div className="text-sm">
          <h3 className="mb-3 font-bold uppercase tracking-wider text-saffron-400">
            <T>Policies &amp; Standards</T>
          </h3>
          <ul className="space-y-2 text-navy-200">
            <li>
              <Link className="underline-offset-2 hover:text-white hover:underline" href="/policies/accessibility">
                <T>Accessibility Statement</T>
              </Link>
            </li>
            <li>
              <Link className="underline-offset-2 hover:text-white hover:underline" href="/policies/privacy">
                <T>Privacy Policy</T>
              </Link>
            </li>
            <li>
              <Link className="underline-offset-2 hover:text-white hover:underline" href="/policies/terms">
                <T>Terms of Use</T>
              </Link>
            </li>
            <li>
              <Link className="underline-offset-2 hover:text-white hover:underline" href="/policies/hyperlinking">
                <T>Hyperlinking Policy</T>
              </Link>
            </li>
            <li>
              <Link className="underline-offset-2 hover:text-white hover:underline" href="/about#accessibility">
                <T>Accessibility statement (WCAG 2.1 AA)</T>
              </Link>
            </li>
          </ul>
        </div>

        <div className="text-sm">
          <h3 className="mb-3 font-bold uppercase tracking-wider text-saffron-400">
            <T>Help &amp; Support</T>
          </h3>
          <ul className="space-y-2 text-navy-200">
            <li className="flex items-start gap-2">
              <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-saffron-400" aria-hidden="true" />
              <T>Toll-free 1800-11-8004 (Mon–Sat, 8 AM – 8 PM IST)</T>
            </li>
            <li className="flex items-start gap-2">
              <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-saffron-400" aria-hidden="true" />
              support@pragyan.gov.in
            </li>
            <li>
              <T>Available in six Indian languages</T>
            </li>
            <li>
              <T>Low-bandwidth data saver mode for rural connections</T>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-navy-800 px-4 py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 text-xs text-navy-300">
          <span><T>विद्या ही शक्ति है · Knowledge is Power — Pragyan © 2026</T></span>
          <span className="inline-flex items-center gap-2">
            <span className="rounded-sm border border-navy-700 px-1.5 py-0.5 font-bold text-navy-200">
              v2.0
            </span>
            <span>
              <T>Last reviewed:</T>{" "}
              {new Date().toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          </span>
        </div>
      </div>
    </footer>
  );
}
