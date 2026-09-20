import type { MetadataRoute } from "next";
import { getMarketplaceCatalog } from "@/lib/marketplace-data";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const catalog = await getMarketplaceCatalog();
  return [
    { url: baseUrl, changeFrequency: "daily", priority: 1 },
    ...catalog.artworks.map((artwork) => ({
      url: `${baseUrl}/artwork/${artwork.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...catalog.artists.map((artist) => ({
      url: `${baseUrl}/artist/${artist.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
