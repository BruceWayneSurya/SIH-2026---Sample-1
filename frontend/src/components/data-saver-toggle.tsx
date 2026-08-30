"use client";

import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";

export function DataSaverToggle() {
  const [mounted, setMounted] = useState(false);
  const [on, setOn] = useState(false);

  // Read the persisted preference only after mount (deferred so it does not
  // cascade a synchronous render from inside the effect).
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setOn(typeof window !== "undefined" && window.localStorage.getItem("vs_saver") === "1");
      setMounted(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.dataset.saver = on ? "1" : "0";
  }, [on, mounted]);

  const toggle = () => {
    const next = !on;
    setOn(next);
    window.localStorage.setItem("vs_saver", next ? "1" : "0");
    document.documentElement.dataset.saver = next ? "1" : "0";
    window.dispatchEvent(new CustomEvent("vs-saver", { detail: next }));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      title="Data saver mode: lazy-loads video streams, removes animations. Built for low-bandwidth government schools."
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-bold transition ${
        on
          ? "border-leaf-500 bg-leaf-50 text-leaf-700"
          : "border-line bg-white text-navy-500 hover:border-navy-300 hover:text-navy-700"
      } ${mounted ? "" : "opacity-0"}`}
    >
      {on ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
      Data Saver
      <span
        className={`rounded-sm px-1 text-[10px] ${on ? "bg-leaf-500 text-white" : "bg-navy-100 text-navy-600"}`}
      >
        {on ? "ON" : "OFF"}
      </span>
    </button>
  );
}
