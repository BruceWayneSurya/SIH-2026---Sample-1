"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/i18n/config";
import { translate, type TranslationValues } from "@/lib/i18n/messages";
import {
  getLanguageSnapshot,
  getServerLanguageSnapshot,
  setLanguage,
  subscribeLanguage,
} from "@/lib/i18n/store";

const LanguageContext = createContext<Language>(DEFAULT_LANGUAGE);

/** The portal stays static-first. Only UI text updates; forms and tests do not remount. */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const language = useSyncExternalStore(
    subscribeLanguage,
    getLanguageSnapshot,
    getServerLanguageSnapshot,
  );
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  return (
    <LanguageContext.Provider value={language}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const language = useContext(LanguageContext);
  return useMemo(
    () => ({
      language,
      setLanguage,
      t: (message: string, values?: TranslationValues) =>
        translate(language, message, values),
    }),
    [language],
  );
}

/** Usable inside Server Components without making their data code client-side. */
export function TranslatedText({
  children,
  values,
}: {
  children: string;
  values?: TranslationValues;
}) {
  const { t } = useTranslation();
  return <>{t(children, values)}</>;
}
