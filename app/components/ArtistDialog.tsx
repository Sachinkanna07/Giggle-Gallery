"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, MapPin, Plus, Palette } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { ArtistSummary } from "@/lib/marketplace-data";
import { Artwork } from "../data";

type Props = {
  artist: ArtistSummary | null;
  followed: boolean;
  works: Artwork[];
  onClose: () => void;
  onFollow: () => void;
  onArtwork: (artwork: Artwork) => void;
};

export function ArtistDialog({ artist, followed, works, onClose, onFollow, onArtwork }: Props) {
  return (
    <Dialog open={Boolean(artist)} onOpenChange={(open) => !open && onClose()}>
      {artist && (
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl border-border bg-surface p-0 text-text-primary sm:max-w-4xl shadow-2xl backdrop-blur-2xl">
          <div className="relative min-h-[320px] overflow-hidden p-6 sm:p-10">
            <Image
              src={artist.image}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, 800px"
              className="object-cover opacity-35 blur-[1px]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/70 to-transparent" />
            <div className="relative z-10 flex min-h-[260px] flex-col justify-end">
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent-secondary">
                <MapPin size={13} /> {artist.location}
              </p>
              <DialogTitle className="font-serif text-5xl sm:text-7xl font-normal tracking-[-0.04em] text-text-primary leading-tight">
                {artist.name}
              </DialogTitle>
              <DialogDescription className="mt-3 max-w-xl text-sm leading-relaxed text-text-secondary">
                {artist.bio}
              </DialogDescription>
              <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-text-secondary">
                <span className="flex items-center gap-1 font-medium text-text-primary">
                  <Palette size={13} className="text-accent-secondary" /> {artist.discipline}
                </span>
                <span>•</span>
                <span>{artist.works} artworks</span>
                <span>•</span>
                <span>{artist.followers} followers</span>
                <Link
                  href={`/artist/${artist.slug}`}
                  className="underline decoration-border underline-offset-4 hover:text-text-primary transition"
                >
                  Full exhibition page
                </Link>
                <button
                  aria-pressed={followed}
                  onClick={onFollow}
                  className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition ${
                    followed
                      ? "bg-text-primary text-bg-primary"
                      : "bg-accent text-white hover:bg-accent-secondary"
                  }`}
                >
                  {followed ? <Check size={14} /> : <Plus size={14} />}{" "}
                  {followed ? "Following" : "Follow"}
                </button>
              </div>
            </div>
          </div>
          <div className="border-t border-border px-6 pb-8 pt-6 sm:px-10">
            <div className="mb-4 flex items-baseline justify-between">
              <h3 className="font-serif text-2xl text-text-primary">Selected Works</h3>
              <span className="text-[11px] uppercase tracking-wider text-text-secondary">
                Exhibition Highlights
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {works.map((work) => (
                <button
                  key={work.id}
                  onClick={() => onArtwork(work)}
                  className="group rounded-xl overflow-hidden border border-border bg-surface-elevated/40 text-left transition hover:border-accent-secondary"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-bg-secondary">
                    <Image
                      src={work.image}
                      alt={work.title}
                      fill
                      sizes="(max-width: 640px) 50vw, 240px"
                      className="object-cover transition duration-500 group-hover:scale-105"
                      style={{ objectPosition: work.imagePosition ?? "center" }}
                    />
                  </div>
                  <div className="p-3">
                    <p className="font-serif text-sm text-text-primary truncate">{work.title}</p>
                    <p className="mt-0.5 text-[10px] text-text-secondary">
                      {work.year} · {work.medium}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
