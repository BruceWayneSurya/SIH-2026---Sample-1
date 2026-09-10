/**
 * YouTube link handling for faculty-uploaded lectures.
 *
 * Bulk content (an Excel sheet of links) arrives as whatever URL the uploader
 * copied: `watch?v=`, `youtu.be`, `/shorts/`, `/embed/` or `/live/`. The portal
 * stores the canonical watch URL and renders the privacy-enhanced embed, so
 * learners get a player without being tracked across other sites.
 */

export type YouTubeLink = {
  /** Canonical page URL, stable across re-imports and dedupe. */
  watchUrl: string;
  /** Privacy-enhanced embed URL for the <iframe> player. */
  embedUrl: string;
  /** 11-character video id. */
  id: string;
};

const ID = /^[A-Za-z0-9_-]{11}$/;

/** Pull the video id out of any common YouTube URL shape. */
export function parseYouTubeId(input: string): string | null {
  const url = input?.trim();
  if (!url) return null;
  // Bare id pasted on its own.
  if (ID.test(url)) return url;
  let parsed: URL | null = null;
  try {
    parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^www\./, "").replace(/^m\./, "");
  if (host === "youtu.be") {
    const id = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
    return ID.test(id) ? id : null;
  }
  if (host !== "youtube.com" && host !== "youtube-nocookie.com") return null;
  const v = parsed.searchParams.get("v");
  if (v && ID.test(v)) return v;
  const parts = parsed.pathname.split("/").filter(Boolean);
  const keyed = ["shorts", "embed", "live", "v"];
  for (let i = 0; i < parts.length - 1; i++) {
    if (keyed.includes(parts[i]) && ID.test(parts[i + 1])) return parts[i + 1];
  }
  return null;
}

/** Canonicalize any YouTube URL shape; null when the link is not YouTube. */
export function normalizeYouTubeUrl(input: string): YouTubeLink | null {
  const id = parseYouTubeId(input);
  if (!id) return null;
  return {
    id,
    watchUrl: `https://www.youtube.com/watch?v=${id}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
  };
}
