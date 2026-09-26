"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Search, Sparkles, Gavel, Palette, ArrowRight, X } from "lucide-react";
import { artworks as defaultArtworks, artists as defaultArtists, moods, styles, formatPrice } from "@/app/data";

interface CommandSearchProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CommandSearch({ open: controlledOpen, onOpenChange: setControlledOpen }: CommandSearchProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("giggle_recent_searches");
      return stored ? JSON.parse(stored).slice(0, 5) : [];
    } catch {
      return [];
    }
  });
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Global keyboard shortcut: Cmd+K / Ctrl+K or "/"
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input, textarea, or contentEditable
      const target = e.target as HTMLElement | null;
      const isInput =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !isInput)) {
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setOpen]);

  const saveSearchTerm = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const updated = [trimmed, ...recentSearches.filter((t) => t.toLowerCase() !== trimmed.toLowerCase())].slice(0, 6);
    setRecentSearches(updated);
    try {
      localStorage.setItem("giggle_recent_searches", JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleSelectArtwork = (slug: string, title: string) => {
    saveSearchTerm(title);
    setOpen(false);
    startTransition(() => {
      router.push(`/artwork/${slug}`);
    });
  };

  const handleSelectArtist = (slug: string, name: string) => {
    saveSearchTerm(name);
    setOpen(false);
    startTransition(() => {
      router.push(`/artist/${slug}`);
    });
  };

  const handleSelectCategory = (type: "mood" | "style", value: string) => {
    saveSearchTerm(value);
    setOpen(false);
    startTransition(() => {
      router.push(`/?${type}=${encodeURIComponent(value)}#gallery`);
    });
  };

  const handleRunSearch = (term: string) => {
    saveSearchTerm(term);
    setOpen(false);
    startTransition(() => {
      router.push(`/?q=${encodeURIComponent(term)}#gallery`);
    });
  };

  const cleanQuery = query.trim().toLowerCase();

  // Search results
  const matchedArtworks = defaultArtworks
    .filter(
      (a) =>
        a.title.toLowerCase().includes(cleanQuery) ||
        a.artist.toLowerCase().includes(cleanQuery) ||
        a.mood.toLowerCase().includes(cleanQuery) ||
        a.style.toLowerCase().includes(cleanQuery) ||
        a.tags.some((t) => t.toLowerCase().includes(cleanQuery))
    )
    .slice(0, 4);

  const matchedArtists = defaultArtists
    .filter(
      (a) =>
        a.name.toLowerCase().includes(cleanQuery) ||
        a.discipline.toLowerCase().includes(cleanQuery) ||
        a.location.toLowerCase().includes(cleanQuery)
    )
    .slice(0, 3);

  const matchedMoods = moods.filter((m) => m.toLowerCase().includes(cleanQuery)).slice(0, 3);
  const matchedStyles = styles.filter((s) => s.toLowerCase().includes(cleanQuery)).slice(0, 3);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl border-white/15 bg-surface p-0 text-text-primary shadow-2xl backdrop-blur-2xl overflow-hidden rounded-2xl">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <Search size={20} className="text-accent-secondary shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && query.trim()) {
                handleRunSearch(query);
              }
            }}
            placeholder="Search artworks, artists, styles, auctions... (Press Enter)"
            className="flex-1 bg-transparent text-base text-text-primary placeholder:text-text-secondary/50 outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery("")}
              className="rounded-full p-1 text-text-secondary hover:text-text-primary"
            >
              <X size={16} />
            </button>
          ) : (
            <kbd className="hidden rounded bg-white/10 px-2 py-0.5 text-xs text-text-secondary sm:inline">
              ESC
            </kbd>
          )}
        </div>

        {/* Content Body */}
        <div className="max-h-[65vh] overflow-y-auto p-4 space-y-6">
          {/* Quick Filter Tag Suggestions if query is empty */}
          {!cleanQuery && (
            <div>
              {recentSearches.length > 0 && (
                <div className="mb-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary/60">
                    Recent Searches
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((term) => (
                      <button
                        key={term}
                        onClick={() => handleRunSearch(term)}
                        className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-text-secondary transition hover:border-accent-secondary hover:text-text-primary"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary/60">
                Trending Moods & Explorations
              </p>
              <div className="flex flex-wrap gap-2">
                {moods.slice(0, 6).map((mood) => (
                  <button
                    key={mood}
                    onClick={() => handleSelectCategory("mood", mood)}
                    className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-3.5 py-1.5 text-xs text-text-primary transition hover:border-accent-secondary hover:bg-white/[0.06]"
                  >
                    <Sparkles size={12} className="text-accent-secondary" /> {mood}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Matched Artworks */}
          {matchedArtworks.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary/60">
                Artworks
              </p>
              <div className="space-y-1.5">
                {matchedArtworks.map((art) => (
                  <button
                    key={art.id}
                    onClick={() => handleSelectArtwork(art.slug, art.title)}
                    className="group flex w-full items-center justify-between rounded-xl p-2.5 text-left transition hover:bg-white/[0.06]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-white/5">
                        <Image
                          src={art.image}
                          alt={art.title}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-serif text-lg leading-tight text-text-primary group-hover:text-accent-secondary">
                          {art.title}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {art.artist} · {art.style} · {art.mood}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-text-secondary">
                        {formatPrice(art.price)}
                      </span>
                      <ArrowRight size={14} className="opacity-0 transition group-hover:opacity-100 text-accent-secondary" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Matched Artists */}
          {matchedArtists.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary/60">
                Artists
              </p>
              <div className="space-y-1.5">
                {matchedArtists.map((artist) => (
                  <button
                    key={artist.id}
                    onClick={() =>
                      handleSelectArtist(
                        artist.name.toLowerCase().replaceAll(" ", "-"),
                        artist.name
                      )
                    }
                    className="group flex w-full items-center justify-between rounded-xl p-2.5 text-left transition hover:bg-white/[0.06]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 overflow-hidden rounded-full bg-white/5">
                        <Image
                          src={artist.image}
                          alt={artist.name}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-serif text-base text-text-primary group-hover:text-accent-secondary">
                          {artist.name}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {artist.discipline} · {artist.location}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-text-secondary">{artist.followers} followers</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Matched Categories & Styles */}
          {(matchedMoods.length > 0 || matchedStyles.length > 0) && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary/60">
                Categories & Movements
              </p>
              <div className="flex flex-wrap gap-2">
                {matchedMoods.map((m) => (
                  <button
                    key={m}
                    onClick={() => handleSelectCategory("mood", m)}
                    className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-text-primary hover:border-accent-secondary"
                  >
                    <Palette size={12} className="text-accent-secondary" /> Mood: {m}
                  </button>
                ))}
                {matchedStyles.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSelectCategory("style", s)}
                    className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-text-primary hover:border-accent-secondary"
                  >
                    <Palette size={12} className="text-accent-secondary" /> Style: {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Navigation to Auctions */}
          <div className="border-t border-white/10 pt-4">
            <button
              onClick={() => {
                setOpen(false);
                router.push("/auctions");
              }}
              className="flex w-full items-center justify-between rounded-xl p-2.5 text-sm text-text-secondary transition hover:bg-white/[0.06] hover:text-text-primary"
            >
              <span className="flex items-center gap-2.5">
                <Gavel size={16} className="text-accent-secondary" /> View Live Art Auctions
              </span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Empty state */}
          {cleanQuery &&
            matchedArtworks.length === 0 &&
            matchedArtists.length === 0 &&
            matchedMoods.length === 0 &&
            matchedStyles.length === 0 && (
              <div className="py-10 text-center text-text-secondary">
                <Search size={28} className="mx-auto mb-3 opacity-30" />
                <p className="font-serif text-xl text-text-primary">No results found for “{query}”</p>
                <p className="mt-1 text-xs">Press Enter to search the full catalog or try another keyword.</p>
                <button
                  onClick={() => handleRunSearch(query)}
                  className="button-light mt-5 text-xs !py-2 !px-4"
                >
                  Search catalog for “{query}”
                </button>
              </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
