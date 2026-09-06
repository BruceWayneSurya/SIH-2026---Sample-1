"use client";

import { useTranslation } from "@/components/language-provider";

import { Moon, Sun } from "lucide-react";
import { setDarkTheme, useDarkTheme } from "@/lib/ui-preferences";

export function ThemeToggle() {
  const { t } = useTranslation();
  const dark = useDarkTheme();
  const label = t(dark ? "Switch to Light Mode" : "Switch to Dark Mode");
  return (
    <button
      type="button"
      onClick={() => setDarkTheme(!dark)}
      aria-label={label}
      title={label}
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-line bg-white p-2 text-navy-700 transition hover:border-saffron-500"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
