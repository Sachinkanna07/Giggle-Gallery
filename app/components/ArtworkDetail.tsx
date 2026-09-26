"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  Heart,
  Plus,
  Share2,
  ShoppingBag,
  Sparkles,
  Maximize2,
  Minimize2,
  Check,
  X,
  Gavel,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Artwork, formatPrice } from "../data";
import { toast } from "sonner";

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

export function ArtworkDetail({
  artwork,
  liked,
  saved,
  reason,
  onClose,
  onLike,
  onSave,
  onCart,
  onArtist,
}: Props) {
  const [fullscreen, setFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  if (!artwork) return null;

  const isReserved = artwork.availability === "RESERVED";
  const available = artwork.availability === "AVAILABLE" && (artwork.stock ?? 1) > 0;
  const shipping = artwork.type === "PHYSICAL" ? 350 : 0;
  const total = artwork.price + shipping;

  const handleShare = () => {
    const url = `${window.location.origin}/artwork/${artwork.slug}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      toast.success("Artwork link copied to clipboard");
    }
  };

  return (
    <>
      {/* Standard Editorial Modal View */}
      <Dialog open={Boolean(artwork) && !fullscreen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          className="max-h-[92vh] max-w-5xl overflow-hidden rounded-2xl border-border bg-surface p-0 text-text-primary shadow-2xl backdrop-blur-2xl"
          showCloseButton={false}
        >
          {/* Custom Header Close & Fullscreen Action */}
          <div className="absolute right-4 top-4 z-30 flex items-center gap-2">
            <button
              onClick={() => setFullscreen(true)}
              aria-label="Enter museum fullscreen viewer"
              className="grid size-9 place-items-center rounded-full border border-border bg-black/50 text-white backdrop-blur-md transition hover:bg-white hover:text-black"
            >
              <Maximize2 size={16} />
            </button>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="grid size-9 place-items-center rounded-full border border-border bg-black/50 text-white backdrop-blur-md transition hover:bg-white hover:text-black"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid max-h-[92vh] overflow-y-auto lg:grid-cols-[1.1fr_0.9fr] lg:overflow-hidden">
            {/* Left Image Viewport */}
            <div className="relative min-h-[48vh] bg-black/95 lg:min-h-[82vh]">
              <Image
                src={artwork.image}
                alt={`${artwork.title} by ${artwork.artist}`}
                fill
                priority
                className="object-contain p-4 lg:p-8"
                style={{ objectPosition: artwork.imagePosition ?? "center" }}
                sizes="(max-width: 1024px) 100vw, 55vw"
              />
              <button
                onClick={() => setFullscreen(true)}
                className="absolute bottom-5 left-5 flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-3.5 py-1.5 text-xs text-white backdrop-blur-md transition hover:bg-white hover:text-black"
              >
                <Maximize2 size={13} /> Museum Viewer
              </button>
            </div>

            {/* Right Details Panel */}
            <div className="flex flex-col p-6 sm:p-8 lg:max-h-[82vh] lg:overflow-y-auto">
              <div className="mb-6">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent-secondary">
                  <span>{artwork.style}</span>
                  <span>•</span>
                  <span>{artwork.mood}</span>
                </div>

                <DialogTitle className="mt-3 font-serif text-4xl sm:text-5xl font-normal tracking-[-0.03em] text-text-primary leading-tight">
                  {artwork.title}
                </DialogTitle>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => onArtist(artwork.artistId)}
                    className="text-left text-sm text-text-secondary underline decoration-border underline-offset-4 transition hover:text-accent-secondary"
                  >
                    {artwork.artist}
                  </button>
                  <span className="text-xs text-text-secondary/60">· {artwork.location}</span>
                </div>
              </div>

              <DialogDescription className="text-sm leading-relaxed text-text-secondary">
                {artwork.description}
              </DialogDescription>

              {artwork.artistStatement && (
                <blockquote className="my-6 border-l-2 border-accent pl-4 font-serif text-lg italic text-text-primary/90 leading-snug">
                  “{artwork.artistStatement}”
                </blockquote>
              )}

              {/* Specifications Matrix */}
              <dl className="grid grid-cols-2 gap-3 border-y border-border py-4 text-xs">
                <div>
                  <dt className="text-text-secondary uppercase tracking-wider text-[10px]">Medium</dt>
                  <dd className="mt-1 font-medium text-text-primary">{artwork.medium}</dd>
                </div>
                <div>
                  <dt className="text-text-secondary uppercase tracking-wider text-[10px]">Year</dt>
                  <dd className="mt-1 font-medium text-text-primary">{artwork.year}</dd>
                </div>
                <div>
                  <dt className="text-text-secondary uppercase tracking-wider text-[10px]">Dimensions</dt>
                  <dd className="mt-1 font-medium text-text-primary">{artwork.dimensions}</dd>
                </div>
                <div>
                  <dt className="text-text-secondary uppercase tracking-wider text-[10px]">Edition</dt>
                  <dd className="mt-1 font-medium text-text-primary">
                    {artwork.type === "DIGITAL" ? "Verified Digital" : "Single Original"}
                  </dd>
                </div>
              </dl>

              {/* Personalized Taste Matching */}
              {reason && (
                <div className="mt-5 rounded-xl border border-accent/20 bg-accent/5 p-3.5 text-xs text-text-secondary leading-relaxed">
                  <p className="flex items-center gap-1.5 font-semibold text-accent-secondary">
                    <Sparkles size={13} /> Curatorial Note
                  </p>
                  <p className="mt-1.5">{reason}</p>
                </div>
              )}

              {/* Price Transparency & Purchase Area */}
              <div className="mt-auto pt-6">
                <div className="mb-4 rounded-xl border border-border/80 bg-surface-elevated/40 p-3.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-text-secondary">Collector Price</span>
                    <strong className="font-serif text-2xl font-normal text-text-primary">
                      {formatPrice(artwork.price)}
                    </strong>
                  </div>
                  {artwork.type === "PHYSICAL" && (
                    <>
                      <div className="mt-1.5 flex justify-between text-xs text-text-secondary">
                        <span>Insured Art Transit</span>
                        <span>{shipping > 0 ? formatPrice(shipping) : "Complimentary"}</span>
                      </div>
                      <div className="mt-1.5 flex justify-between border-t border-border/50 pt-1.5 text-xs font-semibold text-text-primary">
                        <span>Total Price</span>
                        <span>{formatPrice(total)}</span>
                      </div>
                    </>
                  )}
                </div>

                {isReserved ? (
                  <Link
                    href="/auctions"
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-5 py-3.5 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/20"
                  >
                    <Gavel size={16} /> Reserved for Live Auction · View Room
                  </Link>
                ) : (
                  <button
                    disabled={!available}
                    onClick={onCart}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-text-primary px-5 py-3.5 text-sm font-semibold text-bg-primary shadow-lg transition hover:bg-accent-secondary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ShoppingBag size={16} /> {available ? "Acquire Artwork" : "Sold Out"}
                  </button>
                )}

                {/* Secondary Actions */}
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button
                    onClick={onLike}
                    aria-pressed={liked}
                    className={`flex items-center justify-center gap-2 rounded-full border border-border py-2 text-xs transition ${
                      liked
                        ? "border-accent bg-accent/15 text-accent-secondary"
                        : "text-text-secondary hover:border-text-primary hover:text-text-primary"
                    }`}
                  >
                    <Heart size={14} fill={liked ? "currentColor" : "none"} />
                    {liked ? "Saved" : "Save"}
                  </button>
                  <button
                    onClick={onSave}
                    aria-pressed={saved}
                    className={`flex items-center justify-center gap-2 rounded-full border border-border py-2 text-xs transition ${
                      saved
                        ? "border-text-primary bg-text-primary text-bg-primary"
                        : "text-text-secondary hover:border-text-primary hover:text-text-primary"
                    }`}
                  >
                    {saved ? <Check size={14} /> : <Plus size={14} />}
                    {saved ? "In Collection" : "Collect"}
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex items-center justify-center gap-2 rounded-full border border-border py-2 text-xs text-text-secondary hover:border-text-primary hover:text-text-primary transition"
                  >
                    <Share2 size={14} /> Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Museum Viewer (Phase 8 Requirement) */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
          {/* Museum Viewer Top Navigation HUD */}
          <div className="flex h-16 items-center justify-between border-b border-white/10 px-6 backdrop-blur-md">
            <div>
              <p className="font-serif text-lg">{artwork.title}</p>
              <p className="text-xs text-white/50">{artwork.artist} · {artwork.year}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setZoomLevel((z) => (z === 1 ? 1.75 : 1))}
                className="rounded-full border border-white/20 px-3.5 py-1.5 text-xs transition hover:bg-white hover:text-black"
              >
                {zoomLevel === 1 ? "Zoom 175%" : "Reset Zoom"}
              </button>
              <button
                onClick={() => setFullscreen(false)}
                className="grid size-9 place-items-center rounded-full border border-white/20 transition hover:bg-white hover:text-black"
              >
                <Minimize2 size={16} />
              </button>
            </div>
          </div>

          {/* High-Resolution Deep Canvas */}
          <div className="relative flex-1 overflow-auto p-6 flex items-center justify-center">
            <div
              className="relative max-h-full max-w-full transition-transform duration-300"
              style={{
                width: zoomLevel === 1 ? "85vw" : "140vw",
                height: zoomLevel === 1 ? "80vh" : "130vh",
              }}
            >
              <Image
                src={artwork.image}
                alt={artwork.title}
                fill
                priority
                className="object-contain"
                sizes="100vw"
              />
            </div>
          </div>

          {/* Museum Bottom Metadata Overlay */}
          <div className="flex items-center justify-between border-t border-white/10 px-8 py-3 text-xs text-white/50">
            <span>{artwork.dimensions} · {artwork.medium}</span>
            <span>Giggle Gallery Museum Presentation</span>
          </div>
        </div>
      )}
    </>
  );
}
