"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, ShieldX } from "lucide-react";

export type PendingRow = {
  id: number;
  name: string;
  email: string;
  domain: string | null;
  subject: string | null;
  institution: string | null;
};

/** Verified reviewers confirm or reject pending institutional claims. */
export function FacultyReviewQueue({ initial }: { initial: PendingRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const review = async (facultyId: number, approve: boolean) => {
    if (busy !== null) return;
    setBusy(facultyId);
    setError(null);
    try {
      const res = await fetch("/api/faculty/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facultyId, approve }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not update this account.");
      setRows((current) => current.filter((row) => row.id !== facultyId));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(null);
    }
  };

  if (rows.length === 0)
    return (
      <p className="mt-3 text-sm text-slate-600">
        No teacher is waiting for an institutional check right now.
      </p>
    );

  return (
    <div className="mt-3">
      {error && (
        <p role="alert" className="mb-2 text-sm font-bold text-rose-600">
          {error}
        </p>
      )}
      <ul className="divide-y divide-line">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-2 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold text-navy-900">
                {row.name}
              </p>
              <p className="truncate text-[13px] text-slate-500">
                {row.email}
                {row.subject ? ` · ${row.subject}` : ""}
                {row.institution ? ` · ${row.institution}` : ""}
              </p>
            </div>
            <span className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => review(row.id, true)}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 rounded-md border border-leaf-500 bg-leaf-50 px-3 py-1.5 text-[13px] font-bold text-leaf-700 transition hover:bg-leaf-100 disabled:opacity-60"
              >
                {busy === row.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                Confirm
              </button>
              <button
                type="button"
                onClick={() => review(row.id, false)}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-1.5 text-[13px] font-bold text-slate-600 transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-60"
              >
                <ShieldX className="h-4 w-4" />
                Reject
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
