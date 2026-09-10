"use client";

import Link from "next/link";
import { BadgeCheck, GraduationCap, BookOpen, Quote, Users } from "lucide-react";

/**
 * The citation chip: "NCERT p. 62, para 3".
 *
 * Every chip is a link to `/source/{chunkId}`, which renders the actual passage
 * in its chapter context. The authority of the source is visible in the icon, so
 * a learner can see whether an answer rests on the textbook, on a verified
 * teacher note, or on a classmate's note.
 */
export type CitationChip = {
  chunkId: number;
  label: string;
  page?: number | null;
  para?: number;
  docTitle?: string;
  kind?: string;
  authority?: string;
  href?: string;
};

const STYLE: Record<string, { icon: typeof BookOpen; className: string; title: string }> = {
  ncert: {
    icon: BookOpen,
    className: "border-navy-200 bg-navy-50 text-navy-800 hover:border-navy-400",
    title: "NCERT textbook",
  },
  faculty_verified: {
    icon: GraduationCap,
    className: "border-leaf-500/40 bg-leaf-50 text-leaf-700 hover:border-leaf-500",
    title: "Faculty-verified note",
  },
  faculty: {
    icon: GraduationCap,
    className: "border-leaf-500/30 bg-leaf-50/60 text-leaf-700 hover:border-leaf-500",
    title: "Faculty note",
  },
  student: {
    icon: Users,
    className: "border-saffron-300 bg-saffron-50 text-saffron-800 hover:border-saffron-500",
    title: "Peer note — ranked below verified sources",
  },
};

export function CitationChips({
  citations,
  className = "",
}: {
  citations: CitationChip[];
  className?: string;
}) {
  if (citations.length === 0) return null;
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <Quote className="h-3.5 w-3.5 text-slate-400" aria-hidden />
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Sources</span>
      {citations.map((citation) => {
        const style = STYLE[citation.authority ?? ""] ?? STYLE.ncert;
        const Icon = style.icon;
        return (
          <Link
            key={`${citation.chunkId}-${citation.label}`}
            href={citation.href ?? `/source/${citation.chunkId}`}
            title={`${style.title}${citation.docTitle ? ` — ${citation.docTitle}` : ""}`}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-bold ${style.className}`}
          >
            <Icon className="h-3 w-3" aria-hidden />
            {citation.label}
            {(citation.authority === "faculty_verified" || citation.authority === "faculty") && (
              <BadgeCheck className="h-3 w-3" aria-hidden />
            )}
          </Link>
        );
      })}
    </div>
  );
}
