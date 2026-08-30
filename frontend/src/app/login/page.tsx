"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserRound,
  ArrowRight,
  Loader2,
  Lock,
  Mail,
  AlertCircle,
} from "lucide-react";
import { Wordmark } from "@/components/ui";

const DEMO_ACCOUNTS = [
  {
    role: "faculty",
    label: "Ms. Anita Sharma",
    desc: "Science Faculty · SCH-GJ-204 · Gujarat",
    email: "anita.sharma@pragyan.gov.in",
    pw: "demo123",
  },
  {
    role: "faculty",
    label: "Ravi Verma",
    desc: "Mathematics Faculty · SCH-MH-112 · Maharashtra",
    email: "ravi.verma@pragyan.gov.in",
    pw: "demo123",
  },
  {
    role: "student",
    label: "Aarav Patel",
    desc: "Class 8 Student · Shiksha Kendra, Rajkot",
    email: "aarav@student.in",
    pw: "demo123",
  },
  {
    role: "student",
    label: "Diya Mehta",
    desc: "Class 8 Student · KV, Ahmedabad · Rank #1",
    email: "diya@student.in",
    pw: "demo123",
  },
  {
    role: "student",
    label: "Arjun Thakur",
    desc: "Class 7 Student · Shiksha Kendra, Patna",
    email: "arjun@student.in",
    pw: "demo123",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"student" | "faculty">("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Login failed. Please check your credentials.");
      }

      router.push("/home");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (em: string, pw: string) => {
    setEmail(em);
    setPassword(pw);
    setError(null);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mx-auto max-w-md text-center">
        <div className="inline-flex justify-center">
          <Wordmark />
        </div>
        <h1 className="mt-4 text-2xl font-extrabold text-navy-900 sm:text-3xl">
          Sign In to Pragyan (प्रज्ञान)
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Open Digital Learning &amp; Assessment Portal (SIH Edition)
        </p>
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_360px]">
        {/* Main Login Box */}
        <div className="rounded-xl border border-line bg-white p-6 shadow-sm sm:p-8">
          {/* Role selector tabs */}
          <div className="mb-6 flex rounded-lg border border-line bg-paper p-1">
            <button
              type="button"
              onClick={() => {
                setRole("student");
                setError(null);
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-sm font-extrabold transition ${
                role === "student"
                  ? "bg-navy-800 text-white shadow-sm"
                  : "text-navy-700 hover:text-navy-950"
              }`}
            >
              <UserRound className="h-4 w-4" />
              Student Portal
            </button>
            <button
              type="button"
              onClick={() => {
                setRole("faculty");
                setError(null);
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-sm font-extrabold transition ${
                role === "faculty"
                  ? "bg-navy-800 text-white shadow-sm"
                  : "text-navy-700 hover:text-navy-950"
              }`}
            >
              <GraduationCap className="h-4 w-4" />
              Faculty / Teacher
            </button>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-navy-800">
                Email Address or Registered Mobile
              </label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    role === "student"
                      ? "e.g. aarav@student.in"
                      : "e.g. anita.sharma@vidyasetu.gov.in"
                  }
                  className="w-full rounded-lg border border-line bg-paper py-2.5 pl-10 pr-3 text-[15px] font-medium text-navy-950 transition focus:border-navy-600 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-navy-800">
                Password
              </label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-line bg-paper py-2.5 pl-10 pr-3 text-[15px] font-medium text-navy-950 transition focus:border-navy-600 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-navy-800 py-3 text-[15px] font-bold text-white shadow-sm transition hover:bg-navy-700 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Sign In as {role === "faculty" ? "Faculty" : "Student"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* SIH Value Addition: 1-Click Instant Evaluator Mode */}
          <div className="mt-6 border-t border-line pt-5">
            <p className="text-center text-xs font-extrabold uppercase tracking-wider text-saffron-700">
              SIH Evaluator Quick Access (Zero Friction)
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <a
                href="/api/auth/guest?role=student"
                className="flex items-center justify-center gap-1.5 rounded-lg border border-saffron-300 bg-saffron-50 px-3 py-2.5 text-center text-xs font-bold text-saffron-900 transition hover:bg-saffron-100"
              >
                <Sparkles className="h-3.5 w-3.5 text-saffron-600" />
                Try as Guest Student
              </a>
              <a
                href="/api/auth/guest?role=faculty"
                className="flex items-center justify-center gap-1.5 rounded-lg border border-navy-300 bg-navy-50 px-3 py-2.5 text-center text-xs font-bold text-navy-900 transition hover:bg-navy-100"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-navy-600" />
                Try as Guest Faculty
              </a>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-slate-600">
            Don&apos;t have an account yet?{" "}
            <Link
              href="/register"
              className="font-bold text-navy-800 underline underline-offset-2 hover:text-saffron-600"
            >
              Register New Account
            </Link>
          </p>
        </div>

        {/* Demo Personas & Information */}
        <div className="space-y-4">
          <div className="rounded-xl border border-saffron-200 bg-saffron-50/70 p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-navy-900">
              <UserCheck className="h-4 w-4 text-saffron-600" />
              Pre-Seeded Demo Accounts
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              Click any persona below to pre-fill credentials (password: <code className="font-bold">demo123</code>):
            </p>

            <div className="mt-3 space-y-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => quickLogin(acc.email, acc.pw)}
                  className="w-full text-left rounded-lg border border-line bg-white p-2.5 transition hover:border-navy-400 hover:shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold text-navy-900">
                      {acc.label}
                    </span>
                    <span className="rounded-xs bg-navy-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-navy-700">
                      {acc.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">{acc.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-line bg-white p-4 text-xs text-slate-600 shadow-sm">
            <p className="font-bold text-navy-900">National Curriculum Alignment</p>
            <p className="mt-1 leading-relaxed">
              Pragyan uses NCERT Learning Outcome mapping (e.g. LO-8-SCI-06) and DIKSHA QR codes.
              Session data is saved locally via SQLite (WASM).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
