import { describe, expect, it } from "vitest";
import { artworkUploadPrefix, isApprovedArtworkBlobUrl } from "../../lib/blob-validation";

describe("artwork Blob ownership validation", () => {
  it("accepts only the exact expected pathname on a Vercel Blob public host", () => {
    const pathname = `${artworkUploadPrefix("seller-1", "intent-1") }image.webp`;
    expect(isApprovedArtworkBlobUrl(`https://store.public.blob.vercel-storage.com/${pathname}`, pathname)).toBe(true);
    expect(isApprovedArtworkBlobUrl("https://example.com/image.webp", pathname)).toBe(false);
    expect(isApprovedArtworkBlobUrl("https://store.public.blob.vercel-storage.com/artworks/other/image.webp", pathname)).toBe(false);
  });
});
