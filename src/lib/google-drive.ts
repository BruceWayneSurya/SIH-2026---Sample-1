/**
 * Accept file-sharing links only, not folders, Google Docs or arbitrary URLs.
 * This validates the link shape, not the file's MIME type or sharing permissions.
 * No file is fetched or copied: the PDF stays in the contributor's Google Drive.
 */
export function normalizeGoogleDriveUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== "https:" ||
      url.hostname !== "drive.google.com" ||
      url.port ||
      url.username ||
      url.password
    ) {
      return null;
    }

    const pathMatch = url.pathname.match(
      /^\/file\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)(?:\/(?:view|preview|edit))?\/?$/,
    );
    const queryLink = /^\/(?:open|uc)\/?$/.test(url.pathname);
    const fileId = pathMatch?.[1] ?? (queryLink ? url.searchParams.get("id") : null);
    if (!fileId || !/^[a-zA-Z0-9_-]+$/.test(fileId)) return null;

    const normalized = new URL(`https://drive.google.com/file/d/${fileId}/view`);
    // Some shared files require this key even with "Anyone with the link" access.
    const resourceKey = url.searchParams.get("resourcekey");
    if (resourceKey) normalized.searchParams.set("resourcekey", resourceKey);
    return normalized.toString();
  } catch {
    return null;
  }
}
