"use client";

import { ChevronDown, Languages } from "lucide-react";
import { isLanguage, LANGUAGES } from "@/lib/i18n/config";
import { useTranslation } from "./language-provider";

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useTranslation();
  return (
    <div className="relative inline-flex shrink-0 items-center">
      <Languages
        aria-hidden="true"
        className="pointer-events-none absolute left-2.5 h-4 w-4 text-navy-600"
      />
      <select
        name="language"
        aria-label={t("Change language")}
        title={t("Change language")}
        value={language}
        onChange={(event) => {
          if (isLanguage(event.target.value)) setLanguage(event.target.value);
        }}
        className="h-9 w-36 cursor-pointer appearance-none rounded-full border border-line bg-white pl-8 pr-7 text-[13px] font-semibold text-navy-800 transition hover:border-saffron-500"
      >
        {LANGUAGES.map((item) => (
          <option
            key={item.code}
            value={item.code}
            lang={item.code}
            aria-label={
              item.code === "en"
                ? item.name
                : `${item.name} — ${item.nativeName}`
            }
          >
            {item.nativeName}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-navy-600"
      />
    </div>
  );
}
