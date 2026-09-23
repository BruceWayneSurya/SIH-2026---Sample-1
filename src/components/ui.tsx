import { TranslatedText as T } from "@/components/language-provider";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  Calculator,
  FlaskConical,
  Globe2,
  BookOpen,
  Languages,
  Palette,
  type LucideProps,
} from "lucide-react";

export function ChakraMark({
  className = "h-10 w-10",
}: {
  className?: string;
}) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <circle
        cx="20"
        cy="20"
        r="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
      />
      <circle cx="20" cy="20" r="3.2" fill="currentColor" />
      {Array.from({ length: 24 }).map((_, i) => (
        <line
          key={i}
          x1="20"
          y1="20"
          x2="20"
          y2="4.5"
          stroke="currentColor"
          strokeWidth="1.1"
          transform={`rotate(${i * 15} 20 20)`}
        />
      ))}
    </svg>
  );
}

export const Wordmark = ({ light = false }: { light?: boolean }) => (
  <span className="flex items-center gap-2.5">
    <ChakraMark
      className={
        light
          ? "h-9 w-9 text-saffron-400"
          : "h-9 w-9 text-[#133b5c] dark:text-saffron-400"
      }
    />
    <span className="leading-none">
      <span
        className={`block text-[22px] font-black tracking-tight ${
          light ? "text-white" : "text-[#0c2a43] dark:text-white"
        }`}
        lang="hi"
        style={{
          fontFamily:
            "var(--font-deva), 'Noto Serif Devanagari', 'Mukta', serif",
        }}
      >
        प्रज्ञान
      </span>
      <span
        className={`block text-[10.5px] font-bold uppercase tracking-[0.14em] ${
          light ? "text-navy-200" : "text-[#1d5080] dark:text-slate-300"
        }`}
      >
        Pragyan · Learning Portal
      </span>
    </span>
  </span>
);

export const SUBJECT_ICONS: Record<string, LucideIcon> = {
  calculator: Calculator,
  flask: FlaskConical,
  globe: Globe2,
  book: BookOpen,
  languages: Languages,
  palette: Palette,
};

export function IconBox({
  icon: Icon,
  tint,
  size = "md",
}: {
  icon: LucideIcon;
  tint: string;
  size?: "md" | "lg";
}) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md border ${tint} ${
        size === "lg" ? "h-12 w-12" : "h-9 w-9"
      }`}
    >
      <Icon className={size === "lg" ? "h-6 w-6" : "h-4.5 w-4.5"} />
    </span>
  );
}

export function ProgressBar({
  value,
  max,
  className = "",
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      className={`h-2 overflow-hidden rounded-full bg-navy-100 ${className}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-navy-700 to-navy-500 transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-navy-200 bg-navy-50/50 px-6 py-10 text-center">
      <span className="mb-3 inline-flex rounded-full bg-white p-3 text-navy-400 shadow-sm">
        <Icon className="h-7 w-7" />
      </span>
      <h3 className="text-lg font-bold text-navy-900">
        <T>{title}</T>
      </h3>
      <p className="mt-1 max-w-md text-sm text-slate-600">
        <T>{text}</T>
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "navy",
}: {
  icon: LucideIcon;
  /** A plain string is translated; pass a node for values-aware text. */
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "navy" | "saffron" | "leaf";
}) {
  const tones = {
    navy: "border-navy-200 bg-white text-navy-800",
    saffron: "border-saffron-200 bg-saffron-50 text-saffron-700",
    leaf: "border-leaf-100 bg-leaf-50 text-leaf-700",
  } as const;
  return (
    <div className={`card-hover rounded-xl border p-4 shadow-sm ${tones[tone]}`}>
      <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider opacity-80">
        <Icon className="h-4 w-4" />{" "}
        {typeof label === "string" ? <T>{label}</T> : label}
      </div>
      <div className="mt-1.5 text-3xl font-extrabold tabular-nums">{value}</div>
      {sub && (
        <div className="mt-0.5 text-[13px] font-semibold opacity-70">
          {typeof sub === "string" ? <T>{sub}</T> : sub}
        </div>
      )}
    </div>
  );
}

/** Circular progress donut — subject headers, chapter progress. */
export function ProgressRing({
  value,
  max,
  size = 68,
  stroke = 7,
  tone = "saffron",
  caption,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  tone?: "saffron" | "navy" | "leaf";
  caption?: React.ReactNode;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const tones = {
    saffron: "var(--color-saffron-500)",
    navy: "var(--color-navy-600)",
    leaf: "var(--color-leaf-500)",
  } as const;
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-navy-100)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tones[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
        />
      </svg>
      <span
        className="absolute flex flex-col items-center leading-none"
        role="img"
        aria-label={`${pct}% complete`}
      >
        <span className="text-[15px] font-extrabold tabular-nums text-navy-900 dark:text-white">
          {pct}%
        </span>
        {caption && (
          <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">
            {caption}
          </span>
        )}
      </span>
    </div>
  );
}

export function PyqTag({ tag }: { tag: string }) {
  const isPractice = tag.toLowerCase().includes("practice");
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
        isPractice
          ? "border-slate-200 bg-slate-100 text-slate-500"
          : "border-navy-200 bg-navy-50 text-navy-700"
      }`}
    >
      {tag}
    </span>
  );
}

/**
 * GIGW breadcrumb trail. The last item is the current page (plain text);
 * earlier items are links. Labels can be any node (translated text, icons).
 */
export function Breadcrumbs({
  items,
}: {
  items: Array<{ href?: string; label: React.ReactNode }>;
}) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3">
      <ol className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-slate-500">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1.5">
              {i > 0 && (
                <span aria-hidden="true" className="text-slate-400">
                  /
                </span>
              )}
              {last || !item.href ? (
                <span aria-current={last ? "page" : undefined} className="text-navy-800">
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="hover:text-navy-800 hover:underline">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Section heading with eyebrow, title and tricolor rule — shared page rhythm. */
export function SectionHeading({
  eyebrow,
  title,
  sub,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="vsv-enter">
      {eyebrow && (
        <p className="eyebrow">
          <T>{eyebrow}</T>
        </p>
      )}
      <h1 className="mt-1.5 text-3xl font-extrabold tracking-tight text-navy-900">
        <T>{title}</T>
      </h1>
      {sub && (
        <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-slate-600">
          <T>{sub}</T>
        </p>
      )}
      <div className="tricolor-rule mt-3" aria-hidden="true" />
    </div>
  );
}

export type IconProps = LucideProps;
