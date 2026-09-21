/** Auctions are deliberately inert unless both controls are explicitly enabled. */
export function auctionsEnabled(): boolean {
  return process.env.AUCTIONS_ENABLED === "true" && process.env.AUCTIONS_TEST_MODE === "true";
}

export function requireAuctionsEnabled(): void {
  if (!auctionsEnabled()) throw new Error("AUCTIONS_DISABLED");
}
