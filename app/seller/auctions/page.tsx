import Image from "next/image";
import Link from "next/link";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { AuctionDraftForm } from "@/app/components/AuctionManagementForms";
import { GalleryShell } from "@/app/components/GalleryShell";
import { getDb } from "@/db";
import { artistProfiles, auctionBids, auctions, artworkImages, artworks } from "@/db/schema";
import { auctionsEnabled } from "@/lib/auctions/feature-flag";

export const dynamic = "force-dynamic";
export default async function SellerAuctionsPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "SELLER" && session.user.role !== "ADMIN")) return null;
  const [artist] = await getDb().select({ id: artistProfiles.id }).from(artistProfiles).where(eq(artistProfiles.userId, session.user.id)).limit(1);
  if (!artist) return null;
  const enabled = auctionsEnabled();
  const [eligible, records] = enabled ? await Promise.all([
    getDb().select({ id: artworks.id, title: artworks.title }).from(artworks).where(and(eq(artworks.artistId, artist.id), eq(artworks.status, "PUBLISHED"), eq(artworks.availability, "AVAILABLE"), eq(artworks.stock, 1), eq(artworks.currency, "INR"))),
    getDb().select({ id: auctions.id, status: auctions.status, createdAt: auctions.createdAt, startsAt: auctions.startsAt, endsAt: auctions.endsAt, current: auctions.currentBidPaise, opening: auctions.openingBidPaise, winnerId: auctions.winnerId, title: artworks.title, image: artworkImages.url }).from(auctions).innerJoin(artworks, eq(auctions.artworkId, artworks.id)).leftJoin(artworkImages, and(eq(artworkImages.artworkId, artworks.id), eq(artworkImages.sortOrder, 0))).where(eq(auctions.sellerId, artist.id)).orderBy(desc(auctions.createdAt)),
  ]) : [[], []];
  const bidCounts = records.length ? await getDb().select({ auctionId: auctionBids.auctionId, value: count() }).from(auctionBids).where(inArray(auctionBids.auctionId, records.map((row) => row.id))).groupBy(auctionBids.auctionId) : [];
  const bidCountByAuction = new Map(bidCounts.map((row) => [row.auctionId, Number(row.value)]));
  return <GalleryShell><main className="section-shell py-16"><p className="eyebrow">Seller test tools</p><h1 className="section-title mt-6">Auction <i>studio.</i></h1>{!enabled ? <p className="mt-6 text-white/55">Auctions are disabled in this environment.</p> : <><p className="mt-5 text-white/55">Drafts await admin approval. Stock is reserved only when scheduled.</p><AuctionDraftForm eligible={eligible} /><section className="mt-12"><h2 className="font-serif text-3xl">Your auctions</h2><ul className="mt-5 space-y-3">{records.map((item) => <li key={item.id} className="grid gap-5 border border-white/10 p-5 sm:grid-cols-[7rem_1fr_auto] sm:items-center">{item.image ? <div className="relative aspect-square overflow-hidden"><Image src={item.image} alt={item.title} fill sizes="112px" className="object-cover" /></div> : <div className="aspect-square bg-white/5" />}<div><p className="font-serif text-2xl">{item.title}</p><p className="text-sm text-white/50">{item.status.replaceAll("_", " ")} · {bidCountByAuction.get(item.id) ?? 0} bids · {item.current === null ? "Opening" : "Current"} ₹{(Number(item.current ?? item.opening) / 100).toLocaleString("en-IN")}</p><p className="mt-1 text-xs text-white/40">{item.startsAt.toLocaleString("en-IN")} to {item.endsAt.toLocaleString("en-IN")}{item.winnerId ? " · Winner selected" : ""}</p></div>{item.status !== "DRAFT" && item.status !== "CANCELLED" && <Link className="button-outline" href={`/auctions/${item.id}`}>View auction</Link>}</li>)}{!records.length && <li className="text-white/45">No auction records yet.</li>}</ul></section></>}</main></GalleryShell>;
}
