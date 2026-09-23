import { TranslatedText as T } from "@/components/language-provider";
import Link from "next/link";
import {
  Accessibility,
  ExternalLink,
  FileText,
  Link2,
  ShieldCheck,
} from "lucide-react";
import { Breadcrumbs, SectionHeading } from "@/components/ui";

export const dynamic = "force-dynamic";

const POLICIES = [
  {
    slug: "accessibility",
    icon: Accessibility,
    title: "Accessibility Statement",
    text: "Our commitment to WCAG 2.1 AA and GIGW compliance, and the accessibility tools built into this portal.",
  },
  {
    slug: "privacy",
    icon: ShieldCheck,
    title: "Privacy Policy",
    text: "What the portal stores, how student data is protected, and the controls available to every learner.",
  },
  {
    slug: "terms",
    icon: FileText,
    title: "Terms of Use",
    text: "Acceptable use of the portal, community content rules, and intellectual-property guidance.",
  },
  {
    slug: "hyperlinking",
    icon: Link2,
    title: "Hyperlinking Policy",
    text: "How other websites may link to this portal, and how we link out to external resources.",
  },
] as const;

export default function PoliciesIndex() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Breadcrumbs
        items={[
          { href: "/home", label: <T>Home</T> },
          { label: "Policies" },
        ]}
      />
      <SectionHeading
        eyebrow="Government of India portal"
        title="Website Policies"
        sub="Statutory policies governing the use, accessibility and content standards of the Pragyan learning portal, published in line with the Guidelines for Indian Government Websites."
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {POLICIES.map(({ slug, icon: Icon, title, text }) => (
          <Link
            key={slug}
            href={`/policies/${slug}`}
            className="card card-hover group p-6"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex rounded-lg border border-navy-200 bg-navy-50 p-2.5 text-navy-700">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <ExternalLink
                className="h-4 w-4 text-slate-400 transition group-hover:text-saffron-600"
                aria-hidden="true"
              />
            </div>
            <h2 className="mt-4 text-lg font-extrabold text-navy-900">
              <T>{title}</T>
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              <T>{text}</T>
            </p>
          </Link>
        ))}
      </div>

      <p className="mt-8 rounded-xl border border-navy-200 bg-navy-50/60 p-4 text-sm leading-relaxed text-slate-700">
        <T>
          These pages describe the standards this prototype follows. In a
          production deployment they would be reviewed and published by the
          Department of School Education &amp; Literacy.
        </T>
      </p>
    </div>
  );
}
