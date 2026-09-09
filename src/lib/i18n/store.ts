"use client";

import {
  DEFAULT_LANGUAGE,
  isLanguage,
  LANGUAGE_STORAGE_KEY,
  resolveLanguage,
  type Language,
} from "./config";

const CHANGE_EVENT = "pragyan:language-change";
let memoryOverride: Language | undefined;

export function getLanguageSnapshot(): Language {
  if (memoryOverride) return memoryOverride;
  try {
    return resolveLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function getServerLanguageSnapshot(): Language {
  return DEFAULT_LANGUAGE;
}

export function subscribeLanguage(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === LANGUAGE_STORAGE_KEY || event.key === null) {
      memoryOverride = undefined;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, listener);
  };
}

export function setLanguage(language: Language): void {
  if (!isLanguage(language)) return;
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    memoryOverride = undefined;
  } catch {
    // Private/locked-down browsers can still switch language for this tab.
    memoryOverride = language;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
