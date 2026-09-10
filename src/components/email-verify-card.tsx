"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TranslatedText as T,
  useTranslation,
} from "@/components/language-provider";
import {
  AlertCircle,
  ArrowLeft,
  Info,
  Loader2,
  MailCheck,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

export type Challenge = {
  challengeId: string;
  maskedEmail: string;
  resendAfter: number;
  delivered: boolean;
  devCode?: string;
};

/**
 * The one-time-code step shared by faculty sign-in and registration.
 * The code lives in the mailbox; this component only posts it back.
 */
export function EmailVerifyCard({
  challenge,
  name,
  onBack,
  backLabel = "Use a different email",
}: {
  challenge: Challenge;
  name: string;
  onBack: () => void;
  backLabel?: string;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const [current, setCurrent] = useState<Challenge>(challenge);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"verify" | "resend" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(challenge.resendAfter);
  const inFlight = useRef(false);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (inFlight.current || busy) return;
    inFlight.current = true;
    setBusy("verify");
    setError(null);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: current.challengeId, code }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? t("Verification failed."));
      setNotice(data?.notice ?? t("Email verified."));
      router.push(data?.redirect ?? "/home");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("Verification failed. Try again."),
      );
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  };

  const resend = async () => {
    if (inFlight.current || busy || seconds > 0) return;
    inFlight.current = true;
    setBusy("resend");
    setError(null);
    try {
      const res = await fetch("/api/auth/verify/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: current.challengeId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok)
        throw new Error(data?.error ?? t("Could not resend the code."));
      setCurrent({
        challengeId: data.challengeId,
        maskedEmail: data.maskedEmail,
        resendAfter: data.resendAfter ?? 60,
        delivered: !!data.delivered,
        devCode: data.devCode,
      });
      setSeconds(data.resendAfter ?? 60);
      setCode("");
      setNotice(t("A new code has been sent to your inbox."));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("Could not resend the code."),
      );
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  };

  return (
    <div className="rounded-xl border border-line bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-saffron-50 text-saffron-600">
          <MailCheck className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl font-extrabold text-navy-900">
            <T>Verify your email address</T>
          </h2>
          <p className="text-[13px] font-semibold text-slate-500">
            {name ? `${name} · ` : ""}
            <span className="break-all">{current.maskedEmail}</span>
          </p>
        </div>
      </div>

      <p className="mt-4 text-[14px] text-slate-600">
        <T>
          We have sent a six-digit code to your mailbox. It is valid for ten minutes and
          can be used once.
        </T>
      </p>

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <span><T>{error}</T></span>
        </div>
      )}
      {notice && !error && (
        <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-leaf-500/40 bg-leaf-50 p-3.5 text-sm text-leaf-700">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      <form onSubmit={verify} className="mt-5 space-y-4">
        <div>
          <label
            htmlFor="otp-code"
            className="block text-xs font-bold uppercase tracking-wider text-navy-800"
          >
            <T>One-time code</T>
          </label>
          <input
            id="otp-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className="mt-1.5 w-full rounded-lg border border-line bg-paper py-3 text-center text-2xl font-extrabold tracking-[0.5em] text-navy-950 transition focus:border-navy-600 focus:bg-white focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={busy !== null || code.length < 6}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-navy-800 py-3 text-[15px] font-bold text-white shadow-sm transition hover:bg-navy-700 disabled:opacity-60"
        >
          {busy === "verify" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}
          <T>Verify and continue</T>
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[13px]">
        <button
          type="button"
          onClick={resend}
          disabled={busy !== null || seconds > 0}
          className="inline-flex items-center gap-1.5 font-bold text-navy-700 underline underline-offset-2 transition hover:text-saffron-600 disabled:no-underline disabled:opacity-50"
        >
          {busy === "resend" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {seconds > 0
            ? t("Resend code in {seconds}s", { seconds })
            : t("Resend code")}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 font-bold text-slate-500 underline underline-offset-2 transition hover:text-navy-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <T>{backLabel}</T>
        </button>
      </div>

      {current.devCode && (
        <p className="mt-5 flex items-start gap-2 rounded-lg border border-navy-200 bg-navy-50 p-3 text-[13px] text-navy-700">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <b>
              <T>Demo build:</T>
            </b>{" "}
            <T>
              no mail provider is configured on this server, so your code is
            </T>{" "}
            <b className="tracking-widest">{current.devCode}</b>.{" "}
            <T>
              Set MAIL_PROVIDER in the environment to send real mail.
            </T>
          </span>
        </p>
      )}

      {!current.delivered && !current.devCode && (
        <p className="mt-5 text-[13px] text-slate-500">
          <T>
            The mail service did not confirm delivery. Check your spam folder, or use
            “Resend code” in a minute.
          </T>
        </p>
      )}
    </div>
  );
}
