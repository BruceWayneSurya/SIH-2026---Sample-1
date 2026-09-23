"use client";

import { Printer } from "lucide-react";
import { TranslatedText as T } from "./language-provider";

/** Screen-only "Print report" action for the printable report sheet. */
export function PrintButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={`btn-primary text-sm ${className}`}
    >
      <Printer className="h-4 w-4" /> <T>Print report</T>
    </button>
  );
}
