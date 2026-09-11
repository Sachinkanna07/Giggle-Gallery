"use client";

import Image from "next/image";
import { Eye, Heart, Plus, ShoppingBag } from "lucide-react";
import { Artwork, formatPrice } from "../data";

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

export function ArtworkCard({ artwork, liked, saved, reason, onLike, onSave, onView, onCart, priority }: Props) {
  return (
    <article className="art-card group min-w-0">
      <div className="relative aspect-[4/5] overflow-hidden bg-white/5">
        <Image
          src={artwork.image}
          alt={`${artwork.title} by ${artwork.artist}`}
          fill
          priority={priority}
          className="object-cover transition duration-700 ease-out group-hover:scale-[1.025]"
          style={{ objectPosition: artwork.imagePosition ?? "center" }}
          sizes="(max-width: 640px) 82vw, (max-width: 1024px) 42vw, 28vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/5 opacity-80 transition group-hover:opacity-100" />
        <div className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/35 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.12em] backdrop-blur-md">
          {artwork.mood}
        </div>
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <button onClick={() => onLike(artwork.id)} aria-label={liked ? `Remove ${artwork.title} from wishlist` : `Add ${artwork.title} to wishlist`} className={`grid size-10 place-items-center rounded-full border backdrop-blur-md transition ${liked ? "border-cobalt-light bg-cobalt text-white" : "border-white/20 bg-black/35 hover:bg-white hover:text-black"}`}>
            <Heart size={17} fill={liked ? "currentColor" : "none"} />
          </button>
          <button onClick={() => onSave(artwork.id)} aria-label={saved ? `Remove ${artwork.title} from collection` : `Save ${artwork.title} to collection`} className={`grid size-10 place-items-center rounded-full border backdrop-blur-md transition ${saved ? "border-ivory bg-ivory text-ink" : "border-white/20 bg-black/35 hover:bg-white hover:text-black"}`}>
            <Plus size={18} className={saved ? "rotate-45 transition" : "transition"} />
          </button>
        </div>
        <div className="absolute inset-x-3 bottom-3 flex translate-y-2 gap-2 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
          <button onClick={() => onView(artwork)} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-ivory px-4 py-3 text-sm font-semibold text-ink transition hover:bg-cobalt-light">
            <Eye size={16} /> Quick view
          </button>
          <button onClick={() => onCart(artwork)} aria-label={`Add ${artwork.title} to cart`} className="grid size-11 place-items-center rounded-full bg-cobalt text-white transition hover:bg-cobalt-light hover:text-ink">
            <ShoppingBag size={17} />
          </button>
        </div>
      </div>
      <button onClick={() => onView(artwork)} className="mt-4 block w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-serif text-[1.65rem] leading-tight tracking-[-.035em]">{artwork.title}</h3>
            <p className="mt-1 text-sm text-white/55">{artwork.artist} · {artwork.year}</p>
          </div>
          <span className="pt-1 text-sm font-semibold">{formatPrice(artwork.price)}</span>
        </div>
      </button>
      {reason && <p className="mt-3 border-l border-cobalt-light/70 pl-3 text-xs leading-relaxed text-cobalt-light/80">{reason}</p>}
    </article>
  );
}
