import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("public artist boundary", () => {
  it("derives artist pages from the published-only catalog", () => {
    const source = readFileSync("lib/marketplace-data.ts", "utf8");
    const start = source.indexOf("export async function getArtistBySlug");
    const end = source.indexOf("export async function getBuyerOrders", start);
    const implementation = source.slice(start, end);
    expect(implementation).toContain("getMarketplaceCatalog()");
    expect(implementation).not.toMatch(/email|phone|buyerId|userId/);
  });

  it("does not render private contact or moderation fields", () => {
    const page = readFileSync("app/artist/[slug]/page.tsx", "utf8");
    expect(page).not.toMatch(/\.email|\.phone|reviewNotes|identityStatus|payoutReference/);
  });
});
