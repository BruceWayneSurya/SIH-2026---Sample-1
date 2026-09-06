"use client";

import {
  TranslatedText as T,
  useTranslation,
} from "@/components/language-provider";

import { setDataSaver, useDataSaver } from "@/lib/ui-preferences";
import { WifiOff, Wifi } from "lucide-react";

export function DataSaverToggle() {
  const { t } = useTranslation();
  const on = useDataSaver();
  const toggle = () => setDataSaver(!on);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      title={t(
        "Data saver mode: lazy-loads video streams, removes animations. Built for low-bandwidth government schools.",
      )}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-bold transition ${
        on
          ? "border-leaf-500 bg-leaf-50 text-leaf-700"
          : "border-line bg-white text-navy-500 hover:border-navy-300 hover:text-navy-700"
      }`}
    >
      {on ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
      <T>Data Saver</T>
      <span
        className={`rounded-sm px-1 text-[10px] ${on ? "bg-leaf-500 text-white" : "bg-navy-100 text-navy-600"}`}
      >
        <T>{on ? "ON" : "OFF"}</T>
      </span>
    </button>
  );
}
