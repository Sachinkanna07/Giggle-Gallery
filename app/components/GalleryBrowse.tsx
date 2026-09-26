"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { setCartQuantity, toggleLike, toggleSave } from "@/app/actions/marketplace";
import type { Artwork } from "@/app/data";
import type { ViewerState } from "@/lib/marketplace-data";
import { ArtworkCard } from "./ArtworkCard";
import { ArtworkDetail } from "./ArtworkDetail";

type Props = { artworks: Artwork[]; viewer: ViewerState; signedIn: boolean; databaseReady: boolean };

export function GalleryBrowse({ artworks, viewer, signedIn, databaseReady }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [medium, setMedium] = useState("All");
  const [availability, setAvailability] = useState("All");
  const [sort, setSort] = useState("featured");
  const [liked, setLiked] = useState(() => new Set(viewer.likedIds));
  const [saved, setSaved] = useState(() => new Set(viewer.savedIds));
  const [selected, setSelected] = useState<Artwork | null>(null);
  const [pending, startTransition] = useTransition();
  const mediums = useMemo(() => ["All", ...new Set(artworks.map((item) => item.medium))], [artworks]);
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return artworks.filter((item) => (!needle || `${item.title} ${item.artist} ${item.style} ${item.tags.join(" ")}`.toLowerCase().includes(needle)) && (medium === "All" || item.medium === medium) && (availability === "All" || item.availability === availability)).toSorted((a, b) => sort === "price-low" ? a.price - b.price : sort === "price-high" ? b.price - a.price : sort === "newest" ? b.year - a.year : Number(b.featured) - Number(a.featured));
  }, [artworks, availability, medium, query, sort]);
  function guard() { if (!signedIn) { router.push("/sign-in"); return false; } if (!databaseReady) { router.push("/account?setup=database"); return false; } return true; }
  function mutate(kind: "like" | "save", id: string) {
    if (!guard()) return;
    const setter = kind === "like" ? setLiked : setSaved;
    setter((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    startTransition(async () => { const result = kind === "like" ? await toggleLike(id) : await toggleSave(id); if (!result.ok) router.refresh(); });
  }
  function add(artwork: Artwork) {
    if (!guard() || artwork.availability !== "AVAILABLE") return;
    startTransition(async () => { const result = await setCartQuantity(artwork.id, 1); if (result.ok) { router.refresh(); window.dispatchEvent(new CustomEvent("giggle:cart-open")); } });
  }
  return <>
    <div className="mx-auto grid max-w-[1500px] gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:px-12">
      <aside className="h-fit border-y border-white/10 py-5 lg:sticky lg:top-24 lg:border-y-0 lg:border-r lg:pr-7">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-white/50"><SlidersHorizontal size={14}/> Refine</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <label className="text-xs text-white/45">Search<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Title, artist, style" className="mt-2 w-full rounded-lg border border-white/15 bg-white/[.04] px-3 py-3 text-sm text-white outline-none focus:border-cobalt-light"/></label>
          <label className="text-xs text-white/45">Medium<select value={medium} onChange={(event) => setMedium(event.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-[#0c1018] px-3 py-3 text-sm text-white">{mediums.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="text-xs text-white/45">Availability<select value={availability} onChange={(event) => setAvailability(event.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-[#0c1018] px-3 py-3 text-sm text-white"><option>All</option><option value="AVAILABLE">Available</option><option value="RESERVED">At auction</option><option value="SOLD_OUT">Sold</option></select></label>
          <label className="text-xs text-white/45">Sort<select value={sort} onChange={(event) => setSort(event.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-[#0c1018] px-3 py-3 text-sm text-white"><option value="featured">Featured</option><option value="newest">Newest</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label>
        </div>
      </aside>
      <section><div className="mb-7 flex items-end justify-between gap-4"><div><p className="eyebrow">Curated marketplace</p><h1 className="mt-2 font-serif text-4xl tracking-[-.04em] sm:text-5xl">The Gallery</h1></div><p className="text-sm text-white/45">{results.length} works</p></div>
        {results.length ? <div className={`grid gap-x-5 gap-y-10 sm:grid-cols-2 xl:grid-cols-3 ${pending ? "opacity-70" : ""}`}>{results.map((artwork, index) => <ArtworkCard key={artwork.id} artwork={artwork} liked={liked.has(artwork.id)} saved={saved.has(artwork.id)} onLike={(id) => mutate("like", id)} onSave={(id) => mutate("save", id)} onView={setSelected} onCart={add} priority={index < 3}/>)}</div> : <div className="border border-white/10 bg-white/[.025] p-12 text-center text-white/55">No works match these filters.</div>}
      </section>
    </div>
    <ArtworkDetail artwork={selected} liked={Boolean(selected && liked.has(selected.id))} saved={Boolean(selected && saved.has(selected.id))} reason="Selected from the gallery for its distinctive visual language." onClose={() => setSelected(null)} onLike={() => selected && mutate("like", selected.id)} onSave={() => selected && mutate("save", selected.id)} onCart={() => selected && add(selected)} onArtist={(artistId) => router.push(`/artist/${artworks.find((item) => item.artistId === artistId)?.artist.toLowerCase().replace(/[^a-z0-9]+/g, "-") ?? ""}`)}/>
  </>;
}
