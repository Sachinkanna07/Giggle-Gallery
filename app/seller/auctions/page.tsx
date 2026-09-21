import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { createAuctionDraftForm } from "@/app/actions/auctions";
import { GalleryShell } from "@/app/components/GalleryShell";
import { getDb } from "@/db";
import { artistProfiles, auctions, artworks } from "@/db/schema";
import { auctionsEnabled } from "@/lib/auctions/feature-flag";

export const dynamic = "force-dynamic";
export default async function SellerAuctionsPage() {
  const session = await auth(); if (!session?.user || (session.user.role !== "SELLER" && session.user.role !== "ADMIN")) return null;
  const [artist] = await getDb().select({ id: artistProfiles.id }).from(artistProfiles).where(eq(artistProfiles.userId, session.user.id)).limit(1);
  if (!artist) return null; const enabled = auctionsEnabled();
  const [eligible, drafts] = enabled ? await Promise.all([getDb().select({ id: artworks.id, title: artworks.title }).from(artworks).where(and(eq(artworks.artistId, artist.id), eq(artworks.status, "PUBLISHED"), eq(artworks.availability, "AVAILABLE"), eq(artworks.stock, 1))), getDb().select({ id: auctions.id, status: auctions.status, artworkId: auctions.artworkId, createdAt: auctions.createdAt }).from(auctions).where(eq(auctions.sellerId, artist.id)).orderBy(desc(auctions.createdAt))]) : [[], []];
  return <GalleryShell><main className="section-shell py-16"><p className="eyebrow">Seller test tools</p><h1 className="section-title mt-6">Auction <i>drafts.</i></h1>{!enabled ? <p className="mt-6 text-white/55">Auctions are disabled in this environment.</p> : <><form action={createAuctionDraftForm} className="mt-10 grid max-w-2xl gap-4 border border-white/10 p-6"><select name="artworkId" required className="bg-white/10 p-3"><option value="">Choose published single-stock artwork</option>{eligible.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><input className="bg-white/10 p-3" name="openingBidPaise" type="number" min="1" placeholder="Opening bid in paise" required /><input className="bg-white/10 p-3" name="minimumIncrementPaise" type="number" min="1" placeholder="Minimum increment in paise" required /><input className="bg-white/10 p-3" name="startsAt" type="datetime-local" required /><input className="bg-white/10 p-3" name="endsAt" type="datetime-local" required /><button className="button-light">Create draft for admin review</button></form><section className="mt-12"><h2 className="font-serif text-3xl">Your auction records</h2><ul className="mt-5 space-y-2 text-white/60">{drafts.map((item) => <li key={item.id}>{item.status.replaceAll("_", " ")} · {item.createdAt.toLocaleString("en-IN")}</li>)}</ul></section></>}</main></GalleryShell>;
}
