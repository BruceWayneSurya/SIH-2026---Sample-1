"use client";

import {
  TranslatedText as T,
  useTranslation,
} from "@/components/language-provider";

import { useRef, useState } from "react";
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
import { EmailVerifyCard, type Challenge } from "@/components/email-verify-card";

import { DEMO_ACCOUNTS } from "@/lib/demo-accounts";

export function LoginForm({
  initialEmail = "",
  initialRole = "student",
}: {
  initialEmail?: string;
  initialRole?: "student" | "faculty";
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const [role, setRole] = useState<"student" | "faculty">(initialRole);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<
    (Challenge & { name: string }) | null
  >(null);

  const inFlight = useRef(false);

  const signIn = async (email: string, password: string) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          data?.error ?? t("Login failed. Please check your credentials."),
        );
      }

      // Faculty must prove ownership of the mailbox before a session is issued.
      if (data?.requiresVerification) {
        setChallenge({
          challengeId: data.challengeId,
          maskedEmail: data.maskedEmail,
          resendAfter: data.resendAfter ?? 60,
          delivered: !!data.delivered,
          devCode: data.devCode,
          name: data.name ?? "",
        });
        return;
      }

      router.push("/home");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("An unexpected error occurred."),
      );
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void signIn(email, password);
  };
  const quickLogin = (account: (typeof DEMO_ACCOUNTS)[number]) => {
    setRole(account.role);
    setEmail(account.email);
    setPassword(account.pw);
    setError(null);
    setChallenge(null);
    void signIn(account.email, account.pw);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mx-auto max-w-md text-center">
        <div className="inline-flex justify-center">
          <Link href="/" aria-label="Pragyan home">
            <Wordmark />
          </Link>
        </div>
        <h1 className="mt-4 text-2xl font-extrabold text-navy-900 sm:text-3xl">
          <T>Sign In to Pragyan (प्रज्ञान)</T>
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          <T>Open Digital Learning &amp; Assessment Portal</T>
        </p>
        <p className="mt-1 text-[13px] text-slate-500">
          <T>
            Ministry of Education · Department of School Education &amp;
            Literacy
          </T>
        </p>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-saffron-50 px-3 py-1 text-xs font-bold text-saffron-700">
          <Sparkles className="h-3.5 w-3.5" />{" "}
          <T>New · AI tutor in the bottom-right of every page</T>
        </p>
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_360px]">
        {/* Main Login Box */}
        <div>
          {challenge ? (
            <EmailVerifyCard
              challenge={challenge}
              name={challenge.name}
              onBack={() => {
                setChallenge(null);
                setPassword("");
                setError(null);
              }}
            />
          ) : (
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
                  <T>Student Portal</T>
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
                  <T>Faculty / Teacher</T>
                </button>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-5 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-bold uppercase tracking-wider text-navy-800"
                  >
                    <T>Email Address</T>
                  </label>
                  <div className="relative mt-1.5">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      id="login-email"
                      autoComplete="email"
                      maxLength={120}
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
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-bold uppercase tracking-wider text-navy-800"
                  >
                    <T>Password</T>
                  </label>
                  <div className="relative mt-1.5">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      id="login-password"
                      autoComplete="current-password"
                      maxLength={200}
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
                      <T>
                        {role === "faculty"
                          ? "Sign In as Faculty"
                          : "Sign In as Student"}
                      </T>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {role === "faculty" && (
                <p className="mt-4 flex items-start gap-2 rounded-lg border border-navy-200 bg-navy-50 p-3 text-[13px] text-navy-700">
                  <ShieldCheck
                    className="mt-0.5 h-4 w-4 shrink-0 text-navy-600"
                    aria-hidden="true"
                  />
                  <span>
                    <T>
                      Faculty sign-in sends a one-time code to your registered
                      email ID. Institutional addresses are verified instantly;
                      personal mailboxes are confirmed after an institutional
                      check.
                    </T>
                  </span>
                </p>
              )}

              {/* Demo access */}
              <div className="mt-6 border-t border-line pt-5">
                <p className="text-center text-xs font-extrabold uppercase tracking-wider text-saffron-700">
                  <T>Demo access</T>
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <a
                    href="/api/auth/guest?role=student"
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-saffron-300 bg-saffron-50 px-3 py-2.5 text-center text-xs font-bold text-saffron-900 transition hover:bg-saffron-100"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-saffron-600" />
                    <T>Try as Guest Student</T>
                  </a>
                  <a
                    href="/api/auth/guest?role=faculty"
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-navy-300 bg-navy-50 px-3 py-2.5 text-center text-xs font-bold text-navy-900 transition hover:bg-navy-100"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-navy-600" />
                    <T>Try as Guest Faculty</T>
                  </a>
                </div>
              </div>

              <p className="mt-6 text-center text-sm text-slate-600">
                <T>Don&apos;t have an account yet?</T>{" "}
                <Link
                  href="/register"
                  className="font-bold text-navy-800 underline underline-offset-2 hover:text-saffron-600"
                >
                  <T>Register New Account</T>
                </Link>
              </p>
            </div>
          )}
        </div>

        {/* Demo Personas & Information */}
        <div className="space-y-4">
          <div className="rounded-xl border border-saffron-200 bg-saffron-50/70 p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-navy-900">
              <UserCheck className="h-4 w-4 text-saffron-600" />
              <T>Pre-Seeded Demo Accounts</T>
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              Click any persona to sign in instantly (password:{" "}
              <code className="font-bold">demo123</code>):
            </p>

            <div className="mt-3 space-y-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => quickLogin(acc)}
                  disabled={loading}
                  className="w-full text-left rounded-lg border border-line bg-white p-2.5 transition hover:border-navy-400 hover:shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold text-navy-900">
                      {acc.label}
                    </span>
                    <span className="rounded-xs bg-navy-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-navy-700">
                      <T>{acc.role}</T>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">{acc.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-line bg-white p-4 text-xs text-slate-600 shadow-sm">
            <p className="font-bold text-navy-900">
              <T>Faculty verification</T>
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-4 leading-relaxed">
              <li>
                <T>
                  Sign in with the email ID issued by your school or
                  department.
                </T>
              </li>
              <li>
                <T>
                  A six-digit code is mailed to you; it expires in ten minutes
                  and allows five attempts.
                </T>
              </li>
              <li>
                <T>
                  …gov.in, …nic.in, …edu.in, …ac.in addresses are verified
                  immediately.
                </T>
              </li>
              <li>
                <T>
                  Gmail and other personal IDs are marked pending institutional
                  review until a verified reviewer confirms your institution.
                </T>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-line bg-white p-4 text-xs text-slate-600 shadow-sm">
            <p className="font-bold text-navy-900">
              <T>National Curriculum Alignment</T>
            </p>
            <p className="mt-1 leading-relaxed">
              <T>
                Pragyan uses NCERT Learning Outcome mapping (e.g. LO-8-SCI-06)
                and DIKSHA QR codes. Local SQLite or permanent hosted SQLite
                stores your session data, depending on the deployment.
              </T>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
