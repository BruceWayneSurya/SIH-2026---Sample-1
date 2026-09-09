import { TranslatedText as T } from "@/components/language-provider";
import { BadgeCheck, Mail, Phone, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

const POLICIES = [
  {
    title: "Terms of use",
    body: "The portal publishes NCERT-aligned study material, faculty-verified notes and practice assessments for official, non-commercial educational use. Learners must not upload material they do not have the right to share.",
  },
  {
    title: "Privacy",
    body: "Only the details needed to run the portal are stored: name, class or subject, school or institution ID and a hashed password. Assessment records are used for progress reports and class leaderboards.",
  },
  {
    title: "Content ownership",
    body: "Chapter mapping, learning-outcome IDs and DIKSHA codes are published for academic audit. Community notes remain the property of their authors and are moderated by verified faculty.",
  },
  {
    title: "Grievance redressal",
    body: "Write to support@pragyan.gov.in or call the toll-free helpline 1800-11-8004 (Monday to Saturday, 8 AM – 8 PM IST). Grievances are acknowledged within three working days.",
  },
];

export default function About() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <p className="text-sm font-bold uppercase tracking-wider text-saffron-600">
        About this portal
      </p>
      <h1 className="mt-1 text-3xl font-extrabold text-navy-900">
        Pragyan — National Digital Learning Portal
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
        <T>
          An open digital learning &amp; assessment portal aligned with the
          official NCERT curriculum, built for Class 6 to 10 students and
          educators.
        </T>{" "}
        Every chapter carries NCERT learning-outcome IDs and a DIKSHA course
        code so that teaching, practice and reporting can be audited against the
        national curriculum framework.
      </p>

      <section
        id="faculty-verification"
        className="vsv-enter mt-8 rounded-lg border border-line bg-white p-5 shadow-sm"
      >
        <h2 className="flex items-center gap-2 text-lg font-bold text-navy-900">
          <ShieldCheck className="h-5 w-5 text-saffron-600" aria-hidden="true" />
          <T>Faculty verification policy</T>
        </h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-[15px] text-slate-700">
          <li>
            A teacher signs in or registers with the email ID issued by the
            school or department.
          </li>
          <li>
            A six-digit one-time code is sent to that mailbox. The code is valid
            for ten minutes, may be attempted five times and is never stored in
            plain form.
          </li>
          <li>
            Institutional addresses (…gov.in, …nic.in, …edu.in, …ac.in) are
            marked <b>verified</b> as soon as the mailbox is confirmed, which
            unlocks verification of community notes.
          </li>
          <li>
            Personal mailboxes (Gmail and similar) are accepted with review: the
            mailbox is confirmed, but a verified reviewer must confirm the
            institution before moderation rights are granted.
          </li>
        </ol>
        <p className="mt-3 inline-flex items-center gap-2 rounded-md border border-leaf-500/40 bg-leaf-50 px-3 py-2 text-[13px] font-bold text-leaf-700">
          <BadgeCheck className="h-4 w-4" aria-hidden="true" />
          Verification is mandatory — an unverified account cannot publish a
          verified note.
        </p>
      </section>

      <section
        id="policies"
        className="vsv-enter mt-6 rounded-lg border border-line bg-white p-5 shadow-sm"
      >
        <h2 className="text-lg font-bold text-navy-900">
          <T>Website policies</T>
        </h2>
        <dl className="mt-3 space-y-4">
          {POLICIES.map((policy) => (
            <div key={policy.title}>
              <dt className="text-[15px] font-bold text-navy-800">
                {policy.title}
              </dt>
              <dd className="mt-0.5 text-[15px] leading-relaxed text-slate-600">
                {policy.body}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] font-semibold text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-saffron-600" aria-hidden="true" />
            1800-11-8004
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-saffron-600" aria-hidden="true" />
            support@pragyan.gov.in
          </span>
        </p>
      </section>

      <section
        id="accessibility"
        className="vsv-enter mt-6 rounded-lg border border-line bg-white p-5 shadow-sm"
      >
        <h2 className="text-lg font-bold text-navy-900">
          <T>Accessibility statement</T>
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
          The interface targets WCAG 2.1 AA: keyboard-navigable controls, visible
          focus, sufficient contrast, a dark theme, adjustable interface
          language (English, हिन्दी, తెలుగు, தமிழ், ಕನ್ನಡ, മലയാളം) and a data
          saver mode for low-bandwidth connections. Report a barrier on the
          helpline above and it will be fixed in the next release.
        </p>
      </section>
    </div>
  );
}
