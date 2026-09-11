"use client";

import Image from "next/image";
import { Heart, Plus, Share2, ShoppingBag, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Artwork, formatPrice } from "../data";

type Props = {
  artwork: Artwork | null;
  liked: boolean;
  saved: boolean;
  reason: string;
  onClose: () => void;
  onLike: () => void;
  onSave: () => void;
  onCart: () => void;
  onArtist: (artistId: string) => void;
};

export function ArtworkDetail({ artwork, liked, saved, reason, onClose, onLike, onSave, onCart, onArtist }: Props) {
  return (
    <Dialog open={Boolean(artwork)} onOpenChange={(open) => !open && onClose()}>
      {artwork && (
        <DialogContent className="grid max-h-[94vh] overflow-y-auto border-white/15 bg-[#080b10] p-0 text-ivory sm:max-w-6xl lg:grid-cols-[1.12fr_.88fr]" showCloseButton>
          <div className="relative min-h-[52vh] bg-black lg:min-h-[88vh]">
            <Image src={artwork.image} alt={`${artwork.title} by ${artwork.artist}`} fill className="object-cover" style={{ objectPosition: artwork.imagePosition ?? "center" }} sizes="(max-width: 1024px) 100vw, 58vw" />
            <div className="noise pointer-events-none absolute inset-0 opacity-10" />
          </div>
          <div className="flex flex-col p-6 sm:p-10 lg:max-h-[88vh] lg:overflow-y-auto">
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[.17em] text-cobalt-light">{artwork.style} · {artwork.mood}</p>
              <DialogTitle className="mt-4 font-serif text-5xl font-normal leading-[.9] tracking-[-.055em] sm:text-6xl">{artwork.title}</DialogTitle>
              <button onClick={() => onArtist(artwork.artistId)} className="mt-5 text-left text-base text-white/55 underline decoration-white/20 underline-offset-4 transition hover:text-white">{artwork.artist}, {artwork.location}</button>
            </div>

            <DialogDescription className="text-base leading-relaxed text-white/68">{artwork.description}</DialogDescription>
            <blockquote className="my-7 border-l border-cobalt-light pl-5 font-serif text-xl italic leading-relaxed text-white/85">“{artwork.artistStatement}”</blockquote>

            <dl className="grid grid-cols-2 gap-x-5 gap-y-4 border-y border-white/10 py-6 text-sm">
              <div><dt className="text-xs uppercase tracking-wider text-white/35">Medium</dt><dd className="mt-1">{artwork.medium}</dd></div>
              <div><dt className="text-xs uppercase tracking-wider text-white/35">Year</dt><dd className="mt-1">{artwork.year}</dd></div>
              <div><dt className="text-xs uppercase tracking-wider text-white/35">Dimensions</dt><dd className="mt-1">{artwork.dimensions}</dd></div>
              <div><dt className="text-xs uppercase tracking-wider text-white/35">Edition</dt><dd className="mt-1">12 + 2 AP</dd></div>
            </dl>

            <div className="mt-6 rounded-xl border border-cobalt-light/20 bg-cobalt/[.08] p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.12em] text-cobalt-light"><Sparkles size={14} /> Why you might like this</p>
              <p className="mt-2 text-sm leading-relaxed text-white/65">{reason}</p>
            </div>

            <div className="mt-auto pt-7">
              <div className="mb-5 flex items-end justify-between"><span className="text-sm text-white/45">Archival, signed edition</span><strong className="font-serif text-3xl font-normal">{formatPrice(artwork.price)}</strong></div>
              <button onClick={onCart} className="flex w-full items-center justify-center gap-3 rounded-full bg-ivory px-5 py-4 text-sm font-semibold text-ink transition hover:bg-cobalt-light"><ShoppingBag size={17} /> Add to cart</button>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <button onClick={onLike} className={`flex items-center justify-center gap-2 rounded-full border px-3 py-3 text-sm transition ${liked ? "border-cobalt-light bg-cobalt/20" : "border-white/15 hover:border-white/40"}`}><Heart size={16} fill={liked ? "currentColor" : "none"} /> Like</button>
                <button onClick={onSave} className={`flex items-center justify-center gap-2 rounded-full border px-3 py-3 text-sm transition ${saved ? "border-white bg-white text-black" : "border-white/15 hover:border-white/40"}`}><Plus size={16} /> Save</button>
                <button onClick={() => navigator.clipboard?.writeText(window.location.href)} className="flex items-center justify-center gap-2 rounded-full border border-white/15 px-3 py-3 text-sm transition hover:border-white/40"><Share2 size={16} /> Share</button>
              </div>
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
