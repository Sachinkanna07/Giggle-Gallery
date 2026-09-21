import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { GalleryShell } from "@/app/components/GalleryShell";
import { getDb } from "@/db";
import { auctions, artworks } from "@/db/schema";
import { auctionsEnabled } from "@/lib/auctions/feature-flag";
import { settleDueAuctions } from "@/lib/auctions/lifecycle";

export const dynamic = "force-dynamic";
export default async function AuctionsPage() {
  const enabled = auctionsEnabled();
  if (enabled) await settleDueAuctions();
  const rows = enabled ? await getDb().select({ id: auctions.id, status: auctions.status, endsAt: auctions.endsAt, currentBidPaise: auctions.currentBidPaise, openingBidPaise: auctions.openingBidPaise, title: artworks.title }).from(auctions).innerJoin(artworks, eq(auctions.artworkId, artworks.id)).where(inArray(auctions.status, ["SCHEDULED", "LIVE", "PAYMENT_PENDING"])).orderBy(desc(auctions.endsAt)) : [];
  return <GalleryShell><main className="section-shell py-16 lg:py-24"><p className="eyebrow">Test mode</p><h1 className="section-title mt-6">Live art <i>auctions.</i></h1>{!enabled ? <p className="mt-6 max-w-xl text-white/55">Auctions are not enabled in this environment.</p> : <div className="mt-10 grid gap-5 md:grid-cols-2">{rows.map((row) => <Link key={row.id} href={`/auctions/${row.id}`} className="border border-white/10 p-7 hover:border-white/35"><p className="text-xs text-white/45">{row.status.replaceAll("_", " ")} · ends {row.endsAt.toLocaleString("en-IN")}</p><h2 className="mt-3 font-serif text-3xl">{row.title}</h2><p className="mt-5 text-white/65">Current bid ₹{Number(row.currentBidPaise ?? row.openingBidPaise) / 100}</p></Link>)}{!rows.length && <p className="text-white/50">No scheduled or live test auctions.</p>}</div>}</main></GalleryShell>;
}
