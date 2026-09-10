"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

/**
 * Registers the service worker and, when a new version is waiting, offers the
 * reload instead of swapping assets under a learner mid-quiz.
 */
export function ServiceWorkerRegistrar() {
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    let cancelled = false;
    void navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        if (cancelled) return;
        if (registration.waiting) setWaiting(true);
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          installing?.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller)
              setWaiting(true);
          });
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!waiting) return null;
  return (
    <button
      type="button"
      onClick={() => {
        navigator.serviceWorker.controller?.postMessage({ type: "SKIP_WAITING" });
        window.location.reload();
      }}
      className="fixed bottom-4 left-4 z-50 inline-flex items-center gap-2 rounded-full border border-navy-200 bg-white px-4 py-2 text-[12.5px] font-bold text-navy-800 shadow-lg"
    >
      <Download className="h-3.5 w-3.5" /> An offline update is ready — reload
    </button>
  );
}
