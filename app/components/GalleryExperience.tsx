"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Grid,
  Heart,
  LayoutGrid,
  Layers,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  clearCart as clearCartAction,
  recordArtworkView,
  saveTasteProfile,
  setCartQuantity,
  toggleFollow as toggleFollowAction,
  toggleLike as toggleLikeAction,
  toggleSave as toggleSaveAction,
} from "@/app/actions/marketplace";
import type { ArtistSummary, CartItemDetail, ViewerState } from "@/lib/marketplace-data";
import { ArtworkCard } from "./ArtworkCard";
import { ArtworkDetail } from "./ArtworkDetail";
import { ArtistDialog } from "./ArtistDialog";
import { CommerceSheet } from "./CommerceSheet";
import { DiscoveryDialog } from "./DiscoveryDialog";
import { GiggleAssistant } from "./GiggleAssistant";
import { Artwork, moods, recommendationReason, styles } from "../data";
import { useDisplaySettings } from "@/lib/display-settings";
import { CommandSearch } from "@/components/CommandSearch";

const moodColors: Record<string, string> = {
  Joyful: "#c15b48",
  Calm: "#2757ff",
  Energetic: "#a83b31",
  Mysterious: "#5b45a9",
  Dreamy: "#446f98",
  Dark: "#202636",
  Peaceful: "#1f6d66",
  Bold: "#b27932",
};

const moodSymbols: Record<string, string> = {
  Joyful: "◉",
  Calm: "≈",
  Energetic: "↯",
  Mysterious: "◐",
  Dreamy: "✦",
  Dark: "●",
  Peaceful: "⌁",
  Bold: "▲",
};

function artworkToCartDetail(artwork: Artwork): CartItemDetail {
  return {
    artworkId: artwork.id,
    quantity: 1,
    title: artwork.title,
    artist: artwork.artist,
    price: artwork.price,
    image: artwork.image,
    type: artwork.type ?? "PHYSICAL",
    stock: artwork.stock ?? 1,
    availability: artwork.availability ?? "AVAILABLE",
    status: "PUBLISHED",
    isAvailable: artwork.availability === "AVAILABLE" && (artwork.stock ?? 1) >= 1,
    unavailableReason: artwork.availability !== "AVAILABLE" ? "Artwork is sold out." : undefined,
  };
}

type Props = {
  initialArtworks: Artwork[];
  artists: ArtistSummary[];
  viewer: ViewerState;
  user: { name?: string | null; email?: string | null } | null;
  databaseReady: boolean;
  initialFilters: Record<string, string | undefined>;
  featuredAuctions: Array<{
    id: string;
    title: string;
    status: string;
    end: string;
    currentBidPaise: string;
  }>;
};

export function GalleryExperience({
  initialArtworks,
  artists,
  viewer,
  user,
  databaseReady,
  initialFilters,
  featuredAuctions,
}: Props) {
  const router = useRouter();
  const { settings } = useDisplaySettings();

  const [liked, setLiked] = useState<string[]>(viewer.likedIds);
  const [saved, setSaved] = useState<string[]>(viewer.savedIds);
  const [cart, setCart] = useState(viewer.cart);
  const [followed, setFollowed] = useState<string[]>(viewer.followedArtistIds);
  const [preferences, setPreferences] = useState<string[]>(viewer.preferences);

  // Filter States
  const [mood, setMood] = useState(initialFilters.mood ?? "All moods");
  const [style, setStyle] = useState(initialFilters.style ?? "All styles");
  const [category, setCategory] = useState(initialFilters.category ?? "All categories");
  const [availability, setAvailability] = useState(initialFilters.availability ?? "All availability");
  const [medium, setMedium] = useState(initialFilters.medium ?? "All media");
  const [format, setFormat] = useState(initialFilters.type ?? "All formats");
  const [color, setColor] = useState(initialFilters.color ?? "All colors");
  const [artistFilter, setArtistFilter] = useState(initialFilters.artist ?? "All artists");
  const [year, setYear] = useState(initialFilters.year ?? "All years");
  const [maxPrice, setMaxPrice] = useState(initialFilters.maxPrice ?? "");
  const [query, setQuery] = useState(initialFilters.q ?? "");
  const [sort, setSort] = useState(initialFilters.sort ?? "Recommended");

  // View Layout Modes: 'editorial' | 'compact' | 'masonry'
  const [viewMode, setViewMode] = useState<"editorial" | "compact" | "masonry">("editorial");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Hero Carousel State (using real published works)
  const heroArtworks = initialArtworks.slice(0, 3);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);

  const [results, setResults] = useState(initialArtworks);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [detail, setDetail] = useState<Artwork | null>(null);
  const [artistId, setArtistId] = useState<string | null>(null);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [commandSearchOpen, setCommandSearchOpen] = useState(false);
  const [personalized, setPersonalized] = useState(viewer.preferences.length > 0);
  const [, startTransition] = useTransition();

  // Auto-rotate hero artwork slowly every 8 seconds if not reduced motion
  useEffect(() => {
    if (settings.motion === "reduced" || settings.accessibility.reducedMotion) return;
    if (heroArtworks.length <= 1) return;
    const timer = setInterval(() => {
      setActiveHeroIndex((prev) => (prev + 1) % heroArtworks.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [heroArtworks.length, settings.motion, settings.accessibility.reducedMotion]);

  // Sync URL Params
  useEffect(() => {
    const params = new URLSearchParams();
    const values = {
      q: query,
      mood,
      style,
      category,
      availability,
      medium,
      artist: artistFilter,
      year,
      maxPrice,
      type: format,
      color,
      sort,
    };
    Object.entries(values).forEach(([key, value]) => {
      if (value && !value.startsWith("All ") && value !== "Recommended") params.set(key, value);
    });
    const next = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${next ? `?${next}` : ""}${window.location.hash}`
    );
  }, [
    query,
    mood,
    style,
    category,
    availability,
    medium,
    artistFilter,
    year,
    maxPrice,
    format,
    color,
    sort,
  ]);

  // Debounced API search
  useEffect(() => {
    const lifecycle = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchError("");
      const params = new URLSearchParams({
        q: query,
        mood,
        style,
        category,
        availability,
        medium,
        artist: artistFilter,
        year: year === "All years" ? "" : year,
        maxPrice,
        type: format === "All formats" ? "" : format,
        color: color === "All colors" ? "" : color,
        sort,
      });
      try {
        const response = await fetch(`/api/artworks?${params}`, { signal: lifecycle.signal });
        if (!response.ok) throw new Error("Search failed");
        const payload = (await response.json()) as { results: Artwork[] };
        setResults(payload.results);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setSearchError("The gallery search is unavailable. Try again in a moment.");
        }
      } finally {
        if (!lifecycle.signal.aborted) setSearching(false);
      }
    }, 320);
    return () => {
      lifecycle.abort();
      window.clearTimeout(timer);
    };
  }, [
    query,
    mood,
    style,
    category,
    availability,
    medium,
    artistFilter,
    year,
    maxPrice,
    format,
    color,
    sort,
  ]);

  // Live polling for likes / availability updates
  useEffect(() => {
    if (!databaseReady) return;
    const refresh = async () => {
      if (document.hidden) return;
      try {
        const response = await fetch("/api/marketplace/live", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          artworks: Array<{
            id: string;
            likes: number;
            views: number;
            availability: Artwork["availability"];
            stock: number;
          }>;
        };
        const updates = new Map(payload.artworks.map((item) => [item.id, item]));
        setResults((current) =>
          current.map((artwork) => ({ ...artwork, ...(updates.get(artwork.id) ?? {}) }))
        );
      } catch {
        // best effort polling
      }
    };
    const interval = window.setInterval(refresh, 20_000);
    return () => window.clearInterval(interval);
  }, [databaseReady]);

  function requireAccount() {
    if (user && databaseReady) return true;
    router.push(user ? "/account?setup=database" : "/sign-in");
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
      if (!result.ok) {
        setter(current);
        toast.error(result.error);
      } else {
        setResults((rows) =>
          rows.map((artwork) =>
            artwork.id === id && kind === "like"
              ? { ...artwork, likes: Math.max(0, artwork.likes + (nextActive ? 1 : -1)) }
              : artwork
          )
        );
        toast(nextActive ? (kind === "like" ? "Added to wishlist" : "Saved to collection") : "Removed");
      }
    });
  }

  const toggleLike = (id: string) => runToggle("like", id);
  const toggleSave = (id: string) => runToggle("save", id);

  function addCart(artwork: Artwork) {
    if (!requireAccount()) return;
    if (!cart.some((item) => item.artworkId === artwork.id)) {
      setCart((current) => [...current, artworkToCartDetail(artwork)]);
      startTransition(async () => {
        const result = await setCartQuantity(artwork.id, 1);
        if (!result.ok) {
          setCart((current) => current.filter((item) => item.artworkId !== artwork.id));
          toast.error(result.error);
        }
      });
      toast.success(`${artwork.title} added to your cart`);
    } else {
      toast("That artwork is already in your cart");
    }
    setCartOpen(true);
  }

  function updateCart(id: string, quantity: number) {
    const before = cart;
    setCart((current) =>
      quantity === 0
        ? current.filter((item) => item.artworkId !== id)
        : current.map((item) => (item.artworkId === id ? { ...item, quantity } : item))
    );
    startTransition(async () => {
      const result = await setCartQuantity(id, quantity);
      if (!result.ok) {
        setCart(before);
        toast.error(result.error);
      }
    });
  }

  function clearCart() {
    const before = cart;
    setCart([]);
    startTransition(async () => {
      const result = await clearCartAction();
      if (!result.ok) {
        setCart(before);
        toast.error(result.error);
      }
    });
  }

  const completeDiscoveryStable = useCallback(
    (next: string[]) => {
      setPreferences(next);
      setPersonalized(true);
      setMood(next[0]);
      setStyle(next[3]);
      if (user && databaseReady) {
        startTransition(async () => {
          const result = await saveTasteProfile(next);
          if (!result.ok) toast.error(result.error);
        });
      }
      window.setTimeout(
        () => document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth" }),
        250
      );
      toast.success("Your personal curatorial collection is ready");
    },
    [databaseReady, user, startTransition]
  );

  const cartItems = cart.map((entry) => {
    const catalogMatch = initialArtworks.find((artwork) => artwork.id === entry.artworkId);
    const stock = catalogMatch?.stock ?? entry.stock ?? 1;
    return {
      artworkId: entry.artworkId,
      title: catalogMatch?.title ?? entry.title ?? "Artwork",
      artist: catalogMatch?.artist ?? entry.artist ?? "Artist",
      price: catalogMatch?.price ?? entry.price ?? 0,
      image: catalogMatch?.image ?? entry.image ?? "/midnight-tide.png",
      type: (catalogMatch?.type ?? entry.type ?? "PHYSICAL") as "DIGITAL" | "PHYSICAL",
      stock,
      quantity: entry.quantity,
      isAvailable:
        entry.isAvailable ??
        (catalogMatch ? catalogMatch.availability === "AVAILABLE" && stock >= entry.quantity : false),
      unavailableReason:
        entry.unavailableReason ??
        (catalogMatch
          ? catalogMatch.availability !== "AVAILABLE"
            ? "Artwork is sold out."
            : undefined
          : "This artwork is no longer listed in the gallery."),
    };
  });

  const savedItems = saved
    .map((id) => initialArtworks.find((artwork) => artwork.id === id))
    .filter(Boolean) as Artwork[];

  const activeArtist = artists.find((artist) => artist.id === artistId);
  const currentHeroArtwork = heroArtworks[activeHeroIndex] ?? heroArtworks[0];

  function showArtist(id: string) {
    setDetail(null);
    window.setTimeout(() => setArtistId(id), 180);
  }

  // Clear all filters
  const resetFilters = () => {
    setQuery("");
    setMood("All moods");
    setStyle("All styles");
    setCategory("All categories");
    setAvailability("All availability");
    setMedium("All media");
    setFormat("All formats");
    setColor("All colors");
    setArtistFilter("All artists");
    setYear("All years");
    setMaxPrice("");
    setSort("Recommended");
  };

  const hasActiveFilters =
    mood !== "All moods" ||
    style !== "All styles" ||
    category !== "All categories" ||
    availability !== "All availability" ||
    medium !== "All media" ||
    format !== "All formats" ||
    color !== "All colors" ||
    artistFilter !== "All artists" ||
    year !== "All years" ||
    maxPrice !== "" ||
    query !== "";

  // Grid layout class based on viewMode
  const gridLayoutClass =
    viewMode === "compact"
      ? "grid gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      : viewMode === "masonry"
      ? "columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6"
      : "grid gap-6 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <main className="min-h-screen text-text-primary selection:bg-accent selection:text-white">
      {/* 1. CINEMATIC ROTATING HERO (Phase 6 Requirement) */}
      <section id="top" className="hero relative isolate min-h-[92vh] sm:min-h-[100svh] overflow-hidden flex flex-col justify-end">
        {/* Real Published Works Carousel Background with smooth crossfade */}
        {heroArtworks.map((art, idx) => (
          <div
            key={art.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === activeHeroIndex ? "opacity-100 z-0" : "opacity-0 -z-10"
            }`}
          >
            <Image
              src={art.image}
              alt={art.title}
              fill
              priority={idx === 0}
              className="object-cover object-[62%_center] transition-transform duration-10000 ease-out scale-105"
              sizes="100vw"
            />
            {/* Museum luxury gradient masks */}
            <div className="absolute inset-0 bg-gradient-to-r from-bg-primary via-bg-primary/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/40 to-black/20" />
            <div className="noise absolute inset-0 opacity-20 mix-blend-soft-light" />
          </div>
        ))}

        {/* Hero Content Shell */}
        <div className="relative z-10 mx-auto w-full max-w-[1600px] px-5 pb-20 pt-32 sm:px-10 lg:px-16">
          {/* Eyebrow badge */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="eyebrow">
              <Sparkles size={14} /> Curated Digital Art Space
            </span>
            <span className="text-xs text-text-secondary/60 hidden sm:inline">•</span>
            <span className="text-xs uppercase tracking-wider text-text-secondary">
              Featured: {currentHeroArtwork.title} by {currentHeroArtwork.artist}
            </span>
          </div>

          {/* Primary Statement */}
          <h1 className="max-w-5xl font-serif text-[clamp(3.8rem,10.5vw,10.5rem)] font-light leading-[0.82] tracking-[-0.045em] text-text-primary">
            Art that<br />feels <i className="italic text-accent-secondary">like you.</i>
          </h1>

          {/* Subheading & Actions */}
          <div className="mt-10 flex max-w-4xl flex-col justify-between gap-8 border-t border-border pt-6 sm:flex-row sm:items-end">
            <p className="max-w-md text-base leading-relaxed text-text-secondary sm:text-lg">
              Explore authenticated original creations and live auction lots, curated to align with your personal mood and visual architecture.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <a href="#gallery" className="button-light">
                Explore Gallery <ArrowUpRight size={17} />
              </a>
              <button onClick={() => setDiscoverOpen(true)} className="button-outline">
                <Sparkles size={16} /> Find My Art
              </button>
            </div>
          </div>

          {/* Rotating Real Artwork Slide Selectors */}
          <div className="mt-8 flex items-center gap-3">
            {heroArtworks.map((art, idx) => (
              <button
                key={art.id}
                onClick={() => setActiveHeroIndex(idx)}
                className={`group flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-all ${
                  idx === activeHeroIndex
                    ? "border-accent-secondary bg-surface-elevated text-text-primary shadow-md"
                    : "border-border/60 bg-surface/40 text-text-secondary hover:border-text-primary hover:text-text-primary"
                }`}
              >
                <span className="size-1.5 rounded-full bg-accent-secondary" />
                <span className="font-serif">{art.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Scroll Indicator */}
        <a
          href="#discover"
          className="absolute bottom-8 right-8 z-10 hidden items-center gap-2 text-xs uppercase tracking-[0.18em] text-text-secondary hover:text-text-primary transition lg:flex"
        >
          Enter the Gallery <ArrowDown size={14} />
        </a>
      </section>

      {/* 2. LIVE AUCTIONS STRIP (Phase 6: Live Now) */}
      {featuredAuctions.length > 0 && (
        <section className="border-y border-border bg-surface-elevated/40 py-10 backdrop-blur-md">
          <div className="section-shell">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="size-2 rounded-full bg-accent animate-ping" />
                <p className="font-serif text-2xl text-text-primary">Live Now in the Auction Room</p>
              </div>
              <Link href="/auctions" className="text-link text-xs">
                View all live lots <ArrowRight size={14} />
              </Link>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featuredAuctions.map((auc) => (
                <Link
                  key={auc.id}
                  href={`/auctions/${auc.id}`}
                  className="rounded-xl border border-border bg-surface p-5 transition hover:border-accent-secondary"
                >
                  <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[10px] font-semibold text-accent-secondary uppercase tracking-wider">
                    {auc.status}
                  </span>
                  <p className="font-serif text-xl mt-3 text-text-primary line-clamp-1">{auc.title}</p>
                  <p className="mt-2 text-xs text-text-secondary">
                    Current Bid: <strong className="text-text-primary">₹{(Number(auc.currentBidPaise) / 100).toLocaleString("en-IN")}</strong>
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 3. EDITORIAL STRIP: Visual Storytelling (Phase 6) */}
      <section className="section-shell py-24 border-b border-border">
        <p className="eyebrow">
          <span>01</span> Curatorial Perspective
        </p>
        <div className="mt-6 grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <h2 className="section-title">
              The Night,<br /><i>recomposed.</i>
            </h2>
            <p className="mt-6 text-base leading-relaxed text-text-secondary max-w-lg">
              Maya Raman translates the quietude of midnight waters into layered folds of deep cobalt pigment. Archival pigment on Hahnemühle cotton paper, created for environments that require intentional stillness.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <button
                onClick={() => setDetail(initialArtworks[0])}
                className="button-light text-xs"
              >
                Inspect “Midnight Tide” <ArrowRight size={15} />
              </button>
              <button
                onClick={() => showArtist(initialArtworks[0].artistId)}
                className="button-outline text-xs"
              >
                Artist Profile
              </button>
            </div>
          </div>

          <div
            onClick={() => setDetail(initialArtworks[0])}
            className="group relative aspect-[16/10] overflow-hidden rounded-2xl border border-border bg-surface cursor-pointer shadow-2xl"
          >
            <Image
              src={initialArtworks[0].image}
              alt="Midnight Tide"
              fill
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover transition duration-700 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition" />
            <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between text-xs text-white">
              <span>Maya Raman · Chennai</span>
              <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur-md">
                Catalogue Lot 01
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. DISCOVER BY MOOD & FEELING (Interactive Grid) */}
      <section
        id="discover"
        className="relative py-24 transition-colors duration-700"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${moodColors[mood] || "#2757ff"}22 0%, transparent 60%)`,
        }}
      >
        <div className="section-shell">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">Sensory Exploration</p>
              <h2 className="section-title mt-4">
                What are you<br /><i>feeling today?</i>
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-text-secondary">
              Select an emotional tone to shift the gallery&apos;s ambient palette and curatorial sequence around you.
            </p>
          </div>

          {/* Mood Matrix Cells */}
          <div className="mt-12 grid grid-cols-2 border-l border-t border-border sm:grid-cols-4 rounded-xl overflow-hidden shadow-xl bg-surface/30">
            {moods.map((item) => {
              const isActive = mood === item;
              return (
                <button
                  key={item}
                  onClick={() => {
                    setMood(item);
                    document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className={`mood-cell ${isActive ? "is-active bg-surface-elevated" : ""}`}
                >
                  <span className="text-3xl text-accent-secondary" aria-hidden="true">
                    {moodSymbols[item]}
                  </span>
                  <div>
                    <span className="font-serif text-2xl sm:text-3xl block text-text-primary">
                      {item}
                    </span>
                    <span className="text-[11px] text-text-secondary mt-1 block">
                      Tune palette
                    </span>
                  </div>
                  <ArrowUpRight
                    size={16}
                    className={`ml-auto transition ${
                      isActive ? "text-accent-secondary opacity-100" : "opacity-30"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. IMMERSIVE GALLERY BROWSING (Phase 7 Requirement) */}
      <section id="gallery" className="border-t border-border py-24">
        <div className="section-shell">
          {/* Gallery Header & Density / View Controls */}
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end border-b border-border pb-8">
            <div>
              <p className="eyebrow">Curated Catalogue</p>
              <h2 className="section-title mt-3">
                {personalized ? "Your Curated Gallery." : "The Permanent Collection."}
              </h2>
              <p className="mt-3 text-sm text-text-secondary max-w-lg">
                {personalized
                  ? `Selected around your taste for ${preferences.slice(0, 3).join(", ").toLowerCase()}.`
                  : "Originals, limited editions, and generative works verified by Giggle Gallery."}
              </p>
            </div>

            {/* View Modes & Filter Drawer Toggle */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Density / View Mode Switcher */}
              <div className="flex rounded-full border border-border bg-surface p-1">
                <button
                  onClick={() => setViewMode("editorial")}
                  aria-label="Editorial grid view"
                  className={`rounded-full p-2 transition ${
                    viewMode === "editorial"
                      ? "bg-text-primary text-bg-primary shadow"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <Grid size={16} />
                </button>
                <button
                  onClick={() => setViewMode("compact")}
                  aria-label="Compact grid view"
                  className={`rounded-full p-2 transition ${
                    viewMode === "compact"
                      ? "bg-text-primary text-bg-primary shadow"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  onClick={() => setViewMode("masonry")}
                  aria-label="Masonry exhibition view"
                  className={`rounded-full p-2 transition ${
                    viewMode === "masonry"
                      ? "bg-text-primary text-bg-primary shadow"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <Layers size={16} />
                </button>
              </div>

              {/* Filter Drawer Toggle */}
              <button
                onClick={() => setFilterDrawerOpen(!filterDrawerOpen)}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                  filterDrawerOpen || hasActiveFilters
                    ? "border-accent-secondary bg-surface-elevated text-text-primary"
                    : "border-border bg-surface text-text-secondary hover:text-text-primary"
                }`}
              >
                <SlidersHorizontal size={14} />
                <span>Filters {hasActiveFilters ? "(Active)" : ""}</span>
              </button>
            </div>
          </div>

          {/* Quick Filter Search & Primary Selectors */}
          <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* Search Input */}
            <label className="flex min-w-0 flex-1 items-center gap-3 rounded-full border border-border bg-surface px-5 py-2.5 text-sm transition focus-within:border-accent-secondary">
              <Search size={16} className="text-text-secondary" />
              <input
                id="art-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search artworks, colors, styles, or feeling..."
                className="min-w-0 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-secondary/50 outline-none"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="text-text-secondary hover:text-text-primary"
                >
                  <X size={14} />
                </button>
              )}
            </label>

            {/* Quick Primary Filters */}
            <div className="flex flex-wrap gap-2">
              <Select value={mood} onValueChange={setMood}>
                <SelectTrigger aria-label="Mood" className="h-10 rounded-full border-border bg-surface px-4 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["All moods", ...moods].map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger aria-label="Style" className="h-10 rounded-full border-border bg-surface px-4 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["All styles", ...styles].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger aria-label="Sort" className="h-10 rounded-full border-border bg-surface px-4 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Recommended", "Trending", "Newest", "Popular", "Price low", "Price high"].map(
                    (s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Animated Expandable Filter Drawer (Phase 7) */}
          {filterDrawerOpen && (
            <div className="mt-4 rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-5 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="font-serif text-lg text-text-primary">Advanced Catalog Filters</span>
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="text-xs text-accent-secondary hover:underline"
                  >
                    Reset all filters
                  </button>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                {/* Medium */}
                <div>
                  <label className="mb-1.5 block font-semibold text-text-secondary">Medium</label>
                  <Select value={medium} onValueChange={setMedium}>
                    <SelectTrigger className="h-9 border-border bg-surface-elevated">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["All media", ...new Set(initialArtworks.map((item) => item.medium))].map(
                        (med) => (
                          <SelectItem key={med} value={med}>
                            {med}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Format */}
                <div>
                  <label className="mb-1.5 block font-semibold text-text-secondary">Format</label>
                  <Select value={format} onValueChange={setFormat}>
                    <SelectTrigger className="h-9 border-border bg-surface-elevated">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["All formats", "PHYSICAL", "DIGITAL"].map((f) => (
                        <SelectItem key={f} value={f}>
                          {f.replaceAll("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Availability */}
                <div>
                  <label className="mb-1.5 block font-semibold text-text-secondary">Availability</label>
                  <Select value={availability} onValueChange={setAvailability}>
                    <SelectTrigger className="h-9 border-border bg-surface-elevated">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["All availability", "AVAILABLE", "RESERVED", "SOLD_OUT"].map((a) => (
                        <SelectItem key={a} value={a}>
                          {a.replaceAll("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Artist */}
                <div>
                  <label className="mb-1.5 block font-semibold text-text-secondary">Artist</label>
                  <Select value={artistFilter} onValueChange={setArtistFilter}>
                    <SelectTrigger className="h-9 border-border bg-surface-elevated">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["All artists", ...new Set(initialArtworks.map((item) => item.artist))].map(
                        (art) => (
                          <SelectItem key={art} value={art}>
                            {art}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Price filter slider/box */}
              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 rounded-xl border border-border bg-surface-elevated px-4 py-2 text-xs">
                  <span className="text-text-secondary">Max Budget: ₹</span>
                  <input
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ""))}
                    placeholder="Any"
                    inputMode="numeric"
                    className="w-24 bg-transparent outline-none text-text-primary"
                  />
                </label>

                {maxPrice && (
                  <button
                    onClick={() => setMaxPrice("")}
                    className="text-xs text-text-secondary hover:text-text-primary"
                  >
                    Clear budget
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Results Status Header */}
          <div className="mt-8 flex items-center justify-between text-xs text-text-secondary">
            <span>
              {searching
                ? "Updating curation..."
                : searchError ||
                  `Displaying ${results.length} ${results.length === 1 ? "work" : "works"}`}
            </span>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-accent-secondary hover:underline"
              >
                Clear all active filters
              </button>
            )}
          </div>

          {/* Artwork Cards Grid / Masonry Container */}
          {results.length > 0 ? (
            <div className={`mt-6 ${gridLayoutClass}`}>
              {results.map((artwork, index) => (
                <ArtworkCard
                  key={artwork.id}
                  artwork={artwork}
                  liked={liked.includes(artwork.id)}
                  saved={saved.includes(artwork.id)}
                  reason={
                    personalized && index < 3
                      ? recommendationReason(artwork, preferences)
                      : undefined
                  }
                  onLike={toggleLike}
                  onSave={toggleSave}
                  onView={(item) => {
                    setDetail(item);
                    if (user && databaseReady) {
                      startTransition(() => void recordArtworkView(item.id));
                    }
                  }}
                  onCart={addCart}
                  priority={index < 3}
                />
              ))}
            </div>
          ) : (
            <div className="my-16 rounded-2xl border border-border p-16 text-center text-text-secondary">
              <Search size={32} className="mx-auto mb-3 opacity-30" />
              <p className="font-serif text-3xl text-text-primary">No artworks found</p>
              <p className="mt-2 text-sm">
                Try loosening your filters or search keywords.
              </p>
              <button
                onClick={resetFilters}
                className="button-light mt-6 text-xs !py-2 !px-5"
              >
                Reset catalog filters
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 6. ARTISTS TO WATCH (Phase 6 Requirement) */}
      <section id="artists" className="py-24 border-t border-border bg-surface-elevated/20">
        <div className="section-shell">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Visionary Creators</p>
              <h2 className="section-title mt-3">
                Artists to <i>watch.</i>
              </h2>
            </div>
            <Link href="/#artists" className="text-link text-xs">
              View registered studio profiles <ArrowRight size={14} />
            </Link>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {artists.map((artist) => (
              <button
                key={artist.id}
                onClick={() => setArtistId(artist.id)}
                className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-border bg-surface text-left shadow-xl transition hover:border-accent-secondary"
              >
                <Image
                  src={artist.image}
                  alt={`Artwork by ${artist.name}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/30 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 p-6">
                  <p className="text-[11px] uppercase tracking-wider text-accent-secondary">
                    {artist.location} · {artist.discipline}
                  </p>
                  <h3 className="mt-1 font-serif text-3xl text-text-primary group-hover:text-accent-secondary transition-colors">
                    {artist.name}
                  </h3>
                  <div className="mt-4 flex items-center justify-between text-xs text-text-secondary border-t border-white/10 pt-3">
                    <span>{artist.followers} followers</span>
                    <span>{artist.works} published works</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 7. PERSONALIZED TASTE PROFILE (Phase 6 & 11) */}
      <section id="for-you" className="py-24 border-t border-border">
        <div className="section-shell grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <p className="eyebrow">Curatorial Memory</p>
            <h2 className="section-title mt-3">
              <i>{preferences[0] ? `${preferences[0]} Visionary` : "The Curated Self"}</i>
            </h2>
            <p className="mt-6 text-base leading-relaxed text-text-secondary max-w-lg">
              Giggle Gallery uses your saved works, color affinities, and emotional choices to shape a personalized exhibition catalogue.
            </p>
            <button
              onClick={() => setDiscoverOpen(true)}
              className="button-light mt-8 text-xs !py-3 !px-6"
            >
              <Sparkles size={15} /> {personalized ? "Refine taste profile" : "Tune my gallery"}
            </button>
          </div>

          <div className="taste-panel">
            <p className="text-xs uppercase tracking-wider text-text-secondary">
              Active collector taste tokens
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {preferences.length ? (
                preferences.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-border bg-surface px-4 py-2 text-xs text-text-primary"
                  >
                    {item}
                  </span>
                ))
              ) : (
                <p className="text-sm text-text-secondary">
                  Complete the visual discovery session to tune your private museum feed.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 8. LITTLE MUSEUM COLLECTIONS (Phase 11) */}
      <section id="collections" className="py-24 border-t border-border bg-surface-elevated/10">
        <div className="section-shell">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Private Repository</p>
              <h2 className="section-title mt-3">
                My Calm <i>Collection.</i>
              </h2>
            </div>
            <Link href="/collections" className="text-link text-xs">
              Manage all collections ({savedItems.length}) <ArrowRight size={14} />
            </Link>
          </div>

          {savedItems.length ? (
            <div className="mt-10 flex snap-x gap-5 overflow-x-auto pb-6">
              {savedItems.map((artwork) => (
                <button
                  key={artwork.id}
                  onClick={() => setDetail(artwork)}
                  className="group min-w-[76vw] snap-start text-left sm:min-w-[340px] rounded-2xl overflow-hidden border border-border bg-surface transition hover:border-accent-secondary"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-bg-secondary">
                    <Image
                      src={artwork.image}
                      alt={artwork.title}
                      fill
                      sizes="(max-width: 640px) 76vw, 340px"
                      className="object-cover transition duration-500 group-hover:scale-105"
                      style={{ objectPosition: artwork.imagePosition ?? "center" }}
                    />
                  </div>
                  <div className="p-5">
                    <p className="font-serif text-xl text-text-primary group-hover:text-accent-secondary transition-colors">
                      {artwork.title}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">{artwork.artist}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-10 rounded-2xl border border-border p-16 text-center text-text-secondary">
              <Heart size={32} className="mx-auto mb-3 opacity-30 text-accent-secondary" />
              <p className="font-serif text-2xl text-text-primary">Your wall is still waiting</p>
              <p className="mt-1 text-xs">
                Save works as you browse to build your first private exhibition room.
              </p>
              <a href="#gallery" className="button-outline mt-6 text-xs !py-2 !px-5 inline-block">
                Explore artworks
              </a>
            </div>
          )}
        </div>
      </section>

      {/* 9. EDITORIAL FOOTER */}
      <footer className="border-t border-border px-5 pb-28 pt-16 sm:px-10 sm:pb-16 lg:px-16 bg-surface">
        <div className="mx-auto flex max-w-[1600px] flex-col justify-between gap-10 sm:flex-row">
          <div>
            <p className="font-serif text-3xl tracking-tight text-text-primary">
              GIGGLE <i className="text-accent-secondary">GALLERY</i>
            </p>
            <p className="mt-3 text-sm text-text-secondary">
              Fine digital art curated around human feeling and architectural stillness.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-xs text-text-secondary">
            <a href="#gallery" className="hover:text-text-primary transition">Gallery</a>
            <Link href="/auctions" className="hover:text-text-primary transition">Auctions</Link>
            <Link href="/collections" className="hover:text-text-primary transition">Collections</Link>
            <Link href="/settings" className="hover:text-text-primary transition">Settings</Link>
            <button onClick={() => setCommandSearchOpen(true)} className="text-left hover:text-text-primary transition">
              Command Palette (⌘K)
            </button>
            <button onClick={() => setDiscoverOpen(true)} className="text-left hover:text-text-primary transition">
              Tune Taste
            </button>
          </div>
        </div>

        <div className="mx-auto mt-12 flex max-w-[1600px] justify-between border-t border-border pt-6 text-[11px] text-text-secondary">
          <span>© 2026 Giggle Gallery · Digital Fine Art Platform</span>
          <span>Curated with Feeling</span>
        </div>
      </footer>

      {/* Modals & Commerce Sheets */}
      <DiscoveryDialog
        open={discoverOpen}
        onOpenChange={setDiscoverOpen}
        onComplete={completeDiscoveryStable}
      />
      <ArtworkDetail
        artwork={detail}
        liked={detail ? liked.includes(detail.id) : false}
        saved={detail ? saved.includes(detail.id) : false}
        reason={detail ? recommendationReason(detail, preferences) : ""}
        onClose={() => setDetail(null)}
        onLike={() => detail && toggleLike(detail.id)}
        onSave={() => detail && toggleSave(detail.id)}
        onCart={() => detail && addCart(detail)}
        onArtist={showArtist}
      />
      <ArtistDialog
        artist={activeArtist ?? null}
        followed={activeArtist ? followed.includes(activeArtist.id) : false}
        works={initialArtworks.filter((artwork) => artwork.artistId === artistId)}
        onClose={() => setArtistId(null)}
        onFollow={() => {
          if (!activeArtist || !requireAccount()) return;
          const wasFollowing = followed.includes(activeArtist.id);
          setFollowed(
            wasFollowing
              ? followed.filter((id) => id !== activeArtist.id)
              : [...followed, activeArtist.id]
          );
          startTransition(async () => {
            const result = await toggleFollowAction(activeArtist.id);
            if (!result.ok) {
              setFollowed(followed);
              toast.error(result.error);
            }
          });
        }}
        onArtwork={(artwork) => {
          setArtistId(null);
          window.setTimeout(() => setDetail(artwork), 180);
        }}
      />
      <CommerceSheet
        open={cartOpen}
        onOpenChange={setCartOpen}
        items={cartItems}
        onQuantity={updateCart}
        onClear={clearCart}
      />
      <GiggleAssistant artworks={initialArtworks} onView={setDetail} />
      <CommandSearch open={commandSearchOpen} onOpenChange={setCommandSearchOpen} />
    </main>
  );
}
