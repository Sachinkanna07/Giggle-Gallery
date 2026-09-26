export const AUCTION_PAYMENT_WINDOW_MS = 24 * 60 * 60 * 1000;
export const AUCTION_EXTENSION_WINDOW_MS = 2 * 60 * 1000;
export const AUCTION_EXTENSION_MS = 2 * 60 * 1000;

export function minimumAllowedBid(openingBidPaise: bigint, currentBidPaise: bigint | null, incrementPaise: bigint): bigint {
  return currentBidPaise === null ? openingBidPaise : currentBidPaise + incrementPaise;
}

export function auctionPaymentExpired(deadlineAt: Date, now = new Date()): boolean {
  return deadlineAt.getTime() <= now.getTime();
}

export function extendedAuctionEnd(endsAt: Date, now = new Date()): Date | null {
  const remaining = endsAt.getTime() - now.getTime();
  if (remaining <= 0 || remaining > AUCTION_EXTENSION_WINDOW_MS) return null;
  return new Date(endsAt.getTime() + AUCTION_EXTENSION_MS);
}
