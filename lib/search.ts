import { Artwork, scoreArtwork } from "@/app/data";

export type ArtworkFilters = {
  query?: string;
  category?: string;
  style?: string;
  mood?: string;
  medium?: string;
  artist?: string;
  year?: number;
  availability?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: "Recommended" | "Trending" | "Newest" | "Popular" | "Price low" | "Price high";
  preferences?: string[];
};

const ignored = new Set(["art", "artwork", "artworks", "show", "find", "want", "something", "for", "the", "with", "and", "my", "me", "please", "indian", "artists"]);
const expansions: Record<string, string[]> = {
  modern: ["contemporary", "minimalism", "digital"],
  bedroom: ["calm", "peaceful", "dreamy", "minimal"],
  peaceful: ["peaceful", "calm", "quiet", "meditative"],
  dark: ["dark", "black", "night", "mysterious"],
  blue: ["blue", "ocean", "night"],
};

export function parseNaturalQuery(query: string) {
  const priceMatch = query.match(/(?:under|below|less than)\s*(?:₹|rs\.?|inr)?\s*([0-9,]+)/i);
  const maxPrice = priceMatch ? Number(priceMatch[1].replaceAll(",", "")) : undefined;
  const cleaned = query.replace(/(?:under|below|less than)\s*(?:₹|rs\.?|inr)?\s*[0-9,]+/i, " ");
  const terms = cleaned.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 2 && !ignored.has(term));
  return { terms, maxPrice };
}

export function searchArtworks(records: Artwork[], filters: ArtworkFilters) {
  const parsed = parseNaturalQuery(filters.query ?? "");
  const maxPrice = filters.maxPrice ?? parsed.maxPrice;
  const scored = records
    .filter((artwork) => !filters.category || filters.category === "All categories" || artwork.category === filters.category)
    .filter((artwork) => !filters.style || filters.style === "All styles" || artwork.style === filters.style)
    .filter((artwork) => !filters.mood || filters.mood === "All moods" || artwork.mood === filters.mood)
    .filter((artwork) => !filters.medium || filters.medium === "All media" || artwork.medium === filters.medium)
    .filter((artwork) => !filters.artist || filters.artist === "All artists" || artwork.artist === filters.artist)
    .filter((artwork) => !filters.year || artwork.year === filters.year)
    .filter((artwork) => !filters.availability || filters.availability === "All availability" || artwork.availability === filters.availability)
    .filter((artwork) => filters.minPrice === undefined || artwork.price >= filters.minPrice)
    .filter((artwork) => maxPrice === undefined || artwork.price <= maxPrice)
    .map((artwork) => {
      const haystack = [artwork.title, artwork.artist, artwork.description, artwork.style, artwork.mood, artwork.medium, artwork.category ?? "", artwork.location, ...artwork.colors, ...artwork.tags].join(" ").toLowerCase();
      const queryScore = parsed.terms.reduce((total, term) => {
        if (haystack.includes(term)) return total + 5;
        return total + (expansions[term]?.some((synonym) => haystack.includes(synonym)) ? 2 : 0);
      }, 0);
      return { artwork, queryScore };
    })
    .filter(({ queryScore }) => parsed.terms.length === 0 || queryScore > 0);

  return scored.sort((a, b) => {
    switch (filters.sort) {
      case "Price low": return a.artwork.price - b.artwork.price;
      case "Price high": return b.artwork.price - a.artwork.price;
      case "Newest": return b.artwork.year - a.artwork.year;
      case "Popular": return b.artwork.likes - a.artwork.likes;
      case "Trending": return Number(b.artwork.trending) - Number(a.artwork.trending) || b.artwork.views - a.artwork.views;
      default: return b.queryScore - a.queryScore || scoreArtwork(b.artwork, filters.preferences ?? []) - scoreArtwork(a.artwork, filters.preferences ?? []);
    }
  }).map(({ artwork }) => artwork);
}
