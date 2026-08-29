"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  KeyRound,
  UserPlus,
  User,
  Presentation,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from "lucide-react";

type Mode = "login" | "register";

const DEMO_PASSWORD = "demo123";

const DEMO_ACCOUNTS = [
  { label: "Student", sub: "Aarav Patel · Class 8", email: "aarav@student.in" },
  { label: "Faculty", sub: "Anita Sharma · Science", email: "anita.sharma@vidyasetu.gov.in" },
];

const inputCls =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-[15px] text-navy-900 placeholder:text-navy-300 focus:border-navy-500";
const labelCls = "mb-1 block text-[13px] font-bold text-navy-700";

export function LoginPanel({ notice = null }: { notice?: string | null }) {
  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<"student" | "faculty">("student");
  const [error, setError] = useState<string | null>(notice);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const postAuth = async (url: string, payload: Record<string, string>) => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data: { ok?: boolean; redirect?: string; error?: string } = await res
        .json()
        .catch(() => ({}));

      if (res.ok && data.ok) {
        const dest = data.redirect ?? "/home";
        // The sign-in succeeded server-side. Before navigating, verify the
        // browser actually kept the session cookie — inside embedded
        // previews, privacy settings can drop it and /home would bounce
        // straight back to this page.
        try {
          const probe = await fetch(dest, { redirect: "manual" });
          if (probe.type === "opaqueredirect" || probe.status === 0) {
            setError(
              "Signed in, but your browser did not keep the session cookie (third-party cookies may be blocked). " +
                "Please allow cookies for this site, or open the portal directly in a new tab.",
            );
            return;
          }
        } catch {
          // Couldn't verify — navigate anyway and let the server decide.
        }
        // relative path -> always resolves against the origin the user is on
        window.location.assign(dest);
        return;
      }
      setError(data.error ?? `Sign-in failed (HTTP ${res.status}). Please try again.`);
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, string> = {
      email: String(fd.get("email") ?? ""),
      password: String(fd.get("password") ?? ""),
    };
    if (mode === "register") {
      payload.role = role;
      payload.name = String(fd.get("name") ?? "");
      payload.state = String(fd.get("state") ?? "");
      payload.school = String(fd.get("school") ?? "");
      payload.className = String(fd.get("className") ?? "");
      payload.subjectSpecialization = String(fd.get("subjectSpecialization") ?? "");
      payload.institutionId = String(fd.get("institutionId") ?? "");
    }
    await postAuth(mode === "login" ? "/api/auth/login" : "/api/auth/register", payload);
  };

  /** Fills the visible form (so evaluators see the credentials) and signs in. */
  const quickLogin = async (email: string) => {
    const f = formRef.current;
    const el = f?.elements.namedItem("email") as HTMLInputElement | null;
    const pw = f?.elements.namedItem("password") as HTMLInputElement | null;
    if (el) el.value = email;
    if (pw) pw.value = DEMO_PASSWORD;
    await postAuth("/api/auth/login", { email, password: DEMO_PASSWORD });
  };

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
      <div className="grid grid-cols-2" role="tablist" aria-label="Authentication">
        {(["login", "register"] as Mode[]).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 py-3 text-[15px] font-bold transition ${
              mode === m
                ? "bg-white text-navy-900"
                : "bg-navy-50 text-navy-500 hover:text-navy-700"
            }`}
          >
            {m === "login" ? <KeyRound className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {m === "login" ? "Sign In" : "Register"}
          </button>
        ))}
      </div>

      <form
        ref={formRef}
        onSubmit={submit}
        method="post"
        action={mode === "login" ? "/api/auth/login" : "/api/auth/register"}
        className="space-y-3 border-t-2 border-saffron-500/60 p-5"
      >
        {mode === "register" && (
          <div>
            <span className={labelCls}>I am a…</span>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Role">
              {(
                [
                  { v: "student", label: "Student", icon: User },
                  { v: "faculty", label: "Teacher / Faculty", icon: Presentation },
                ] as const
              ).map((r) => (
                <button
                  key={r.v}
                  type="button"
                  role="radio"
                  aria-checked={role === r.v}
                  onClick={() => setRole(r.v)}
                  className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-bold transition ${
                    role === r.v
                      ? "border-navy-800 bg-navy-800 text-white"
                      : "border-line bg-white text-navy-600 hover:border-navy-300"
                  }`}
                >
                  <r.icon className="h-4 w-4" /> {r.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === "register" && (
          <div>
            <label className={labelCls} htmlFor="reg-name">Full name</label>
            <input id="reg-name" name="name" required minLength={3} placeholder="e.g. Priya Nair" className={inputCls} />
          </div>
        )}

        <div>
          <label className={labelCls} htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            name="email"
            type="email"
            required
            placeholder="you@example.in"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            name="password"
            type="password"
            required
            minLength={6}
            placeholder={mode === "register" ? "Minimum 6 characters" : "Your password"}
            className={inputCls}
          />
        </div>

        {mode === "register" &&
          (role === "student" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="reg-state">State / UT</label>
                <input id="reg-state" name="state" required placeholder="e.g. Kerala" className={inputCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="reg-class">Target class</label>
                <select id="reg-class" name="className" required className={inputCls} defaultValue="">
                  <option value="" disabled>Select…</option>
                  <option value="7">Class 7</option>
                  <option value="8">Class 8</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className={labelCls} htmlFor="reg-school">School name</label>
                <input id="reg-school" name="school" required placeholder="e.g. Govt. School, Ernakulam" className={inputCls} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="reg-spec">Subject specialization</label>
                <select id="reg-spec" name="subjectSpecialization" required className={inputCls} defaultValue="">
                  <option value="" disabled>Select…</option>
                  {["Mathematics", "Science", "Social Science", "English", "Hindi", "Arts & Vocational"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="reg-inst">School / Institution ID</label>
                <input id="reg-inst" name="institutionId" required placeholder="e.g. SCH-KL-087" className={inputCls} />
              </div>
            </div>
          ))}

        {mode === "login" && (
          <div className="rounded-md border border-navy-100 bg-navy-50 p-3 text-[13px] text-navy-700">
            <p className="mb-2 font-bold">
              Demo accounts — one click to sign in (password: {DEMO_PASSWORD})
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {DEMO_ACCOUNTS.map((d) => (
                <button
                  key={d.email}
                  type="button"
                  disabled={busy}
                  onClick={() => quickLogin(d.email)}
                  className="rounded border border-navy-200 bg-white px-2.5 py-1.5 text-left transition hover:border-navy-400 disabled:opacity-60"
                >
                  <span className="block font-bold text-navy-900">{d.label}</span>
                  <span className="block truncate text-[12px] text-slate-500">{d.sub}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-2.5 text-sm font-semibold text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-navy-800 py-2.5 text-[15px] font-bold text-white transition hover:bg-navy-700 disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "login" ? "Sign in to VidyaSetu" : "Create my account"}
        </button>

        <div className="grid grid-cols-2 gap-2 border-t border-line pt-3">
          <a
            href="/api/auth/guest?role=student"
            className="flex items-center justify-center gap-2 rounded-md border-2 border-saffron-500 bg-saffron-50 py-2 text-sm font-bold text-saffron-700 transition hover:bg-saffron-100"
          >
            <ShieldCheck className="h-4 w-4" /> Try as Guest Student
          </a>
          <a
            href="/api/auth/guest?role=faculty"
            className="flex items-center justify-center gap-2 rounded-md border-2 border-navy-300 bg-navy-50 py-2 text-sm font-bold text-navy-700 transition hover:bg-navy-100"
          >
            <Presentation className="h-4 w-4" /> Try as Guest Faculty
          </a>
        </div>
      </form>
    </div>
  );
}
