import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { GalleryShell } from "@/app/components/GalleryShell";
import { CheckoutForm } from "@/app/components/CheckoutForm";
import { getDb } from "@/db";
import { auctionPaymentAttempts, auctions, artworks } from "@/db/schema";
import { auctionsEnabled } from "@/lib/auctions/feature-flag";
import { settleDueAuctions } from "@/lib/auctions/lifecycle";

export const dynamic = "force-dynamic";
export default async function WonAuctionPage() {
  const session = await auth(); if (!session?.user || !auctionsEnabled()) return null; await settleDueAuctions();
  const rows = await getDb().select({ id: auctions.id, title: artworks.title, deadline: auctions.paymentDeadlineAt, bid: auctions.winningBidPaise }).from(auctionPaymentAttempts).innerJoin(auctions, eq(auctionPaymentAttempts.auctionId, auctions.id)).innerJoin(artworks, eq(auctions.artworkId, artworks.id)).where(and(eq(auctionPaymentAttempts.winnerId, session.user.id), eq(auctions.status, "PAYMENT_PENDING"), eq(auctionPaymentAttempts.status, "PENDING")));
  return <GalleryShell><main className="section-shell py-16"><p className="eyebrow">Test auction winner</p><h1 className="section-title mt-5">Complete your <i>winning bid.</i></h1>{rows.map((row) => <section key={row.id} className="mt-10 max-w-2xl border border-white/10 p-7"><h2 className="font-serif text-3xl">{row.title}</h2><p className="mt-3 text-white/55">Winning bid ₹{Number(row.bid ?? 0n) / 100}. Pay before {row.deadline?.toLocaleString("en-IN")}.</p><div className="mt-7"><CheckoutForm auctionId={row.id} /></div></section>)}{!rows.length && <p className="mt-8 text-white/55">You have no payable auction wins.</p>}</main></GalleryShell>;
}
