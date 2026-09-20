import { describe, expect, it } from "vitest";
import type { Artwork } from "../../app/data";
import { normalizeArtworkFilters, searchArtworks } from "../../lib/search";

const base: Artwork = { id: "1", slug: "blue-dream", title: "Blue Dream", artist: "Asha", artistId: "artist-1", location: "Chennai", image: "/blue.png", price: 1000, currency: "INR", medium: "Oil", year: 2026, dimensions: "10 × 10 cm", style: "Contemporary", mood: "Calm", colors: ["blue", "white"], tags: [], description: "A calm blue work", artistStatement: "Test", likes: 2, views: 5, rating: 4.5, featured: false, trending: false, category: "Painting", availability: "AVAILABLE", stock: 1, type: "PHYSICAL" };

describe("artwork search", () => {
  it("filters by artist, format, color, and price", () => {
    const digital = { ...base, id: "2", title: "Red Signal", artist: "Mira", type: "DIGITAL" as const, colors: ["red"], price: 500 };
    expect(searchArtworks([base, digital], { query: "Mira", type: "DIGITAL", color: "red", maxPrice: 600 })).toEqual([digital]);
  });
  it("normalizes untrusted query parameters", () => {
    expect(normalizeArtworkFilters({ q: "  blue  ", type: "SCRIPT", sort: "DROP TABLE", maxPrice: "-5", year: "2026" })).toMatchObject({ query: "blue", type: undefined, sort: "Recommended", maxPrice: undefined, year: 2026 });
  });
  it("sorts prices in both directions", () => {
    const cheaper = { ...base, id: "2", price: 50 };
    expect(searchArtworks([base, cheaper], { sort: "Price low" }).map((item) => item.id)).toEqual(["2", "1"]);
    expect(searchArtworks([base, cheaper], { sort: "Price high" }).map((item) => item.id)).toEqual(["1", "2"]);
  });
});
