import { getMarketplaceCatalog } from "@/lib/marketplace-data";

export async function GET() {
  const catalog = await getMarketplaceCatalog();
  return Response.json({ artworks: catalog.artworks.map((artwork) => ({ id: artwork.id, likes: artwork.likes, views: artwork.views, availability: artwork.availability, stock: artwork.stock })), artists: catalog.artists.map((artist) => ({ id: artist.id, followers: artist.followerCount })) }, { headers: { "Cache-Control": "no-store" } });
}
