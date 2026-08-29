import { Wordmark } from "./header";

export function SiteFooter() {
  return (
    <footer className="mt-10 bg-navy-900 text-navy-100">
      <div className="tricolor-strip h-1.5 w-full" aria-hidden="true" />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-3">
        <div>
          <Wordmark light />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-navy-200">
            An open digital learning &amp; assessment portal aligned with the official NCERT
            curriculum, built for Class 7 &amp; 8 students and educators.
          </p>
        </div>
        <div className="text-sm">
          <h3 className="mb-2 font-bold uppercase tracking-wider text-saffron-400">
            Compliance &amp; Mapping
          </h3>
          <ul className="space-y-1.5 text-navy-200">
            <li>• NCERT learning-outcome IDs on every chapter</li>
            <li>• DIKSHA course code mapping schema</li>
            <li>• WCAG 2.1 AA contrast &amp; keyboard access</li>
            <li>• Static-first, low-bandwidth data saver mode</li>
          </ul>
        </div>
        <div className="text-sm">
          <h3 className="mb-2 font-bold uppercase tracking-wider text-saffron-400">
            Smart India Hackathon
          </h3>
          <p className="text-navy-200">
            SIH Edition — verified faculty content, crowdsourced notes with moderation, PYQ-driven
            assessments and a peer benchmarking engine.
          </p>
          <p className="mt-4 text-xs text-navy-300">
            A hackathon demonstration portal. Demo accounts use the password <b>demo123</b>.
          </p>
        </div>
      </div>
      <div className="border-t border-navy-800 py-3 text-center text-xs text-navy-300">
        विद्या ही शक्ति है · Knowledge is Power — VidyaSetu © 2025
      </div>
    </footer>
  );
}
