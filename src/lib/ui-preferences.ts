"use client";

import { useSyncExternalStore } from "react";

const subscribe = (listener: () => void) => {
  const onChange = () => { applyPreferences(); listener(); };
  window.addEventListener("storage", onChange);
  window.addEventListener("vs-preferences", onChange);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("vs-preferences", onChange);
    media.removeEventListener("change", onChange);
  };
};
const serverSnapshot = () => false;
const noSubscribe = () => () => undefined;

function dataSaver() {
  try { return localStorage.getItem("vs_saver") === "1"; }
  catch { return document.documentElement.dataset.saver === "1"; }
}
function darkTheme() {
  try {
    const saved = localStorage.getItem("vs_theme");
    return saved === "dark" || (saved !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  } catch { return document.documentElement.dataset.theme === "dark"; }
}
function applyPreferences() {
  const dark = darkTheme();
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.dataset.saver = dataSaver() ? "1" : "0";
}
function write(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* still works in this tab */ }
  if (key === "vs_saver") document.documentElement.dataset.saver = value;
  else document.documentElement.dataset.theme = value;
  window.dispatchEvent(new Event("vs-preferences"));
}
export function useDataSaver() { return useSyncExternalStore(subscribe, dataSaver, serverSnapshot); }
export function useDarkTheme() { return useSyncExternalStore(subscribe, darkTheme, serverSnapshot); }
export function useHydrated() { return useSyncExternalStore(noSubscribe, () => true, serverSnapshot); }
export function setDataSaver(on: boolean) { write("vs_saver", on ? "1" : "0"); }
export function setDarkTheme(on: boolean) { write("vs_theme", on ? "dark" : "light"); }
