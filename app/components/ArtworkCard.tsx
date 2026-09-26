"use client";

import Image from "next/image";
import { useState, useRef } from "react";
import { Eye, Heart, Plus, ShoppingBag, Check, Sparkles, Gavel } from "lucide-react";
import { Artwork, formatPrice } from "../data";
import { useDisplaySettings } from "@/lib/display-settings";

type Props = {
  artwork: Artwork;
  liked: boolean;
  saved: boolean;
  reason?: string;
  onLike: (id: string) => void;
  onSave: (id: string) => void;
  onView: (artwork: Artwork) => void;
  onCart: (artwork: Artwork) => void;
  priority?: boolean;
};

export function ArtworkCard({
  artwork,
  liked,
  saved,
  reason,
  onLike,
  onSave,
  onView,
  onCart,
  priority,
}: Props) {
  const { settings } = useDisplaySettings();
  const cardRef = useRef<HTMLElement>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });

  const isReserved = artwork.availability === "RESERVED";
  const isSoldOut = artwork.availability === "SOLD_OUT";
  const isReduced = settings.motion === "reduced" || settings.accessibility.reducedMotion;

  // Subtle 3D tilt tracking for desktop
  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (isReduced || !settings.cursorEffects) return;
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -4; // Max 4 deg tilt
    const rotateY = ((x - centerX) / centerX) * 4;

    setTilt({ rotateX, rotateY });
  };

  const handleMouseLeave = () => {
    if (isReduced) return;
    setTilt({ rotateX: 0, rotateY: 0 });
  };

  const aspectClass =
    settings.aspectMode === "natural"
      ? "aspect-[4/5] sm:aspect-auto sm:h-[420px]"
      : "aspect-[4/5]";

  return (
    <article
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform:
          !isReduced && (tilt.rotateX !== 0 || tilt.rotateY !== 0)
            ? `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) translateY(-4px)`
            : undefined,
      }}
      className="art-card group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-500 hover:border-accent/40"
    >
      {/* Visual Image Viewport */}
      <div className={`relative ${aspectClass} w-full overflow-hidden bg-bg-secondary select-none`}>
        <Image
          src={artwork.image}
          alt={`${artwork.title} by ${artwork.artist}`}
          fill
          priority={priority}
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          style={{ objectPosition: artwork.imagePosition ?? "center" }}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

        {/* Ambient Gradient Shadows */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/90 via-transparent to-black/20 opacity-70 transition-opacity duration-300 group-hover:opacity-90" />

        {/* Top Badges: Mood & Availability */}
        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5 z-10">
          <span className="rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-md">
            {artwork.mood}
          </span>
          {isReserved ? (
            <span className="flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-300 backdrop-blur-md">
              <Gavel size={10} /> Auction Lot
            </span>
          ) : isSoldOut ? (
            <span className="rounded-full border border-red-400/30 bg-red-500/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-red-300 backdrop-blur-md">
              Sold
            </span>
          ) : (
            <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] font-medium text-white/70 backdrop-blur-md">
              {artwork.type === "DIGITAL" ? "Digital Edition" : "Original"}
            </span>
          )}
        </div>

        {/* Top-Right Quick Interaction Buttons (Wishlist & Collection Save) */}
        <div className="absolute right-3 top-3 flex flex-col gap-2 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLike(artwork.id);
            }}
            aria-label={liked ? `Remove ${artwork.title} from favorites` : `Save ${artwork.title} to favorites`}
            className={`grid size-9 place-items-center rounded-full border backdrop-blur-md transition-transform duration-200 active:scale-90 ${
              liked
                ? "border-accent bg-accent text-white shadow-md shadow-accent/30"
                : "border-white/20 bg-black/40 text-white/80 hover:bg-white hover:text-black"
            }`}
          >
            <Heart size={15} fill={liked ? "currentColor" : "none"} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onSave(artwork.id);
            }}
            aria-label={saved ? `Remove ${artwork.title} from collection` : `Add ${artwork.title} to collection`}
            className={`grid size-9 place-items-center rounded-full border backdrop-blur-md transition-transform duration-200 active:scale-90 ${
              saved
                ? "border-white bg-white text-black shadow-md"
                : "border-white/20 bg-black/40 text-white/80 hover:bg-white hover:text-black"
            }`}
          >
            {saved ? <Check size={14} className="stroke-[3]" /> : <Plus size={16} />}
          </button>
        </div>

        {/* Quick View & Cart Overlay Actions (Sliding into view on hover) */}
        <div className="absolute inset-x-3 bottom-3 flex translate-y-3 gap-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 z-10">
          <button
            onClick={() => onView(artwork)}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-text-primary px-4 py-2.5 text-xs font-semibold text-bg-primary shadow-lg transition hover:bg-accent-secondary"
          >
            <Eye size={14} /> Quick View
          </button>
          {!isReserved && !isSoldOut && (
            <button
              onClick={() => onCart(artwork)}
              aria-label={`Add ${artwork.title} to cart`}
              className="grid size-10 place-items-center rounded-full bg-accent text-white shadow-lg transition hover:bg-accent-secondary active:scale-95"
            >
              <ShoppingBag size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Artwork Metadata & Details */}
      <div className="flex flex-1 flex-col justify-between p-5">
        <button
          onClick={() => onView(artwork)}
          className="block w-full text-left focus:outline-none"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-serif text-xl tracking-[-0.02em] text-text-primary group-hover:text-accent-secondary transition-colors line-clamp-1">
                {artwork.title}
              </h3>
              <p className="mt-1 text-xs text-text-secondary">
                {artwork.artist} · {artwork.medium}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="block font-medium text-sm text-text-primary">
                {formatPrice(artwork.price)}
              </span>
              <span className="text-[10px] text-text-secondary">
                {artwork.type === "DIGITAL" ? "Digital" : "Physical"}
              </span>
            </div>
          </div>
        </button>

        {/* Dynamic Curation Note (If personalized) */}
        {reason && (
          <div className="mt-3.5 flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/5 px-2.5 py-1.5 text-[11px] text-accent-secondary">
            <Sparkles size={11} className="shrink-0" />
            <span className="line-clamp-1">{reason}</span>
          </div>
        )}
      </div>
    </article>
  );
}
