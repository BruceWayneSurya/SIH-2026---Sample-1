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
  }
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
function fontScale() {
  try {
    const saved = localStorage.getItem("vs_fontscale");
    return saved === "1" || saved === "2" ? saved : "0";
  } catch { return document.documentElement.dataset.fontscale ?? "0"; }
}
function highContrast() {
  try { return localStorage.getItem("vs_contrast") === "high"; }
  catch { return document.documentElement.dataset.contrast === "high"; }
}
function applyPreferences() {
  const dark = darkTheme();
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.dataset.saver = dataSaver() ? "1" : "0";
  const scale = fontScale();
  if (scale === "0") delete document.documentElement.dataset.fontscale;
  else document.documentElement.dataset.fontscale = scale;
  const contrast = highContrast();
  if (contrast) document.documentElement.dataset.contrast = "high";
  else delete document.documentElement.dataset.contrast;
}
function write(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* still works in this tab */ }
  if (key === "vs_saver") document.documentElement.dataset.saver = value;
  else if (key === "vs_theme") document.documentElement.dataset.theme = value;
  else if (key === "vs_fontscale") {
    if (value === "0") delete document.documentElement.dataset.fontscale;
    else document.documentElement.dataset.fontscale = value;
  } else if (key === "vs_contrast") {
    if (value === "high") document.documentElement.dataset.contrast = "high";
    else delete document.documentElement.dataset.contrast;
  }
  window.dispatchEvent(new Event("vs-preferences"));
}
export function useDataSaver() { return useSyncExternalStore(subscribe, dataSaver, serverSnapshot); }
export function useDarkTheme() { return useSyncExternalStore(subscribe, darkTheme, serverSnapshot); }
export function useFontScale() { return useSyncExternalStore(subscribe, fontScale, () => "0"); }
export function useHighContrast() { return useSyncExternalStore(subscribe, highContrast, serverSnapshot); }
export function useHydrated() { return useSyncExternalStore(noSubscribe, () => true, serverSnapshot); }
export function setDataSaver(on: boolean) { write("vs_saver", on ? "1" : "0"); }
export function setDarkTheme(on: boolean) { write("vs_theme", on ? "dark" : "light"); }
export function setFontScale(value: "0" | "1" | "2") { write("vs_fontscale", value); }
export function setHighContrast(on: boolean) { write("vs_contrast", on ? "high" : "off"); }
