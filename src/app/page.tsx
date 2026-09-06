import Link from "next/link";
import { ArrowRight, BookOpenCheck, Bot, CheckCircle2, GraduationCap, ListChecks, MessageCircle, NotebookPen, PlayCircle, ShieldCheck, Sparkles, Trophy, WifiOff } from "lucide-react";
import { Wordmark } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { DEMO_ACCOUNTS } from "@/lib/demo-accounts";

const features = [
  { icon: BookOpenCheck, title: "NCERT-aligned curriculum", text: "Class 7 & 8 mapped to NCERT Learning Outcomes and DIKSHA QR codes." },
  { icon: PlayCircle, title: "Faculty video lectures", text: "Topic-wise videos with chapter markers and downloadable slide decks." },
  { icon: ShieldCheck, title: "Peer-reviewed notes", text: "Students share text and Drive PDFs, classmates upvote, and faculty verify." },
  { icon: Trophy, title: "Gamified leaderboards", text: "Earn XP for tests, notes, and contributions. Climb class and chapter boards." },
  { icon: WifiOff, title: "Data-saver mode", text: "Built for low-bandwidth networks — lightweight by default, rich when you want it." },
  { icon: Bot, title: "AI tutor", text: "A floating AI assistant, plus a chapter tutor, quiz generator, and study notes." },
];
const aiFeatures = [
  { icon: MessageCircle, title: "Floating AI Chatbot", text: "Ask an NCERT question from anywhere. The orange button in the bottom-right opens your assistant." },
  { icon: GraduationCap, title: "Per-chapter AI Tutor", text: "Explore concepts step by step, with a tutor that knows which chapter you are studying." },
  { icon: ListChecks, title: "AI Quiz Generator", text: "On the Objective Test tab, generate fresh practice MCQs for any sub-topic of your chapter." },
  { icon: NotebookPen, title: "AI Study Notes", text: "Get a summary, key points, or a simple explanation of a chapter or sub-topic." },
];
const demoHref = (email: string, role: string) => `/login?role=${role}&email=${encodeURIComponent(email)}`;

export default function WelcomePage() {
  return (
    <main id="main">
      <div className="tricolor-strip h-1.5" aria-hidden="true" />
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link href="/" aria-label="Pragyan home"><Wordmark /></Link>
          <nav className="flex items-center gap-3 text-sm font-bold" aria-label="Welcome navigation"><ThemeToggle /><Link href="/login" className="rounded-lg px-3 py-2 text-navy-700 hover:bg-navy-50">Sign In</Link><Link href="/home" className="hidden items-center gap-2 rounded-lg bg-navy-800 px-4 py-2 text-white sm:inline-flex">Dashboard <ArrowRight className="h-4 w-4" /></Link></nav>
        </div>
      </header>
      <section className="gov-grid relative overflow-hidden bg-navy-900 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:gap-14 lg:py-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-saffron-400/30 bg-saffron-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-saffron-300"><Sparkles className="h-3.5 w-3.5" /> Smart India Hackathon 2026 · Team PRAGYAN</p>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.15] tracking-tight sm:text-5xl lg:text-[54px]">Open digital learning for <span className="text-saffron-400">every Indian classroom.</span></h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-navy-100">Pragyan (प्रज्ञान) brings NCERT-aligned video lectures, peer-reviewed community notes, PYQ assessments, gamified leaderboards, and a built-in AI tutor to Class 7 &amp; 8 students in rural and government schools — with a mode designed for low-bandwidth connections.</p>
            <div className="mt-7 flex flex-wrap gap-3"><Link href="/home" className="inline-flex items-center gap-2 rounded-lg bg-saffron-500 px-5 py-3 font-extrabold text-[#081f33] shadow-sm transition hover:bg-saffron-400">Continue to dashboard <ArrowRight className="h-4 w-4" /></Link></div>
            <div className="mt-3 flex flex-wrap gap-3 text-sm font-bold"><a href="/api/auth/guest?role=student" className="rounded-lg border border-white/25 px-4 py-2.5 text-white hover:bg-white/10">1-click Guest Student</a><a href="/api/auth/guest?role=faculty" className="rounded-lg border border-white/25 px-4 py-2.5 text-white hover:bg-white/10">1-click Guest Faculty</a></div>
            <ul className="mt-7 grid gap-2.5 text-xs text-navy-100 sm:grid-cols-2">{["Zero install — runs in any modern browser", "Data-saver for low-bandwidth networks", "Keyboard-friendly, accessible interfaces", "NCERT + DIKSHA + NDEAR aligned"].map((item) => <li key={item} className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-saffron-400" />{item}</li>)}</ul>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/5 p-5 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between"><span className="inline-flex items-center gap-2 rounded-full bg-leaf-500/15 px-3 py-1 text-xs font-bold text-green-300"><span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Live demo</span><GraduationCap className="h-5 w-5 text-saffron-400" /></div>
            <p className="mt-4 font-bold text-white">Choose a demo account to explore</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">{[DEMO_ACCOUNTS[0], DEMO_ACCOUNTS[1], DEMO_ACCOUNTS[3], DEMO_ACCOUNTS[2]].map((account) => <Link key={account.email} href={demoHref(account.email, account.role)} className="group rounded-xl border border-white/15 bg-navy-950/40 p-4 transition hover:border-saffron-400/60 hover:bg-navy-800">
              <span className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-extrabold ${account.role === "faculty" ? "bg-saffron-500 text-[#081f33]" : "bg-navy-200 text-[#0c2a43]"}`}>{account.label.split(" ").map((word) => word[0]).slice(0, 2).join("")}</span>
              <span className="block text-sm font-bold text-white">{account.label}</span><span className="mt-1 block text-xs text-navy-200">{account.role === "faculty" ? `${account.desc.split(" Faculty")[0]} · Faculty` : "Student · Class 8"}</span>
            </Link>)}</div>
            <div className="mt-5 grid grid-cols-4 gap-2 border-t border-white/15 pt-5 text-center">{[["6", "Subjects"], ["26+", "NCERT Chapters"], ["20", "PYQ MCQs / chapter"], ["15", "Subjective Qs / chapter"]].map(([value, label]) => <div key={label}><span className="block text-2xl font-extrabold text-saffron-300">{value}</span><span className="mt-1 block text-[10px] leading-snug text-navy-200">{label}</span></div>)}</div>
            <p className="mt-5 rounded-lg bg-saffron-500/10 p-3 text-xs leading-relaxed text-navy-100"><b className="text-saffron-300">Try the AI tutor:</b> click the orange <b>Ask Pragyan AI</b> button in the bottom-right corner of any page.</p>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-saffron-700">What’s inside</p><h2 className="mt-2 text-2xl font-extrabold text-navy-900 sm:text-3xl">Everything a Class 7–8 student actually needs</h2><p className="mt-3 text-slate-600">Built around the NCERT syllabus, with tools for both learners and teachers.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{features.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-xl border border-line bg-white p-6 shadow-sm"><span className="inline-flex rounded-lg bg-navy-50 p-2.5 text-navy-700"><Icon className="h-5 w-5" /></span><h3 className="mt-4 text-lg font-extrabold text-navy-900">{title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p></article>)}</div>
      </section>
      <section className="border-y border-saffron-200 bg-saffron-50/60">
        <div className="mx-auto max-w-6xl px-4 py-14"><p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.15em] text-saffron-700"><Sparkles className="h-4 w-4" /> New · AI-powered learning</p><h2 className="mt-3 max-w-3xl text-2xl font-extrabold text-navy-900 sm:text-3xl">A built-in AI tutor, quiz generator, and notes assistant</h2><p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">Powered by Groq, with the key kept safely on the server. Available in the chat bubble on every page and in each chapter. AI features require a configured server key; the rest of the portal works without one.</p>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{aiFeatures.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-xl border border-saffron-200 bg-white p-5"><Icon className="h-5 w-5 text-saffron-600" /><h3 className="mt-3 font-extrabold text-navy-900">{title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p></article>)}</div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-14">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-saffron-700">Try it in 1 click</p><h2 className="mt-2 text-2xl font-extrabold text-navy-900 sm:text-3xl">Pre-seeded demo accounts</h2><p className="mt-3 text-sm text-slate-600">No signup needed for evaluators and visitors. Choose a persona on the sign-in page, or use the guest buttons above.</p>
        <div className="mt-7 grid gap-8 md:grid-cols-2">{(["faculty", "student"] as const).map((role) => <div key={role}><h3 className="mb-3 flex items-center gap-2 font-extrabold text-navy-900"><GraduationCap className="h-5 w-5 text-saffron-600" />{role === "faculty" ? "Faculty / Teachers" : "Students"}</h3><div className="space-y-3">{DEMO_ACCOUNTS.filter((account) => account.role === role).map((account) => <Link key={account.email} href={demoHref(account.email, role)} className="block rounded-xl border border-line bg-white p-4 transition hover:border-navy-400 hover:shadow-sm"><span className="flex items-center justify-between gap-2"><b className="text-navy-900">{account.label}</b><span className="rounded bg-navy-50 px-2 py-0.5 text-[10px] font-bold uppercase text-navy-700">{role}</span></span><span className="mt-1 block text-sm text-slate-600">{account.desc}</span><span className="mt-2 block break-all text-xs font-semibold text-navy-600">{account.email} · demo123</span></Link>)}</div></div>)}</div>
        <div className="mt-8 flex flex-wrap gap-3"><Link href="/login" className="inline-flex items-center gap-2 rounded-lg bg-navy-800 px-5 py-2.5 text-sm font-bold text-white">Go to sign in <ArrowRight className="h-4 w-4" /></Link><Link href="/register" className="rounded-lg border border-navy-200 bg-white px-5 py-2.5 text-sm font-bold text-navy-700">Register a new account</Link></div>
      </section>
      <footer className="border-t border-line bg-navy-900 px-4 py-8 pb-24 text-center text-navy-200"><p className="text-sm font-bold text-white">Built for Smart India Hackathon 2026 — Team PRAGYAN</p><p className="mt-2 text-xs">NCERT · DIKSHA · NDEAR · Accessible learning · NIC-inspired design</p></footer>
    </main>
  );
}
