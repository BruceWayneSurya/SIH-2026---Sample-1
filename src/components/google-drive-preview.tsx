"use client";

import {
  TranslatedText as T,
  useTranslation,
} from "@/components/language-provider";

import { useId, useState } from "react";
import { ExternalLink, FileText, Loader2 } from "lucide-react";
import {
  googleDrivePreviewUrl,
  normalizeGoogleDriveUrl,
} from "@/lib/google-drive";

/** Google handles rendering; private/restricted files still require Drive access. */
export function GoogleDrivePreview({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const viewerId = useId();
  const previewUrl = googleDrivePreviewUrl(url);
  const viewUrl = normalizeGoogleDriveUrl(url);
  if (!previewUrl || !viewUrl) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-navy-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-navy-100 bg-navy-50 px-3 py-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-navy-800">
          <FileText className="h-4 w-4" /> <T>PDF preview</T>
        </span>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={viewerId}
          onClick={() => {
            setOpen((previous) => !previous);
            setLoading(true);
          }}
          className="ml-auto rounded px-2 py-1 text-[13px] font-semibold text-navy-700 hover:bg-navy-100"
        >
          <T>{open ? "Hide preview" : "Show preview"}</T>
        </button>
      </div>
      {open && (
        <div id={viewerId} className="relative bg-slate-100">
          {loading && (
            <p
              role="status"
              className="absolute left-3 top-3 z-10 inline-flex items-center gap-2 rounded bg-white/95 px-3 py-2 text-sm text-navy-700 shadow-sm"
            >
              <Loader2 className="h-4 w-4 animate-spin" />{" "}
              <T>Loading PDF preview…</T>
            </p>
          )}
          <iframe
            src={previewUrl}
            title={`${t("PDF preview")}: ${title}`}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            onLoad={() => setLoading(false)}
            onError={() => setLoading(false)}
            className="block h-[420px] w-full border-0 sm:h-[560px]"
          />
        </div>
      )}
      <div className="space-y-1.5 border-t border-navy-100 px-3 py-2.5">
        <a
          href={viewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-navy-700 hover:underline"
        >
          <T>Open PDF in Google Drive</T> <ExternalLink className="h-3.5 w-3.5" />
          <span className="sr-only">
            <T>(opens in a new tab)</T>
          </span>
        </a>
        <p className="text-[12px] leading-relaxed text-slate-500">
          <T>Preview unavailable or asking for access? Set the PDF to</T>{" "}
          <b>
            <T>Anyone with the link · Viewer</T>
          </b>{" "}
          <T>
            in Drive, or use the link above. Google controls file access and embedded
            previews.
          </T>
        </p>
      </div>
    </div>
  );
}
