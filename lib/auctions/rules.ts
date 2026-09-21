export const AUCTION_PAYMENT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function minimumAllowedBid(openingBidPaise: bigint, currentBidPaise: bigint | null, incrementPaise: bigint): bigint {
  return currentBidPaise === null ? openingBidPaise : currentBidPaise + incrementPaise;
}

export function auctionPaymentExpired(deadlineAt: Date, now = new Date()): boolean {
  return deadlineAt.getTime() <= now.getTime();
}
