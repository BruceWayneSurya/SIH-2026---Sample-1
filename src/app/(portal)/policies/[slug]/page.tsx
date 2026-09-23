import { TranslatedText as T } from "@/components/language-provider";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, Phone } from "lucide-react";
import { Breadcrumbs, SectionHeading } from "@/components/ui";

export const dynamic = "force-dynamic";

type Section = { heading: string; body: string[] };

const POLICY_CONTENT: Record<
  string,
  { title: string; intro: string; sections: Section[] }
> = {
  accessibility: {
    title: "Accessibility Statement",
    intro:
      "The Pragyan learning portal is built to be usable by every learner, including those who rely on assistive technology. We follow the Web Content Accessibility Guidelines (WCAG) 2.1 at AA level and the Guidelines for Indian Government Websites (GIGW).",
    sections: [
      {
        heading: "Standards we follow",
        body: [
          "Pages are structured with semantic HTML landmarks (banner, navigation, main content, footer) and pass keyboard-only navigation end to end. A visible focus ring is present on every interactive element, and a skip-to-main-content link is the first focusable item on each page.",
          "Colour is never the only means of conveying information. Text and interface contrasts meet or exceed the WCAG AA ratio of 4.5:1, verified in both light and dark themes.",
        ],
      },
      {
        heading: "Accessibility tools built into the portal",
        body: [
          "Text size — the A- / A / A+ control in the masthead scales the entire interface across three steps, and the choice is remembered on your device.",
          "High contrast — the contrast toggle switches the portal to a maximum-contrast palette with underlined links for low-vision users.",
          "Dark theme — a full dark mode is available and follows your system preference by default.",
          "Data saver — a low-bandwidth mode removes decorative images and animation for users on slow or metered connections.",
          "Languages — the interface can be used in English, Telugu, Hindi, Tamil, Kannada and Malayalam.",
        ],
      },
      {
        heading: "Assistive technology support",
        body: [
          "All forms label their controls, quizzes announce progress and results to screen readers, and the AI tutor chat is fully keyboard operable. The portal has been checked with the NVDA screen reader and keyboard-only navigation on Windows, and VoiceOver on iOS.",
        ],
      },
      {
        heading: "Feedback",
        body: [
          "If you encounter any accessibility barrier, write to support@pragyan.gov.in or call the toll-free helpline 1800-11-8004 (Mon–Sat, 8 AM – 8 PM IST). Accessibility feedback is treated as a defect and prioritised.",
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    intro:
      "This policy explains what information the Pragyan portal collects, why it is collected, and the choices available to you. The portal is designed for school students, so data minimisation is a core principle.",
    sections: [
      {
        heading: "Information we collect",
        body: [
          "Account data: your name, class, school and state, chosen during registration. Email addresses are used only for signing in — the portal never sends unsolicited mail.",
          "Learning data: assessment attempts, scores, notes you contribute, upvotes, streaks and analytics events. This powers your dashboards, leaderboards and analytics.",
          "AI tutor questions are processed by the configured AI provider to generate answers. Questions are sent without your password or personal identifiers.",
        ],
      },
      {
        heading: "What we do not do",
        body: [
          "No third-party advertising or tracking scripts are loaded. No student data is sold or shared with commercial partners. Guest sessions store nothing that identifies you after you sign out.",
        ],
      },
      {
        heading: "Your controls",
        body: [
          "You can review and update your profile from My Account, and sign out at any time. Appearance preferences (theme, text size, contrast, data saver) are stored only in your own browser.",
        ],
      },
      {
        heading: "Security",
        body: [
          "Passwords are stored as salted hashes, sessions use signed HTTP-only cookies, and note moderation is performed by verified faculty accounts only. In a production deployment the portal would undergo a security audit by CERT-In empanelled auditors before go-live.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of Use",
    intro:
      "By using the Pragyan portal you agree to these terms, which keep the learning community safe and useful for everyone.",
    sections: [
      {
        heading: "Acceptable use",
        body: [
          "Use the portal for learning and teaching only. Do not attempt to disrupt the service, scrape content at scale, or access accounts other than your own.",
          "Community notes must be your own work, relevant to the chapter, and free of copied copyrighted material. Faculty review and remove contributions that violate these rules.",
        ],
      },
      {
        heading: "Accounts",
        body: [
          "Faculty accounts carry moderation powers (verifying notes). In this prototype any email address can register as faculty; production deployments must provision faculty accounts through official invitations or directory sign-in.",
          "Guest accounts are for evaluation and demonstration, and may be cleared periodically.",
        ],
      },
      {
        heading: "Intellectual property",
        body: [
          "Curriculum structure and chapter titles follow NCERT textbooks. Video lectures are hosted by their creators and embedded by link; notes remain the property of their authors, licensed to the portal community for study purposes.",
        ],
      },
      {
        heading: "Availability",
        body: [
          "The portal is provided as a prototype for the Smart India Hackathon 2026 evaluation. Content is offered on a best-effort basis without warranty of uninterrupted availability.",
        ],
      },
    ],
  },
  hyperlinking: {
    title: "Hyperlinking Policy",
    intro:
      "This policy governs links between the Pragyan portal and other websites, per the Guidelines for Indian Government Websites.",
    sections: [
      {
        heading: "Linking to this portal",
        body: [
          "Educational institutions, government bodies and non-commercial websites may link to any page of this portal without prior permission, provided the link does not imply official endorsement by this portal.",
          "The portal must not be framed inside another website or presented as part of another application.",
        ],
      },
      {
        heading: "Links from this portal",
        body: [
          "External links (for example, PDF study material hosted on Google Drive and video lectures hosted on YouTube) are provided for learner convenience. The portal is not responsible for the content, availability or policies of external sites.",
          "Report broken or inappropriate external links to support@pragyan.gov.in so they can be reviewed by faculty moderators.",
        ],
      },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(POLICY_CONTENT).map((slug) => ({ slug }));
}

export default async function PolicyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const policy = POLICY_CONTENT[slug];
  if (!policy) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Breadcrumbs
        items={[
          { href: "/home", label: <T>Home</T> },
          { href: "/policies", label: <T>Policies</T> },
          { label: policy.title },
        ]}
      />
      <SectionHeading
        eyebrow="Government of India portal"
        title={policy.title}
      />
      <p className="mt-5 text-[15px] leading-relaxed text-slate-700">
        <T>{policy.intro}</T>
      </p>
      {/* Statutory bodies are published in English, per Government of India
          convention; the surrounding navigation and headings are translated. */}

      <div className="mt-8 space-y-8">
        {policy.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="flex items-center gap-2.5 text-lg font-extrabold text-navy-900">
              <span
                className="h-5 w-1.5 rounded-full bg-saffron-500"
                aria-hidden="true"
              />
              <T>{section.heading}</T>
            </h2>
            <div lang="en" className="mt-2.5 space-y-3 border-l-2 border-line pl-4 text-[14.5px] leading-relaxed text-slate-700">
              {section.body.map((para) => (
                <p key={para.slice(0, 40)}>{para}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="card mt-10 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-navy-700">
          <T>Questions about this policy?</T>
        </h2>
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-700">
          <span className="inline-flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-saffron-600" aria-hidden="true" />
            <T>Toll-free helpline 1800-11-8004</T>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-saffron-600" aria-hidden="true" />
            support@pragyan.gov.in
          </span>
        </p>
      </div>
    </div>
  );
}
