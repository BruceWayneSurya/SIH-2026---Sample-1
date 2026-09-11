import { TranslatedText as T } from "@/components/language-provider";
import { Mail, Phone } from "lucide-react";

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
        <T>About this portal</T>
      </p>
      <h1 className="mt-1 text-3xl font-extrabold text-navy-900">
        <T>Pragyan — National Digital Learning Portal</T>
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
        <T>
          An open digital learning &amp; assessment portal aligned with the
          official NCERT curriculum, built for Class 6 to 10 students and
          educators.
        </T>{" "}
        <T>
          Every chapter carries NCERT learning-outcome IDs and a DIKSHA course
          code so that teaching, practice and reporting can be audited against
          the national curriculum framework.
        </T>
      </p>

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
                <T>{policy.title}</T>
              </dt>
              <dd className="mt-0.5 text-[15px] leading-relaxed text-slate-600">
                <T>{policy.body}</T>
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
          <T>
            The interface targets WCAG 2.1 AA: keyboard-navigable controls,
            visible focus, sufficient contrast, a dark theme, adjustable
            interface language (English, हिन्दी, తెలుగు, தமிழ், ಕನ್ನಡ,
            മലയാളം) and a data saver mode for low-bandwidth connections. Report
            a barrier on the helpline above and it will be fixed in the next
            release.
          </T>
        </p>
      </section>
    </div>
  );
}
