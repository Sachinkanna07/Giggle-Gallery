import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("launch polish boundaries", () => {
  it("uses client routing and reports a dismissed payment window", () => {
    const artworkActions = readFileSync("app/components/ArtworkPageActions.tsx", "utf8");
    const checkout = readFileSync("app/components/CheckoutForm.tsx", "utf8");
    expect(artworkActions).not.toContain("window.location.href =");
    expect(checkout).not.toContain("window.location.href =");
    expect(checkout).toContain("ondismiss");
    expect(checkout).toContain("Your purchase was not confirmed");
  });

  it("keeps private application routes out of crawler access", () => {
    const robots = readFileSync("app/robots.ts", "utf8");
    const sitemap = readFileSync("app/sitemap.ts", "utf8");
    for (const route of ["/account", "/admin", "/api", "/checkout", "/orders", "/seller"]) {
      expect(robots).toContain(`"${route}"`);
      expect(sitemap).not.toContain(`url: \`${route}`);
    }
  });

  it("marks persistent artwork controls with pressed state", () => {
    const actions = readFileSync("app/components/ArtworkPageActions.tsx", "utf8");
    const detail = readFileSync("app/components/ArtworkDetail.tsx", "utf8");
    expect(actions).toContain("aria-pressed={liked}");
    expect(actions).toContain("aria-pressed={saved}");
    expect(detail).toContain("aria-pressed={liked}");
    expect(detail).toContain("aria-pressed={saved}");
  });
});
