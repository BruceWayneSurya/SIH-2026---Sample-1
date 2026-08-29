import { redirect } from "next/navigation";
import {
  MonitorPlay,
  FileCheck2,
  Trophy,
  MessagesSquare,
  Map,
  Gauge,
} from "lucide-react";
import { getSessionUser } from "@/lib/session";
import { LoginPanel } from "@/components/login-panel";

const FEATURES = [
  {
    icon: MonitorPlay,
    title: "Faculty-Verified Lectures",
    text: "Topic-wise video lectures with timestamped markers and downloadable slide attachments.",
  },
  {
    icon: MessagesSquare,
    title: "Peer Notes + Upvotes",
    text: "Crowdsourced notes ranked by helpfulness; faculty one-click green tick kills misinformation.",
  },
  {
    icon: FileCheck2,
    title: "90% PYQ Assessments",
    text: "20 MCQs per chapter drawn from real previous-year questions, with instant evaluation & XP.",
  },
  {
    icon: Trophy,
    title: "Gamified Leaderboards",
    text: "Class-wide and chapter-wise ranks with badges, XP and accuracy benchmarking.",
  },
];

export default async function Landing({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect("/home");
  const { error } = await searchParams;
  const notice =
    error === "guest"
      ? "Guest sign-in could not be completed. Please try again or use a demo account."
      : null;

  return (
    <div>
      <section className="bg-navy-900 text-white">
        <div className="gov-grid mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1.15fr_0.85fr] lg:py-16">
          <div className="vsv-enter">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-navy-600 bg-navy-800/70 px-3 py-1 text-[12px] font-bold uppercase tracking-[0.14em] text-saffron-400">
              <Map className="h-3.5 w-3.5" /> NCERT aligned · DIKSHA mapped · SIH Edition
            </p>
            <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
              विद्यासेतु
              <span className="mt-2 block text-2xl font-semibold text-navy-100 sm:text-3xl">
                Open Digital Learning &amp; Assessment Portal
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-navy-200">
              Class 7 &amp; 8 students get verified lectures, peer-reviewed notes, previous-year
              question assessments and a live peer leaderboard — on devices that use the
              data they are billed for.
            </p>
            <ul className="mt-6 grid gap-2.5 text-[15px] font-semibold text-navy-100 sm:grid-cols-2">
              {["Static-first, 3G-ready UI", "Guest 1-click demo access", "Faculty moderation pipeline", "Instant auto-evaluation + XP"].map(
                (t) => (
                  <li key={t} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-saffron-400" aria-hidden="true" />
                    {t}
                  </li>
                ),
              )}
            </ul>
          </div>
          <div id="login" className="vsv-enter self-start rounded-lg shadow-2xl">
            <LoginPanel notice={notice} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <article
              key={f.title}
              className="vsv-enter rounded-lg border border-line bg-white p-5 shadow-sm"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="mb-3 inline-flex rounded-md bg-navy-800 p-2.5 text-saffron-400">
                <f.icon className="h-5 w-5" />
              </span>
              <h2 className="text-[17px] font-bold text-navy-900">{f.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.text}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-line bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-bold text-navy-900">
              <Gauge className="h-5 w-5 text-saffron-600" /> How a chapter works
            </h2>
            <ol className="mt-4 space-y-3 text-[15px]">
              {[
                ["Pick your class → subject → chapter", "Every chapter carries NCERT learning-outcome IDs and a DIKSHA code."],
                ["Study in the Learning Hub", "Watch the faculty lecture, then read the top-ranked community notes."],
                ["Test Your Knowledge", "20 timed MCQs (90% PYQs) + 15 structured subjective questions with a model marking scheme."],
                ["Climb the leaderboard", "XP for correct answers, verified notes and practice — class-wide and per chapter."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-800 text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-bold text-navy-900">{t}</p>
                    <p className="text-sm text-slate-600">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-lg border border-navy-200 bg-navy-800 p-6 text-white shadow-sm">
            <h2 className="text-lg font-bold">Built for the last mile</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-navy-100">
              Government-school students often study on 2G/3G connections. VidyaSetu is
              <b> static-first</b>: text, notes and assessments render instantly, videos stream
              compressed and only on demand.
            </p>
            <div className="mt-4 rounded-md border border-navy-600 bg-navy-900/70 p-4 font-mono text-[13px] leading-relaxed text-navy-100">
              <p className="text-saffron-400"># note ranking formula</p>
              <p>rank = upvotes × 0.7 + (faculty_verified × 30)</p>
              <p className="mt-2 text-saffron-400"># xp engine</p>
              <p>+10 / correct MCQ · +30 / subjective set · +50 / note ≥ 10 upvotes</p>
            </div>
            <p className="mt-4 text-sm text-navy-200">
              Try the <b className="text-saffron-300">Data Saver</b> toggle in the header to see
              the low-bandwidth experience.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
