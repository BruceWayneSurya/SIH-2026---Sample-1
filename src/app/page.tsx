import { TranslatedText as T } from "@/components/language-provider";
import Link from "next/link";
import { count } from "drizzle-orm";
import {
  ArrowRight,
  BookOpenCheck,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  ListChecks,
  MessageCircle,
  NotebookPen,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Trophy,
  WifiOff,
} from "lucide-react";
import { Wordmark } from "@/components/ui";
import { AppearanceControls } from "@/components/appearance-controls";
import { SiteFooter } from "@/components/footer";
import { DEMO_ACCOUNTS } from "@/lib/demo-accounts";
import { db } from "@/db";
import {
  chapters,
  mcqQuestions,
  notes,
  subjectiveQuestions,
  videos,
} from "@/db/schema";

export const dynamic = "force-dynamic";

const features = [
  {
    icon: BookOpenCheck,
    title: "NCERT-aligned curriculum",
    text: "Class 6 to 10 mapped to NCERT Learning Outcomes and DIKSHA QR codes.",
  },
  {
    icon: PlayCircle,
    title: "Faculty video lectures",
    text: "Topic-wise videos with chapter markers and downloadable slide decks.",
  },
  {
    icon: ShieldCheck,
    title: "Peer-reviewed notes",
    text: "Students share text and Drive PDFs, classmates upvote, and faculty verify.",
  },
  {
    icon: Trophy,
    title: "Gamified leaderboards",
    text: "Earn XP for tests, notes, and contributions. Climb class and chapter boards.",
  },
  {
    icon: WifiOff,
    title: "Data-saver mode",
    text: "Built for low-bandwidth networks — lightweight by default, rich when you want it.",
  },
  {
    icon: Bot,
    title: "AI tutor",
    text: "A floating AI assistant, plus a chapter tutor, quiz generator, and study notes.",
  },
];
const aiFeatures = [
  {
    icon: MessageCircle,
    title: "Floating AI Chatbot",
    text: "Ask an NCERT question from anywhere. The orange button in the bottom-right opens your assistant.",
  },
  {
    icon: GraduationCap,
    title: "Per-chapter AI Tutor",
    text: "Explore concepts step by step, with a tutor that knows which chapter you are studying.",
  },
  {
    icon: ListChecks,
    title: "AI Quiz Generator",
    text: "On the Objective Test tab, generate fresh practice MCQs for any sub-topic of your chapter.",
  },
  {
    icon: NotebookPen,
    title: "AI Study Notes",
    text: "Get a summary, key points, or a simple explanation of a chapter or sub-topic.",
  },
];
const steps = [
  {
    icon: GraduationCap,
    title: "Sign in or continue as guest",
    text: "Register with any email, use a one-click demo persona, or explore instantly as a guest.",
  },
  {
    icon: BookOpenCheck,
    title: "Learn chapter by chapter",
    text: "Watch faculty lectures, read peer notes verified by teachers, and ask the AI tutor anytime.",
  },
  {
    icon: ClipboardCheck,
    title: "Assess and improve",
    text: "Attempt PYQ tests, track streaks on your analytics heatmap, and climb the leaderboard.",
  },
];
const demoHref = (email: string, role: string) =>
  `/login?role=${role}&email=${encodeURIComponent(email)}`;

export default async function WelcomePage() {
  // Live portal statistics — real numbers from the seeded database.
  let stats = {
    chapters: 0,
    videos: 0,
    mcqs: 0,
    subjective: 0,
    notes: 0,
  };
  try {
    const [[ch], [vd], [mq], [sq], [nt]] = await Promise.all([
      db.select({ n: count() }).from(chapters),
      db.select({ n: count() }).from(videos),
      db.select({ n: count() }).from(mcqQuestions),
      db.select({ n: count() }).from(subjectiveQuestions),
      db.select({ n: count() }).from(notes),
    ]);
    stats = {
      chapters: Number(ch?.n ?? 0),
      videos: Number(vd?.n ?? 0),
      mcqs: Number(mq?.n ?? 0),
      subjective: Number(sq?.n ?? 0),
      notes: Number(nt?.n ?? 0),
    };
  } catch {
    // Landing still renders if the database is mid-setup.
  }

  const statItems = [
    [String(stats.chapters), "NCERT chapters", "chapters"],
    [String(stats.videos), "Faculty video lectures", "videos"],
    [String(stats.mcqs + stats.subjective), "Assessment questions", "questions"],
    [String(stats.notes), "Peer notes", "notes"],
  ] as const;

  return (
    <div id="main">
      <div className="tricolor-strip h-1.5" aria-hidden="true" />
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link href="/" aria-label="Pragyan home">
            <Wordmark />
          </Link>
          <nav
            className="flex items-center gap-3 text-sm font-bold"
            aria-label="Welcome navigation"
          >
            <AppearanceControls />
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-navy-700 hover:bg-navy-50"
            >
              <T>Sign In</T>
            </Link>
            <Link
              href="/home"
              className="hidden items-center gap-2 rounded-lg bg-navy-800 px-4 py-2 text-white sm:inline-flex"
            >
              <T>Dashboard</T> <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────  */}
      <section className="gov-grid relative overflow-hidden bg-navy-900 text-white">
        <div
          className="chakra-watermark -right-24 -top-28 h-[420px] w-[420px] opacity-[0.10] rotate-12 sm:h-[520px] sm:w-[520px]"
          aria-hidden="true"
        >
          <HeroChakra />
        </div>
        <div
          className="chakra-watermark -bottom-40 -left-32 h-[380px] w-[380px] opacity-[0.06] -rotate-12"
          aria-hidden="true"
        >
          <HeroChakra />
        </div>
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:gap-14 lg:py-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-saffron-400/30 bg-saffron-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-saffron-300">
              <Sparkles className="h-3.5 w-3.5" /> Ministry of Education ·
              Government of India
            </p>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.15] tracking-tight sm:text-5xl lg:text-[54px]">
              <T>Open digital learning for</T>{" "}
              <span className="text-saffron-400">
                <T>every Indian classroom.</T>
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-navy-100">
              <T>
                Pragyan (प्रज्ञान) brings NCERT-aligned video lectures,
                peer-reviewed community notes, PYQ assessments, gamified
                leaderboards, and a built-in AI tutor to Class 6 to 10
                students in rural and government schools — with a mode designed
                for low-bandwidth connections.
              </T>
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/home" className="btn-primary">
                <T>Continue to dashboard</T> <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-sm font-bold">
              <a
                href="/api/auth/guest?role=student"
                className="rounded-lg border border-white/25 px-4 py-2.5 text-white transition hover:bg-white/10"
              >
                <T>1-click Guest Student</T>
              </a>
              <a
                href="/api/auth/guest?role=faculty"
                className="rounded-lg border border-white/25 px-4 py-2.5 text-white transition hover:bg-white/10"
              >
                <T>1-click Guest Faculty</T>
              </a>
            </div>
            <ul className="mt-7 grid gap-2.5 text-xs text-navy-100 sm:grid-cols-2">
              {[
                "Zero install — runs in any modern browser",
                "Data-saver for low-bandwidth networks",
                "Keyboard-friendly, accessible interfaces",
                "NCERT + DIKSHA + NDEAR aligned",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-saffron-400" />
                  <T>{item}</T>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/5 p-5 shadow-2xl backdrop-blur-sm sm:p-6">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-full bg-leaf-500/15 px-3 py-1 text-xs font-bold text-green-300">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />{" "}
                <T>Live demo</T>
              </span>
              <GraduationCap className="h-5 w-5 text-saffron-400" />
            </div>
            <p className="mt-4 font-bold text-white">
              <T>Choose a demo account to explore</T>
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                DEMO_ACCOUNTS[0],
                DEMO_ACCOUNTS[1],
                DEMO_ACCOUNTS[3],
                DEMO_ACCOUNTS[2],
              ].map((account) => (
                <Link
                  key={account.email}
                  href={demoHref(account.email, account.role)}
                  className="group rounded-xl border border-white/15 bg-navy-950/40 p-4 transition hover:border-saffron-400/60 hover:bg-navy-800"
                >
                  <span
                    className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-extrabold ${account.role === "faculty" ? "bg-saffron-500 text-[#081f33]" : "bg-navy-200 text-[#0c2a43]"}`}
                  >
                    {account.label
                      .split(" ")
                      .map((word) => word[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <span className="block text-sm font-bold text-white">
                    {account.label}
                  </span>
                  <span className="mt-1 block text-xs text-navy-200">
                    <T>
                      {account.role === "faculty"
                        ? account.desc.split(" Faculty")[0]
                        : "Student"}
                    </T>{" "}
                    ·{" "}
                    {account.role === "faculty" ? (
                      <T>Faculty</T>
                    ) : (
                      <T values={{ classNo: 8 }}>{"Class {classNo}"}</T>
                    )}
                  </span>
                </Link>
              ))}
            </div>
            <p className="mt-5 rounded-lg bg-saffron-500/10 p-3 text-xs leading-relaxed text-navy-100">
              <b className="text-saffron-300">
                <T>Try the AI tutor:</T>
              </b>{" "}
              <T>click the orange</T>{" "}
              <b>
                <T>Ask Pragyan AI</T>
              </b>{" "}
              <T>button in the bottom-right corner of any page.</T>
            </p>
          </div>
        </div>
      </section>

      {/* ── Live statistics band ───────────────────────────────────────  */}
      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden px-4 py-8 sm:grid-cols-4">
          {statItems.map(([value, label, key]) => (
            <div key={key} className="px-2 text-center sm:px-6">
              <span className="block text-3xl font-extrabold tabular-nums text-navy-900 sm:text-4xl">
                {value}
                <span className="text-saffron-500">+</span>
              </span>
              <span className="mt-1 block text-[12px] font-bold uppercase tracking-wider text-slate-500">
                <T>{label}</T>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Standards alignment strip ──────────────────────────────────  */}
      <section className="border-b border-line bg-navy-50/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 py-5 text-center">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-navy-600">
            <T>Aligned with</T>
          </p>
          {["NCERT", "DIKSHA", "NDEAR", "NEP 2020", "GIGW · WCAG 2.1 AA"].map(
            (badge) => (
              <span
                key={badge}
                className="text-sm font-extrabold tracking-wide text-navy-800"
              >
                {badge}
              </span>
            ),
          )}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────  */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
        <p className="eyebrow">
          <T>What’s inside</T>
        </p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">
          <T>Everything a Class 6–10 student actually needs</T>
        </h2>
        <div className="tricolor-rule mt-3" aria-hidden="true" />
        <p className="mt-3 text-slate-600">
          <T>
            Built around the NCERT syllabus, with tools for both learners and
            teachers.
          </T>
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }, i) => (
            <article
              key={title}
              className={`card card-hover p-6 ${
                i === 0 ? "sm:col-span-2 lg:col-span-1" : ""
              }`}
            >
              <span
                className={`inline-flex rounded-lg border p-2.5 ${
                  i % 3 === 0
                    ? "border-saffron-200 bg-saffron-50 text-saffron-700"
                    : i % 3 === 1
                      ? "border-navy-200 bg-navy-50 text-navy-700"
                      : "border-leaf-100 bg-leaf-50 text-leaf-700"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-extrabold text-navy-900">
                <T>{title}</T>
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                <T>{text}</T>
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ── AI band ────────────────────────────────────────────────────  */}
      <section className="border-y border-saffron-200 bg-saffron-50/60">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <p className="inline-flex items-center gap-2 eyebrow">
            <Sparkles className="h-4 w-4" /> <T>New · AI-powered learning</T>
          </p>
          <h2 className="mt-3 max-w-3xl text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">
            <T>A built-in AI tutor, quiz generator, and notes assistant</T>
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
            <T>
              Powered by Groq, with the key kept safely on the server. Available
              in the chat bubble on every page and in each chapter. AI features
              require a configured server key; the rest of the portal works
              without one.
            </T>
          </p>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {aiFeatures.map(({ icon: Icon, title, text }) => (
              <article key={title} className="card card-hover p-5">
                <Icon className="h-5 w-5 text-saffron-600" />
                <h3 className="mt-3 font-extrabold text-navy-900">
                  <T>{title}</T>
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  <T>{text}</T>
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────  */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <p className="eyebrow">
          <T>How it works</T>
        </p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">
          <T>From sign-in to mastery in three steps</T>
        </h2>
        <div className="tricolor-rule mt-3" aria-hidden="true" />
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="relative">
              <div className="card card-hover h-full p-6">
                <div className="flex items-center justify-between">
                  <span className="inline-flex rounded-lg border border-navy-200 bg-navy-50 p-2.5 text-navy-700">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span
                    className="text-4xl font-black tabular-nums text-navy-100"
                    aria-hidden="true"
                  >
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-extrabold text-navy-900">
                  <T>{title}</T>
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  <T>{text}</T>
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Demo accounts ──────────────────────────────────────────────  */}
      <section className="border-t border-line bg-navy-50/60">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <p className="eyebrow">
            <T>Try it in 1 click</T>
          </p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">
            <T>Pre-seeded demo accounts</T>
          </h2>
          <p className="mt-3 text-sm text-slate-600">
            <T>
              No signup needed for evaluators and visitors. Choose a persona on
              the sign-in page, or use the guest buttons above.
            </T>
          </p>
          <div className="mt-7 grid gap-8 md:grid-cols-2">
            {(["faculty", "student"] as const).map((role) => (
              <div key={role}>
                <h3 className="mb-3 flex items-center gap-2 font-extrabold text-navy-900">
                  <GraduationCap className="h-5 w-5 text-saffron-600" />
                  <T>{role === "faculty" ? "Faculty / Teachers" : "Students"}</T>
                </h3>
                <div className="space-y-3">
                  {DEMO_ACCOUNTS.filter((account) => account.role === role).map(
                    (account) => (
                      <Link
                        key={account.email}
                        href={demoHref(account.email, role)}
                        className="card card-hover block p-4"
                      >
                        <span className="flex items-center justify-between gap-2">
                          <b className="text-navy-900">{account.label}</b>
                          <span className="rounded bg-navy-50 px-2 py-0.5 text-[10px] font-bold uppercase text-navy-700">
                            <T>{role}</T>
                          </span>
                        </span>
                        <span className="mt-1 block text-sm text-slate-600">
                          {account.desc}
                        </span>
                        <span className="mt-2 block break-all text-xs font-semibold text-navy-600">
                          {account.email} · demo123
                        </span>
                      </Link>
                    ),
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="btn-navy text-sm"
            >
              <T>Go to sign in</T> <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/register" className="btn-outline text-sm">
              <T>Register a new account</T>
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

/** Oversized Ashoka Chakra used as the hero watermark. */
function HeroChakra() {
  return (
    <svg viewBox="0 0 40 40" className="h-full w-full text-saffron-400" aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="20" cy="20" r="3" fill="currentColor" />
      {Array.from({ length: 24 }).map((_, i) => (
        <line
          key={i}
          x1="20"
          y1="20"
          x2="20"
          y2="4.5"
          stroke="currentColor"
          strokeWidth="0.9"
          transform={`rotate(${i * 15} 20 20)`}
        />
      ))}
    </svg>
  );
}
