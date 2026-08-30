"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("vs_theme");
    const isDark =
      saved === "dark" ||
      (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(isDark);
    applyTheme(isDark);
  }, []);

  const applyTheme = (isDark: boolean) => {
    if (isDark) {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.add("dark");
      localStorage.setItem("vs_theme", "dark");
    } else {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.remove("dark");
      localStorage.setItem("vs_theme", "light");
    }
  };

  const toggle = () => {
    const next = !dark;
    setDark(next);
    applyTheme(next);
  };

  if (!mounted) {
    return (
      <div className="h-8 w-8 rounded-full border border-line bg-white/50 opacity-0" aria-hidden="true" />
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className={`inline-flex items-center justify-center rounded-full border p-1.5 transition ${
        dark
          ? "border-saffron-400/50 bg-navy-800 text-saffron-400 hover:border-saffron-400 hover:bg-navy-700"
          : "border-line bg-white text-navy-600 hover:border-navy-300 hover:text-navy-900"
      }`}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
