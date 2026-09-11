"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Heart, Home, Search, ShoppingBag, Sparkles, UserRound } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { clearCart as clearCartAction, recordArtworkView, saveTasteProfile, setCartQuantity, toggleFollow as toggleFollowAction, toggleLike as toggleLikeAction, toggleSave as toggleSaveAction } from "@/app/actions/marketplace";
import type { ArtistSummary, ViewerState } from "@/lib/marketplace-data";
import { ArtworkCard } from "./ArtworkCard";
import { ArtworkDetail } from "./ArtworkDetail";
import { ArtistDialog } from "./ArtistDialog";
import { CommerceSheet } from "./CommerceSheet";
import { DiscoveryDialog } from "./DiscoveryDialog";
import { GiggleAssistant } from "./GiggleAssistant";
import { Artwork, moods, recommendationReason, styles } from "../data";

const moodColors: Record<string, string> = { Joyful: "#c15b48", Calm: "#2757ff", Energetic: "#a83b31", Mysterious: "#5b45a9", Dreamy: "#446f98", Dark: "#202636", Peaceful: "#1f6d66", Bold: "#b27932" };
const moodSymbols: Record<string, string> = { Joyful: "◉", Calm: "≈", Energetic: "↯", Mysterious: "◐", Dreamy: "✦", Dark: "●", Peaceful: "⌁", Bold: "▲" };

type Props = {
  initialArtworks: Artwork[];
  artists: ArtistSummary[];
  viewer: ViewerState;
  user: { name?: string | null; email?: string | null } | null;
  databaseReady: boolean;
};

export function GalleryExperience({ initialArtworks, artists, viewer, user, databaseReady }: Props) {
  const [liked, setLiked] = useState<string[]>(viewer.likedIds);
  const [saved, setSaved] = useState<string[]>(viewer.savedIds);
  const [cart, setCart] = useState(viewer.cart);
  const [followed, setFollowed] = useState<string[]>(viewer.followedArtistIds);
  const [preferences, setPreferences] = useState<string[]>(viewer.preferences.length ? viewer.preferences : ["Calm", "blue", "Minimalism"]);
  const [mood, setMood] = useState("All moods");
  const [style, setStyle] = useState("All styles");
  const [category, setCategory] = useState("All categories");
  const [availability, setAvailability] = useState("All availability");
  const [medium, setMedium] = useState("All media");
  const [artistFilter, setArtistFilter] = useState("All artists");
  const [year, setYear] = useState("All years");
  const [maxPrice, setMaxPrice] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("Recommended");
  const [results, setResults] = useState(initialArtworks);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [detail, setDetail] = useState<Artwork | null>(null);
  const [artistId, setArtistId] = useState<string | null>(null);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [personalized, setPersonalized] = useState(viewer.preferences.length > 0);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const lifecycle = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchError("");
      const params = new URLSearchParams({ q: query, mood, style, category, availability, medium, artist: artistFilter, year: year === "All years" ? "" : year, maxPrice, sort });
      try {
        const response = await fetch(`/api/artworks?${params}`, { signal: lifecycle.signal });
        if (!response.ok) throw new Error("Search failed");
        const payload = await response.json() as { results: Artwork[] };
        setResults(payload.results);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setSearchError("The gallery search is unavailable. Try again in a moment.");
      } finally {
        if (!lifecycle.signal.aborted) setSearching(false);
      }
    }, 320);
    return () => { lifecycle.abort(); window.clearTimeout(timer); };
  }, [query, mood, style, category, availability, medium, artistFilter, year, maxPrice, sort]);

  useEffect(() => {
    if (!databaseReady) return;
    const refresh = async () => {
      try {
        const response = await fetch("/api/marketplace/live", { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json() as { artworks: Array<{ id: string; likes: number; views: number; availability: Artwork["availability"]; stock: number }> };
        const updates = new Map(payload.artworks.map((item) => [item.id, item]));
        setResults((current) => current.map((artwork) => ({ ...artwork, ...(updates.get(artwork.id) ?? {}) })));
      } catch { /* polling is best-effort; database remains the source of truth */ }
    };
    const interval = window.setInterval(refresh, 20_000);
    return () => window.clearInterval(interval);
  }, [databaseReady]);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const registrations = [
      context.registerTool({
        name: "search_artworks",
        title: "Search artworks",
        description: "Search Giggle Gallery by title, artist, style, mood, color, medium or tag without changing the page.",
        inputSchema: { type: "object", properties: { query: { type: "string", minLength: 1 } }, required: ["query"], additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute(input) {
          const queryValue = typeof input === "object" && input && "query" in input ? String((input as { query: unknown }).query).trim().toLowerCase() : "";
          if (!queryValue) throw new Error("A non-empty query is required.");
          const terms = queryValue.split(/\s+/);
          return initialArtworks.filter((artwork) => terms.every((term) => [artwork.title, artwork.artist, artwork.style, artwork.mood, artwork.medium, ...artwork.colors, ...artwork.tags].join(" ").toLowerCase().includes(term))).slice(0, 6).map((artwork) => ({ id: artwork.id, title: artwork.title, artist: artwork.artist, mood: artwork.mood, style: artwork.style, price: artwork.price }));
        },
      }, { signal: lifecycle.signal }),
      context.registerTool({
        name: "save_artwork",
        title: "Save artwork",
        description: "Save one artwork to My Calm Collection and update the visible collection.",
        inputSchema: { type: "object", properties: { artworkId: { type: "string" } }, required: ["artworkId"], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input) {
          const id = typeof input === "object" && input && "artworkId" in input ? String((input as { artworkId: unknown }).artworkId) : "";
          const artwork = initialArtworks.find((item) => item.id === id);
          if (!artwork) throw new Error("Artwork not found.");
          startTransition(async () => { const result = await toggleSaveAction(id); if (result.ok) setSaved((current) => result.active ? [...new Set([...current, id])] : current.filter((item) => item !== id)); });
          return { status: "requested", artworkId: id };
        },
      }, { signal: lifecycle.signal }),
      context.registerTool({
        name: "add_artwork_to_cart",
        title: "Add artwork to cart",
        description: "Add one available artwork to the signed-in user's persistent cart and open the visible cart.",
        inputSchema: { type: "object", properties: { artworkId: { type: "string" } }, required: ["artworkId"], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input) {
          const id = typeof input === "object" && input && "artworkId" in input ? String((input as { artworkId: unknown }).artworkId) : "";
          const artwork = initialArtworks.find((item) => item.id === id);
          if (!artwork) throw new Error("Artwork not found.");
          startTransition(async () => { const result = await setCartQuantity(id, 1); if (result.ok) setCart((current) => current.some((item) => item.artworkId === id) ? current : [...current, { artworkId: id, quantity: 1 }]); });
          setCartOpen(true);
          return { status: "requested", artworkId: id };
        },
      }, { signal: lifecycle.signal }),
    ];
    registrations.forEach((registration) => void Promise.resolve(registration).catch(() => undefined));
    return () => lifecycle.abort();
  }, [initialArtworks]);

  function requireAccount() {
    if (user && databaseReady) return true;
    window.location.href = user ? "/account?setup=database" : "/sign-in";
    return false;
  }
  function runToggle(kind: "like" | "save", id: string) {
    if (!requireAccount()) return;
    const current = kind === "like" ? liked : saved;
    const setter = kind === "like" ? setLiked : setSaved;
    const nextActive = !current.includes(id);
    setter(nextActive ? [...current, id] : current.filter((item) => item !== id));
    startTransition(async () => {
      const result = kind === "like" ? await toggleLikeAction(id) : await toggleSaveAction(id);
      if (!result.ok) { setter(current); toast.error(result.error); }
      else toast(nextActive ? (kind === "like" ? "Artwork liked" : "Artwork saved") : "Removed");
    });
  }
  const toggleLike = (id: string) => runToggle("like", id);
  const toggleSave = (id: string) => runToggle("save", id);
  function addCart(artwork: Artwork) {
    if (!requireAccount()) return;
    if (!cart.some((item) => item.artworkId === artwork.id)) {
      setCart((current) => [...current, { artworkId: artwork.id, quantity: 1 }]);
      startTransition(async () => { const result = await setCartQuantity(artwork.id, 1); if (!result.ok) { setCart((current) => current.filter((item) => item.artworkId !== artwork.id)); toast.error(result.error); } });
      toast.success(`${artwork.title} added to your cart`);
    } else toast("That artwork is already in your cart");
    setCartOpen(true);
  }
  function updateCart(id: string, quantity: number) { const before = cart; setCart((current) => quantity === 0 ? current.filter((item) => item.artworkId !== id) : current.map((item) => item.artworkId === id ? { ...item, quantity } : item)); startTransition(async () => { const result = await setCartQuantity(id, quantity); if (!result.ok) { setCart(before); toast.error(result.error); } }); }
  function clearCart() { const before = cart; setCart([]); startTransition(async () => { const result = await clearCartAction(); if (!result.ok) { setCart(before); toast.error(result.error); } }); }
  const completeDiscoveryStable = useCallback((next: string[]) => {
    setPreferences(next); setPersonalized(true); setMood(next[0]); setStyle(next[3]);
    if (user && databaseReady) startTransition(async () => { const result = await saveTasteProfile(next); if (!result.ok) toast.error(result.error); });
    window.setTimeout(() => document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth" }), 250);
    toast.success("Your personal gallery is ready");
  }, [databaseReady, user]);

  const filtered = results;
  const detailReason = detail ? recommendationReason(detail, preferences) : "";
  const cartItems = cart.map((entry) => ({ artwork: initialArtworks.find((artwork) => artwork.id === entry.artworkId), quantity: entry.quantity })).filter((entry) => entry.artwork) as Array<{ artwork: Artwork; quantity: number }>;
  const savedItems = saved.map((id) => initialArtworks.find((artwork) => artwork.id === id)).filter(Boolean) as Artwork[];
  const activeArtist = artists.find((artist) => artist.id === artistId);

  function showArtist(id: string) { setDetail(null); window.setTimeout(() => setArtistId(id), 180); }
  function focusSearch() { document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth" }); window.setTimeout(() => document.getElementById("art-search")?.focus(), 500); }

  return (
    <main className="min-h-screen overflow-hidden bg-ink text-ivory">
      <Toaster position="top-center" theme="dark" toastOptions={{ style: { background: "#0d1118", color: "#f3efe7", border: "1px solid #ffffff1f" } }} />
      <header className="fixed inset-x-0 top-0 z-40 flex h-20 items-center justify-between border-b border-white/10 bg-ink/65 px-5 backdrop-blur-xl sm:px-10 lg:px-16">
        <a href="#top" className="font-serif text-xl tracking-[-0.04em] sm:text-2xl">GIGGLE <i className="font-light text-cobalt-light">GALLERY</i></a>
        <nav className="hidden items-center gap-7 text-sm text-ivory/60 lg:flex" aria-label="Main navigation">
          <a href="#discover" className="nav-link">Discover</a><a href="#gallery" className="nav-link">Gallery</a><a href="#artists" className="nav-link">Artists</a><a href="#collections" className="nav-link">Collections</a><a href="#for-you" className="nav-link">For You</a>
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <button onClick={focusSearch} aria-label="Search artwork" className="header-icon"><Search size={18} /></button>
          <Link href="/collections" aria-label="Collections" className="header-icon hidden sm:grid"><Heart size={18} />{saved.length > 0 && <span className="count-badge">{saved.length}</span>}</Link>
          <button onClick={() => setCartOpen(true)} aria-label="Open cart" className="header-icon"><ShoppingBag size={18} />{cart.length > 0 && <span className="count-badge">{cart.length}</span>}</button>
          <Link href={user ? "/account" : "/sign-in"} aria-label={user ? "Profile" : "Sign in"} className="header-icon hidden sm:grid"><UserRound size={18} /></Link>
        </div>
      </header>

      <section id="top" className="hero relative isolate h-[100svh] min-h-[680px] overflow-hidden">
        <Image src="/midnight-tide.png" alt="Cobalt waves beneath a luminous moon" fill priority className="object-cover object-[64%_center]" sizes="100vw" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,6,10,.97)_0%,rgba(4,6,10,.56)_45%,rgba(4,6,10,.08)_78%),linear-gradient(0deg,rgba(4,6,10,.82)_0%,transparent_48%)]" />
        <div className="noise absolute inset-0 opacity-20 mix-blend-soft-light" />
        <div className="relative z-10 flex min-h-screen max-w-[1600px] flex-col justify-end px-5 pb-20 pt-32 sm:px-10 sm:pb-20 lg:px-16 lg:pb-14">
          <p className="eyebrow mb-5"><Sparkles size={14} /> AI-powered art discovery</p>
          <h1 className="max-w-5xl font-serif text-[clamp(4rem,11.3vw,11rem)] font-normal leading-[.74] tracking-[-.07em]">Art that<br />feels <i className="font-light text-cobalt-light">like you.</i></h1>
          <div className="mt-9 flex max-w-4xl flex-col justify-between gap-8 border-t border-white/25 pt-6 sm:flex-row sm:items-end">
            <p className="max-w-md text-base leading-relaxed text-ivory/70 sm:text-lg">Discover artwork curated around your mood, personality and visual taste.</p>
            <div className="flex flex-wrap gap-3"><a href="#gallery" className="button-light">Explore gallery <ArrowUpRight size={17} /></a><button onClick={() => setDiscoverOpen(true)} className="button-outline"><Sparkles size={16} /> Find my art</button></div>
          </div>
        </div>
        <a href="#discover" className="absolute bottom-8 right-6 z-10 hidden items-center gap-2 text-xs uppercase tracking-[.15em] text-white/55 lg:flex">Enter the gallery <ArrowDown size={15} /></a>
      </section>

      <section id="discover" className="section-shell grid gap-8 py-24 lg:grid-cols-[.82fr_1.18fr] lg:items-end lg:py-36">
        <div>
          <p className="eyebrow"><span>01</span> Featured artwork</p>
          <h2 className="section-title mt-6">The night,<br /><i>recomposed.</i></h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-white/55">Maya Raman translates the stillness of midnight water into folds of electric blue. A meditation for rooms that need space to breathe.</p>
          <button onClick={() => setDetail(initialArtworks[0])} className="text-link mt-8">Discover “Midnight Tide” <ArrowRight size={16} /></button>
        </div>
        <button onClick={() => setDetail(initialArtworks[0])} className="group relative aspect-[16/10] overflow-hidden text-left"><Image src="/midnight-tide.png" alt="Midnight Tide by Maya Raman" fill sizes="(max-width: 1024px) 100vw, 58vw" className="object-cover transition duration-1000 group-hover:scale-[1.025]" /><span className="absolute bottom-5 right-5 rounded-full bg-ivory px-4 py-2 text-xs font-semibold text-ink">01 / {initialArtworks.length}</span></button>
      </section>

      <section id="for-you" className="border-y border-white/10 bg-ivory text-ink">
        <div className="section-shell grid gap-12 py-24 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:py-32">
          <div><p className="eyebrow !text-cobalt"><Sparkles size={14} /> Personal curation</p><h2 className="section-title mt-6 max-w-3xl">Your taste has<br /><i>a story.</i></h2></div>
          <div><p className="max-w-lg text-lg leading-relaxed text-black/60">Giggle learns from the moods, colors, artists and styles you return to—then explains every recommendation it makes.</p><div className="mt-7 flex flex-wrap gap-2">{["Moods", "Colors", "Styles", "Artists", "Saved works"].map((item) => <span key={item} className="rounded-full border border-black/15 px-4 py-2 text-sm">{item}</span>)}</div><button onClick={() => setDiscoverOpen(true)} className="mt-8 inline-flex items-center gap-3 rounded-full bg-ink px-6 py-4 text-sm font-semibold text-ivory transition hover:bg-cobalt"><Sparkles size={16} /> {personalized ? "Refine my style" : "Discover my style"}</button></div>
        </div>
      </section>

      <section className="relative py-24 lg:py-36" style={{ background: `radial-gradient(circle at 50% 20%, ${moodColors[mood]}33 0%, transparent 48%)` }}>
        <div className="section-shell"><p className="eyebrow">How are you feeling?</p><div className="mt-6 flex flex-col justify-between gap-5 md:flex-row md:items-end"><h2 className="section-title max-w-4xl">What are you<br /><i>feeling today?</i></h2><p className="max-w-sm text-sm leading-relaxed text-white/45">Choose a feeling and watch the gallery shift around you.</p></div>
          <div className="mt-12 grid grid-cols-2 border-l border-t border-white/10 sm:grid-cols-4">{moods.map((item) => <button key={item} onClick={() => { setMood(item); document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth" }); }} className={`mood-cell ${mood === item ? "is-active" : ""}`}><span className="text-3xl" aria-hidden="true">{moodSymbols[item]}</span><span className="font-serif text-2xl sm:text-3xl">{item}</span><ArrowUpRight size={16} className="ml-auto opacity-30" /></button>)}</div>
        </div>
      </section>

      <section id="gallery" className="border-t border-white/10 bg-[#080b10] py-24 lg:py-32">
        <div className="section-shell"><div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end"><div><p className="eyebrow">Curated for you</p><h2 className="section-title mt-5">{personalized ? "Your gallery." : "Found something you might obsess over."}</h2></div><p className="max-w-md text-sm leading-relaxed text-white/45">{personalized ? `Built around ${preferences.slice(0, 4).join(", ").toLowerCase()}. Each recommendation has a reason.` : "Trending works, tuned to your current mood and visual energy."}</p></div>
          <div className="mt-10 flex flex-col gap-3 border-y border-white/10 py-5 lg:flex-row lg:items-center">
            <label className="flex min-w-0 flex-1 items-center gap-3 rounded-full border border-white/12 px-5 py-3 focus-within:border-cobalt-light"><Search size={17} className="text-white/35" /><input id="art-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by feeling, color, artist or style" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/30" /></label>
            <div className="flex flex-wrap gap-2"><Select value={mood} onValueChange={setMood}><SelectTrigger aria-label="Mood" className="h-11 rounded-full border-white/12 px-4"><SelectValue /></SelectTrigger><SelectContent>{["All moods", ...moods].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select><Select value={style} onValueChange={setStyle}><SelectTrigger aria-label="Style" className="h-11 rounded-full border-white/12 px-4"><SelectValue /></SelectTrigger><SelectContent>{["All styles", ...styles].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select><Select value={category} onValueChange={setCategory}><SelectTrigger aria-label="Category" className="h-11 rounded-full border-white/12 px-4"><SelectValue /></SelectTrigger><SelectContent>{["All categories", ...new Set(initialArtworks.map((item) => item.category).filter(Boolean))].map((item) => <SelectItem key={item} value={item!}>{item}</SelectItem>)}</SelectContent></Select><Select value={availability} onValueChange={setAvailability}><SelectTrigger aria-label="Availability" className="h-11 rounded-full border-white/12 px-4"><SelectValue /></SelectTrigger><SelectContent>{["All availability", "AVAILABLE", "RESERVED", "SOLD_OUT"].map((item) => <SelectItem key={item} value={item}>{item.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select><Select value={sort} onValueChange={setSort}><SelectTrigger aria-label="Sort artwork" className="h-11 rounded-full border-white/12 px-4"><SelectValue /></SelectTrigger><SelectContent>{["Recommended", "Trending", "Newest", "Popular", "Price low", "Price high"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
          </div>
          {viewer.recentSearches.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/40"><span>Recent</span>{viewer.recentSearches.map((item) => <button key={item} onClick={() => setQuery(item)} className="rounded-full border border-white/10 px-3 py-1.5 hover:border-white/30 hover:text-white">{item}</button>)}</div>}
          <details className="border-b border-white/10 py-4"><summary className="cursor-pointer text-sm text-white/55 hover:text-white">More filters: medium, artist, year, price</summary><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Select value={medium} onValueChange={setMedium}><SelectTrigger aria-label="Medium" className="h-11 border-white/12"><SelectValue /></SelectTrigger><SelectContent>{["All media", ...new Set(initialArtworks.map((item) => item.medium))].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select><Select value={artistFilter} onValueChange={setArtistFilter}><SelectTrigger aria-label="Artist" className="h-11 border-white/12"><SelectValue /></SelectTrigger><SelectContent>{["All artists", ...new Set(initialArtworks.map((item) => item.artist))].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select><Select value={year} onValueChange={setYear}><SelectTrigger aria-label="Year" className="h-11 border-white/12"><SelectValue /></SelectTrigger><SelectContent>{["All years", ...new Set(initialArtworks.map((item) => String(item.year)))].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select><label className="flex items-center gap-3 border border-white/12 px-4"><span className="text-sm text-white/45">Under ₹</span><input value={maxPrice} onChange={(event) => setMaxPrice(event.target.value.replace(/\D/g, ""))} inputMode="numeric" aria-label="Maximum price" placeholder="Any" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label></div></details>
          <p className="mt-4 min-h-5 text-sm text-white/45" aria-live="polite">{searching ? "Searching the gallery…" : searchError || `${filtered.length} ${filtered.length === 1 ? "artwork" : "artworks"}`}</p>
          {filtered.length ? <div className="mt-6 grid gap-x-5 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((artwork, index) => <ArtworkCard key={artwork.id} artwork={artwork} liked={liked.includes(artwork.id)} saved={saved.includes(artwork.id)} reason={personalized && index < 3 ? recommendationReason(artwork, preferences) : undefined} onLike={toggleLike} onSave={toggleSave} onView={(item) => { setDetail(item); if (user && databaseReady) startTransition(() => void recordArtworkView(item.id)); }} onCart={addCart} priority={index < 3} />)}</div> : <div className="grid min-h-[340px] place-items-center text-center"><div><Search size={34} className="mx-auto text-white/20" /><h3 className="mt-5 font-serif text-4xl">We couldn’t find that feeling.</h3><p className="mt-2 text-white/40">Try a broader color, mood or style.</p><button onClick={() => { setQuery(""); setMood("All moods"); setStyle("All styles"); setCategory("All categories"); setAvailability("All availability"); setMedium("All media"); setArtistFilter("All artists"); setYear("All years"); setMaxPrice(""); }} className="mt-6 rounded-full border border-white/20 px-5 py-3 text-sm">Clear filters</button></div></div>}
        </div>
      </section>

      <section id="artists" className="py-24 lg:py-36"><div className="section-shell"><p className="eyebrow">The people behind the work</p><h2 className="section-title mt-6">Meet the minds<br /><i>behind the art.</i></h2><div className="mt-12 grid gap-5 md:grid-cols-3">{artists.map((artist, index) => <button key={artist.id} onClick={() => setArtistId(artist.id)} className="artist-card group relative aspect-[3/4] overflow-hidden text-left"><Image src={artist.image} alt={`Work by ${artist.name}`} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition duration-700 group-hover:scale-105" style={{ objectPosition: index === 0 ? "65% center" : "center" }} /><div className="absolute inset-0 bg-gradient-to-t from-black via-black/5 to-transparent" /><div className="absolute inset-x-0 bottom-0 p-6"><p className="text-xs uppercase tracking-[.13em] text-white/50">{artist.location} · {artist.discipline}</p><h3 className="mt-2 font-serif text-4xl tracking-[-.04em]">{artist.name}</h3><div className="mt-4 flex justify-between text-xs text-white/55"><span>{artist.followers} followers</span><span>{artist.works} works</span></div></div></button>)}</div></div></section>

      <section id="profile" className="border-y border-white/10 bg-[#0b0f16] py-24 lg:py-32"><div className="section-shell grid gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-center"><div><p className="eyebrow">Your art personality</p><h2 className="section-title mt-6"><i>{personalized ? "Dreamy Minimalist" : "Quiet Futurist"}</i></h2><p className="mt-6 max-w-md text-base leading-relaxed text-white/50">Your taste is getting interesting. These signals update as you explore, save and follow.</p><button onClick={() => setDiscoverOpen(true)} className="text-link mt-7">Tune my profile <ArrowRight size={16} /></button></div><div className="taste-panel"><div className="mb-8 flex items-end justify-between"><span className="text-xs uppercase tracking-[.15em] text-white/40">Taste confidence</span><span className="font-serif text-5xl">78%</span></div>{[[preferences[3] || "Minimal", 72], [preferences[0] || "Dreamy", 64], [preferences[1] || "Abstract", 58], [preferences[2] || "Nature", 43]].map(([label, value]) => <div key={String(label)} className="mb-5"><div className="mb-2 flex justify-between text-sm"><span>{label}</span><span className="text-white/35">{value}%</span></div><div className="h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-cobalt-light" style={{ width: `${value}%` }} /></div></div>)}</div></div></section>

      <section id="collections" className="py-24 lg:py-32"><div className="section-shell"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="eyebrow">Your little museum</p><h2 className="section-title mt-6">My Calm Collection.</h2></div><span className="text-sm text-white/40">{savedItems.length} saved {savedItems.length === 1 ? "work" : "works"}</span></div>{savedItems.length ? <div className="mt-10 flex snap-x gap-4 overflow-x-auto pb-4">{savedItems.map((artwork) => <button key={artwork.id} onClick={() => setDetail(artwork)} className="group min-w-[76vw] snap-start text-left sm:min-w-[340px]"><div className="relative aspect-[4/3] overflow-hidden"><Image src={artwork.image} alt={artwork.title} fill sizes="(max-width: 640px) 76vw, 340px" className="object-cover transition duration-500 group-hover:scale-105" style={{ objectPosition: artwork.imagePosition ?? "center" }} /></div><p className="mt-3 font-serif text-2xl">{artwork.title}</p><p className="mt-1 text-xs text-white/45">{artwork.artist}</p></button>)}</div> : <div className="mt-10 grid min-h-[260px] place-items-center border border-white/10 bg-white/[.02] text-center"><div><Heart className="mx-auto text-white/20" size={32} /><h3 className="mt-5 font-serif text-3xl">Your wall is still waiting.</h3><p className="mt-2 text-sm text-white/40">Save artwork to build your first little museum.</p><a href="#gallery" className="mt-6 inline-flex rounded-full border border-white/20 px-5 py-3 text-sm">Explore artwork</a></div></div>}</div></section>

      <section className="relative isolate overflow-hidden border-t border-white/10 py-32 lg:py-48"><Image src="/blue-thread.png" alt="The Blue Thread artwork" fill sizes="100vw" className="-z-20 object-cover object-[50%_38%] opacity-35" /><div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,7,11,.96),rgba(5,7,11,.46),rgba(5,7,11,.9))]" /><div className="section-shell"><p className="eyebrow"><Sparkles size={14} /> Your next favorite</p><h2 className="section-title mt-7 max-w-5xl">Something beautiful<br /><i>is waiting.</i></h2><div className="mt-9 flex flex-wrap gap-3"><button onClick={() => setDiscoverOpen(true)} className="button-light">Find my art <Sparkles size={16} /></button><a href="#gallery" className="button-outline">Explore the gallery <ArrowRight size={16} /></a></div></div></section>

      <footer className="border-t border-white/10 px-5 pb-28 pt-14 sm:px-10 sm:pb-16 lg:px-16"><div className="mx-auto flex max-w-[1600px] flex-col justify-between gap-10 sm:flex-row"><div><p className="font-serif text-3xl">GIGGLE <i className="text-cobalt-light">GALLERY</i></p><p className="mt-3 text-sm text-white/40">Art that feels like you.</p></div><div className="grid grid-cols-2 gap-x-14 gap-y-3 text-sm text-white/50"><a href="#gallery">Gallery</a><a href="#artists">Artists</a><a href="#collections">Collections</a><a href="#profile">Taste profile</a><button onClick={() => setDiscoverOpen(true)} className="text-left">Find my art</button><button onClick={focusSearch} className="text-left">Search</button></div></div><div className="mx-auto mt-14 flex max-w-[1600px] justify-between border-t border-white/10 pt-5 text-xs text-white/25"><span>© 2026 Giggle Gallery</span><span>Curated with feeling.</span></div></footer>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/10 bg-ink/90 px-2 py-2 backdrop-blur-xl sm:hidden" aria-label="Mobile navigation"><a href="#top" className="mobile-nav"><Home size={19} /><span>Home</span></a><button onClick={() => setDiscoverOpen(true)} className="mobile-nav"><Sparkles size={19} /><span>Discover</span></button><Link href="/collections" className="mobile-nav"><Heart size={19} /><span>Collections</span></Link><button onClick={() => setCartOpen(true)} className="mobile-nav"><ShoppingBag size={19} /><span>Cart</span></button><Link href={user ? "/account" : "/sign-in"} className="mobile-nav"><UserRound size={19} /><span>Profile</span></Link></nav>

      <DiscoveryDialog open={discoverOpen} onOpenChange={setDiscoverOpen} onComplete={completeDiscoveryStable} />
      <ArtworkDetail artwork={detail} liked={detail ? liked.includes(detail.id) : false} saved={detail ? saved.includes(detail.id) : false} reason={detailReason} onClose={() => setDetail(null)} onLike={() => detail && toggleLike(detail.id)} onSave={() => detail && toggleSave(detail.id)} onCart={() => detail && addCart(detail)} onArtist={showArtist} />
      <ArtistDialog artist={activeArtist ?? null} followed={activeArtist ? followed.includes(activeArtist.id) : false} works={initialArtworks.filter((artwork) => artwork.artistId === artistId)} onClose={() => setArtistId(null)} onFollow={() => { if (!activeArtist || !requireAccount()) return; const wasFollowing = followed.includes(activeArtist.id); setFollowed(wasFollowing ? followed.filter((id) => id !== activeArtist.id) : [...followed, activeArtist.id]); startTransition(async () => { const result = await toggleFollowAction(activeArtist.id); if (!result.ok) { setFollowed(followed); toast.error(result.error); } }); }} onArtwork={(artwork) => { setArtistId(null); window.setTimeout(() => setDetail(artwork), 180); }} />
      <CommerceSheet open={cartOpen} onOpenChange={setCartOpen} items={cartItems} onQuantity={updateCart} onClear={clearCart} />
      <GiggleAssistant artworks={initialArtworks} onView={setDetail} />
    </main>
  );
}
