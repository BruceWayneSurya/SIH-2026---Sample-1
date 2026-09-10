"use client";

/**
 * Class notebook — the chapter's curated source set.
 *
 * A teacher adds a link, a PDF, a worksheet or one of the class's notes once, and
 * every learner in that class gets the same grounded tutor. It is not decoration:
 * anything added here becomes a source the tutor is allowed to quote, and removing
 * an item removes it from the evidence set too. That is why the panel shows the
 * authority of each source — textbook, faculty-verified, or classmate.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  FileSpreadsheet,
  GraduationCap,
  Link2,
  Loader2,
  Plus,
  Trash2,
  UserRound,
  Video as Youtube,
} from "lucide-react";

export type NotebookItem = {
  id: number;
  kind: "note" | "pdf" | "youtube" | "worksheet" | "link";
  title: string;
  url: string | null;
  addedByName: string;
  note: { facultyVerified: boolean; authorName: string; content: string | null } | null;
};

const KIND_META = {
  note: { icon: BookOpen, label: "Class note" },
  pdf: { icon: BookOpen, label: "PDF" },
  youtube: { icon: Youtube, label: "Video" },
  worksheet: { icon: FileSpreadsheet, label: "Worksheet" },
  link: { icon: Link2, label: "Link" },
} as const;

export function ClassNotebook({
  chapterId,
  notebookTitle,
  curatorName,
  items,
  canCurate,
}: {
  chapterId: number;
  notebookTitle: string | null;
  curatorName: string | null;
  items: NotebookItem[];
  canCurate: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<NotebookItem["kind"]>("link");

  async function add() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/notebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId, kind, title, url: url || null }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Could not add the item.");
      setTitle("");
      setUrl("");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the item.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(itemId: number) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/notebook?itemId=${itemId}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Could not remove the item.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove the item.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <header className="flex flex-wrap items-center gap-3">
        <span className="rounded-lg bg-navy-800 p-2 text-saffron-400">
          <GraduationCap className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-extrabold text-navy-900">
            Class notebook{curatorName ? ` · curated by ${curatorName}` : ""}
          </h2>
          <p className="text-[12.5px] text-slate-500">
            {notebookTitle ??
              "The chapter's source set. Everything here is what the tutor is allowed to quote."}
          </p>
        </div>
        {canCurate && (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-2 text-[12.5px] font-bold text-navy-700 hover:border-saffron-400"
          >
            <Plus className="h-3.5 w-3.5" /> Add a source
          </button>
        )}
      </header>

      {open && canCurate && (
        <div className="mt-3 rounded-md border border-navy-200 bg-navy-50 p-3">
          <div className="flex flex-wrap gap-2">
            {(["link", "youtube", "pdf", "worksheet"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setKind(option)}
                aria-pressed={kind === option}
                className={`rounded-full border px-3 py-1 text-[12px] font-bold ${
                  kind === option
                    ? "border-navy-800 bg-navy-800 text-white"
                    : "border-line bg-white text-navy-700"
                }`}
              >
                {KIND_META[option].label}
              </button>
            ))}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1.2fr_1.4fr_auto]">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Title learners will see"
              maxLength={200}
              className="rounded-md border border-line bg-white px-3 py-2 text-[13px]"
            />
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://… (or leave blank for a note)"
              className="rounded-md border border-line bg-white px-3 py-2 text-[13px]"
            />
            <button
              type="button"
              onClick={() => void add()}
              disabled={busy || title.trim().length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-saffron-500 px-4 py-2 text-[13px] font-extrabold text-navy-950 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
            </button>
          </div>
          <p className="mt-2 text-[11.5px] text-slate-600">
            PDFs and worksheets are also indexed as faculty-verified sources, so the tutor can cite
            them.
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-800">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <p className="mt-3 rounded-md border border-line bg-paper px-3 py-2 text-[12.5px] text-slate-500">
          No sources curated for this chapter yet. Until then the tutor answers from the textbook
          passages alone.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => {
            const meta = KIND_META[item.kind] ?? KIND_META.link;
            const authority = item.note
              ? item.note.facultyVerified
                ? "faculty-verified"
                : "classmate note"
              : "teacher-curated";
            return (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-paper px-3 py-2"
              >
                <span className="text-navy-700">
                  <meta.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="block truncate text-[13px] font-bold text-navy-800 underline decoration-dotted"
                    >
                      {item.title}
                    </a>
                  ) : (
                    <span className="block truncate text-[13px] font-bold text-navy-800">
                      {item.title}
                    </span>
                  )}
                  <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-slate-500">
                    {item.note?.facultyVerified ? (
                      <GraduationCap className="h-3 w-3 text-leaf-600" />
                    ) : (
                      <UserRound className="h-3 w-3" />
                    )}
                    {authority} · added by {item.addedByName}
                  </span>
                </span>
                {canCurate && (
                  <button
                    type="button"
                    aria-label={`Remove ${item.title}`}
                    onClick={() => void remove(item.id)}
                    disabled={busy}
                    className="rounded p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
