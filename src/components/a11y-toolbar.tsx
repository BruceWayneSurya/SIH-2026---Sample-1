"use client";
import { Contrast } from "lucide-react";
import { TranslatedText as T } from "./language-provider";
import {
  setFontScale,
  setHighContrast,
  useFontScale,
  useHighContrast,
} from "@/lib/ui-preferences";

/**
 * GIGW accessibility toolbar: three text-size steps (A- / A / A+) and a
 * high-contrast toggle. State lives in the shared ui-preferences store, so
 * both attributes persist across visits and are re-applied before first
 * paint by the inline script in the root layout.
 */
export function A11yToolbar({ compact = false }: { compact?: boolean }) {
  const scale = useFontScale();
  const contrast = useHighContrast();

  const steps: Array<{ value: "0" | "1" | "2"; label: string; sr: string }> = [
    { value: "0", label: "A-", sr: "Decrease text size" },
    { value: "1", label: "A", sr: "Normal text size" },
    { value: "2", label: "A+", sr: "Increase text size" },
  ];

  return (
    <div
      className="inline-flex items-center divide-x divide-line rounded-lg border border-line bg-white"
      role="group"
      aria-label="Text size"
    >
      {steps.map((step) => (
        <button
          key={step.value}
          type="button"
          onClick={() => setFontScale(step.value)}
          aria-pressed={scale === step.value}
          title={step.sr}
          className={`min-w-[32px] px-1.5 py-1 font-bold leading-none transition ${
            compact ? "text-[12px]" : "text-[13px]"
          } ${
            scale === step.value
              ? "bg-navy-800 text-white"
              : "text-navy-700 hover:bg-navy-50"
          }`}
        >
          <span aria-hidden="true">{step.label}</span>
          <span className="sr-only">
            <T>{step.sr}</T>
          </span>
        </button>
      ))}
      <button
        type="button"
        onClick={() => setHighContrast(!contrast)}
        aria-pressed={contrast}
        title="High contrast"
        className={`inline-flex min-w-[34px] items-center justify-center px-1.5 py-1 transition ${
          contrast ? "bg-navy-800 text-white" : "text-navy-700 hover:bg-navy-50"
        }`}
      >
        <Contrast className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="sr-only">
          <T>High contrast</T>
        </span>
      </button>
    </div>
  );
}
