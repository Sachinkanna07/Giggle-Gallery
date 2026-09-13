const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

export function isApprovedArtworkBlobUrl(value: string, expectedPathname: string): boolean {
  try {
    const url = new URL(value);
    const pathname = decodeURIComponent(url.pathname).replace(/^\//, "");
    return url.protocol === "https:" && url.hostname.endsWith(BLOB_HOST_SUFFIX) && pathname === expectedPathname;
  } catch {
    return false;
  }
}

export function artworkUploadPrefix(userId: string, intentId: string): string {
  return `artworks/${userId}/${intentId}/`;
}
