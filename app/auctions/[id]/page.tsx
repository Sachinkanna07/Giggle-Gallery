import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { GalleryShell } from "@/app/components/GalleryShell";
import { placeAuctionBidForm } from "@/app/actions/auctions";
import { getDb } from "@/db";
import { auctionBids, auctions, artworks } from "@/db/schema";
import { auctionsEnabled } from "@/lib/auctions/feature-flag";
import { settleAuctionIfDue } from "@/lib/auctions/lifecycle";
import { minimumAllowedBid } from "@/lib/auctions/rules";

export const dynamic = "force-dynamic";
export default async function AuctionPage({ params }: { params: Promise<{ id: string }> }) {
  if (!auctionsEnabled()) notFound();
  const { id } = await params; await settleAuctionIfDue(id);
  const [row] = await getDb().select({ id: auctions.id, status: auctions.status, opening: auctions.openingBidPaise, current: auctions.currentBidPaise, increment: auctions.minimumIncrementPaise, endsAt: auctions.endsAt, title: artworks.title }).from(auctions).innerJoin(artworks, eq(auctions.artworkId, artworks.id)).where(eq(auctions.id, id)).limit(1);
  if (!row) notFound();
  const bids = await getDb().select({ amount: auctionBids.amountPaise, createdAt: auctionBids.createdAt }).from(auctionBids).where(eq(auctionBids.auctionId, id)).orderBy(desc(auctionBids.amountPaise), desc(auctionBids.createdAt)).limit(20);
  const minimum = minimumAllowedBid(row.opening, row.current, row.increment);
  const bid = placeAuctionBidForm.bind(null, id);
  return <GalleryShell><main className="section-shell py-16"><p className="eyebrow">Test auction · {row.status}</p><h1 className="section-title mt-5">{row.title}</h1><p className="mt-5 text-xl">Current bid: ₹{Number(row.current ?? row.opening) / 100}</p><p className="mt-2 text-sm text-white/50">Minimum next bid ₹{Number(minimum) / 100}; ends {row.endsAt.toLocaleString("en-IN")}</p>{row.status === "LIVE" && <form action={bid} className="mt-8 flex max-w-md gap-3"><input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} /><input className="w-full bg-white/10 p-3" name="amountPaise" type="number" min={Number(minimum)} step="1" defaultValue={String(minimum)} /><button className="button-light">Place bid</button></form>}<section className="mt-12"><h2 className="font-serif text-3xl">Bid history</h2><ol className="mt-5 space-y-2 text-sm text-white/60">{bids.map((bid, index) => <li key={`${bid.createdAt.toISOString()}-${index}`}>Bidder {index + 1} · ₹{Number(bid.amount) / 100} · {bid.createdAt.toLocaleString("en-IN")}</li>)}</ol></section></main></GalleryShell>;
}
