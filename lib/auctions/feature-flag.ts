/** Auctions are deliberately inert unless both controls are explicitly enabled. */
export function auctionsEnabled(): boolean {
  return process.env.AUCTIONS_ENABLED === "true"
    && process.env.AUCTIONS_TEST_MODE === "true"
    && process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test_") === true;
}

export function requireAuctionsEnabled(): void {
  if (!auctionsEnabled()) throw new Error("AUCTIONS_DISABLED");
}
