import type { LucideIcon } from "lucide-react";
import {
  Calculator,
  FlaskConical,
  Globe2,
  BookOpen,
  Languages,
  Palette,
  type LucideProps,
} from "lucide-react";

export function ChakraMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2.4" />
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
    <ChakraMark className={light ? "h-9 w-9 text-saffron-400" : "h-9 w-9 text-[#133b5c] dark:text-saffron-400"} />
    <span className="leading-none">
      <span
        className={`block text-[22px] font-black tracking-tight ${
          light ? "text-white" : "text-[#0c2a43] dark:text-white"
        }`}
        style={{ fontFamily: "var(--font-deva), 'Noto Serif Devanagari', 'Mukta', serif" }}
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

export function IconBox({ icon: Icon, tint, size = "md" }: { icon: LucideIcon; tint: string; size?: "md" | "lg" }) {
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

export function ProgressBar({ value, max, className = "" }: { value: number; max: number; className?: string }) {
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
      <h3 className="text-lg font-bold text-navy-900">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-slate-600">{text}</p>
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
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: "navy" | "saffron" | "leaf";
}) {
  const tones = {
    navy: "border-navy-200 bg-white text-navy-800",
    saffron: "border-saffron-200 bg-saffron-50 text-saffron-700",
    leaf: "border-leaf-100 bg-leaf-50 text-leaf-700",
  } as const;
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${tones[tone]}`}>
      <div className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide opacity-80">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <div className="mt-1 text-3xl font-extrabold">{value}</div>
      {sub && <div className="mt-0.5 text-[13px] font-semibold opacity-70">{sub}</div>}
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

export type IconProps = LucideProps;
