import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import { asc, eq, inArray } from "drizzle-orm";
import { GalleryShell } from "@/app/components/GalleryShell";
import { formatPrice, scoreArtwork } from "@/app/data";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { auctions, artworks } from "@/db/schema";
import { auctionsEnabled } from "@/lib/auctions/feature-flag";
import { getMarketplaceCatalog, getViewerState } from "@/lib/marketplace-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [session, catalog] = await Promise.all([auth(), getMarketplaceCatalog()]);
  const viewer = await getViewerState(session?.user?.id);
  const auctionRows = auctionsEnabled() ? await getDb().select({ id: auctions.id, status: auctions.status, title: artworks.title, end: auctions.endsAt, current: auctions.currentBidPaise, opening: auctions.openingBidPaise }).from(auctions).innerJoin(artworks, eq(auctions.artworkId, artworks.id)).where(inArray(auctions.status, ["SCHEDULED", "LIVE"])).orderBy(asc(auctions.endsAt)).limit(4) : [];
  const hero = catalog.artworks.find((item) => item.featured) ?? catalog.artworks[0];
  const featured = catalog.artworks.filter((item) => item.id !== hero?.id).slice(0, 6);
  const personalized = viewer.preferences.length ? catalog.artworks.toSorted((a, b) => scoreArtwork(b, viewer.preferences) - scoreArtwork(a, viewer.preferences)).slice(0, 4) : [];
  return <GalleryShell><main>
    <section className="relative min-h-[72vh] overflow-hidden border-b border-white/10">
      {hero && <Image src={hero.image} alt={`${hero.title} by ${hero.artist}`} fill priority className="object-cover" sizes="100vw"/>}
      <div className="absolute inset-0 bg-gradient-to-r from-[#06080d] via-[#06080d]/70 to-transparent"/><div className="absolute inset-0 bg-gradient-to-t from-[#06080d] via-transparent to-black/20"/>
      <div className="relative mx-auto flex min-h-[72vh] max-w-[1500px] items-end px-5 py-16 sm:px-8 lg:px-12 lg:py-24"><div className="max-w-3xl"><p className="eyebrow">Independent art, thoughtfully collected</p><h1 className="mt-5 font-serif text-5xl leading-[.9] tracking-[-.06em] sm:text-7xl lg:text-[6.5rem]">Find the work that stays with you.</h1><p className="mt-6 max-w-xl text-base leading-relaxed text-white/65 sm:text-lg">Discover original and limited-edition works from artists across India, with direct collecting and live auctions in one considered space.</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/gallery" className="button-light">Explore the gallery <ArrowRight size={16}/></Link>{auctionsEnabled() && <Link href="/auctions" className="button-outline">View live auctions</Link>}</div></div></div>
    </section>
    {auctionRows.length > 0 && <Section eyebrow="Happening now" title="Live and upcoming auctions" action="/auctions"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{auctionRows.map((auction) => <Link key={auction.id} href={`/auctions/${auction.id}`} className="group border border-white/10 bg-[#0c1018] p-5 transition hover:-translate-y-1 hover:border-cobalt-light/50"><span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-[#5ec894]"><span className="size-2 rounded-full bg-current"/>{auction.status}</span><h3 className="mt-8 font-serif text-2xl">{auction.title}</h3><p className="mt-6 text-xs text-white/40">Current bid</p><p className="mt-1 text-xl">{formatPrice(Number(auction.current ?? auction.opening) / 100)}</p><p className="mt-4 flex items-center gap-2 text-sm text-white/45"><Clock3 size={14}/> Ends {auction.end.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p></Link>)}</div></Section>}
    <Section eyebrow="Editor’s selection" title="Featured works" action="/gallery"><ArtworkGrid items={featured}/></Section>
    <Section eyebrow="Meet the makers" title="Artists to discover"><div className="grid gap-5 md:grid-cols-3">{catalog.artists.slice(0, 3).map((artist) => <Link href={`/artist/${artist.slug}`} key={artist.id} className="group relative aspect-[4/3] overflow-hidden bg-white/5"><Image src={artist.image} alt={artist.name} fill className="object-cover transition duration-700 group-hover:scale-[1.03]"/><div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent"/><div className="absolute inset-x-0 bottom-0 p-6"><h3 className="font-serif text-3xl">{artist.name}</h3><p className="mt-1 text-sm text-white/60">{artist.discipline} · {artist.location}</p></div></Link>)}</div></Section>
    {personalized.length > 0 && <Section eyebrow="Based on your taste" title="Selected for you"><ArtworkGrid items={personalized}/></Section>}
    <footer className="border-t border-white/10 px-5 py-12 text-sm text-white/45 sm:px-8 lg:px-12"><div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-6 sm:flex-row"><p><span className="font-serif text-xl text-white">Giggle Gallery</span><br/>Art finds its people here.</p><nav className="flex flex-wrap gap-6"><Link href="/gallery">Gallery</Link>{auctionsEnabled() && <Link href="/auctions">Auctions</Link>}<Link href="/sell">Sell art</Link><Link href="/account">Account</Link></nav></div></footer>
  </main></GalleryShell>;
}

function Section({ eyebrow, title, action, children }: { eyebrow: string; title: string; action?: string; children: React.ReactNode }) { return <section className="mx-auto max-w-[1500px] px-5 py-14 sm:px-8 lg:px-12 lg:py-20"><div className="mb-8 flex items-end justify-between gap-4"><div><p className="eyebrow">{eyebrow}</p><h2 className="mt-2 font-serif text-4xl tracking-[-.045em] sm:text-5xl">{title}</h2></div>{action && <Link href={action} className="hidden items-center gap-2 text-sm text-white/55 hover:text-white sm:flex">View all <ArrowRight size={15}/></Link>}</div>{children}</section>; }
function ArtworkGrid({ items }: { items: Awaited<ReturnType<typeof getMarketplaceCatalog>>["artworks"] }) { return <div className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">{items.map((artwork) => <Link key={artwork.id} href={`/artwork/${artwork.slug}`} className="group"><div className="relative aspect-[4/5] overflow-hidden bg-white/5"><Image src={artwork.image} alt={`${artwork.title} by ${artwork.artist}`} fill className="object-cover transition duration-700 group-hover:scale-[1.025]" sizes="(max-width: 640px) 100vw, 33vw"/></div><div className="mt-4 flex justify-between gap-4"><div><h3 className="font-serif text-2xl">{artwork.title}</h3><p className="mt-1 text-sm text-white/50">{artwork.artist} · {artwork.year}</p></div><p className="text-sm font-semibold">{formatPrice(artwork.price)}</p></div></Link>)}</div>; }
