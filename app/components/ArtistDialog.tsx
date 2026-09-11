"use client";

import Image from "next/image";
import { Check, MapPin, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Artwork, artists } from "../data";

type Props = {
  artistId: string | null;
  followed: boolean;
  works: Artwork[];
  onClose: () => void;
  onFollow: () => void;
  onArtwork: (artwork: Artwork) => void;
};

export function ArtistDialog({ artistId, followed, works, onClose, onFollow, onArtwork }: Props) {
  const artist = artists.find((item) => item.id === artistId);
  return (
    <Dialog open={Boolean(artist)} onOpenChange={(open) => !open && onClose()}>
      {artist && (
        <DialogContent className="max-h-[92vh] overflow-y-auto border-white/15 bg-[#090c12] p-0 text-ivory sm:max-w-5xl">
          <div className="relative min-h-[330px] overflow-hidden p-7 sm:p-10">
            <Image src={artist.image} alt="" fill className="object-cover opacity-45 blur-[2px]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#090c12] via-[#090c12]/60 to-black/15" />
            <div className="relative z-10 flex min-h-[270px] flex-col justify-end">
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-white/60"><MapPin size={14} /> {artist.location}</p>
              <DialogTitle className="font-serif text-6xl font-normal tracking-[-.06em] sm:text-8xl">{artist.name}</DialogTitle>
              <DialogDescription className="mt-4 max-w-xl text-base leading-relaxed text-white/70">{artist.bio}</DialogDescription>
              <div className="mt-6 flex flex-wrap items-center gap-5 text-sm text-white/55">
                <span>{artist.discipline}</span><span>{artist.works} artworks</span><span>4.8 rating</span><span>{artist.followers} followers</span>
                <button onClick={onFollow} className={`ml-auto inline-flex items-center gap-2 rounded-full px-5 py-3 font-semibold transition ${followed ? "bg-white text-black" : "bg-cobalt text-white hover:bg-cobalt-light hover:text-black"}`}>
                  {followed ? <Check size={16} /> : <Plus size={16} />} {followed ? "Following" : "Follow"}
                </button>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 px-7 pb-9 pt-7 sm:px-10">
            <div className="mb-5 flex items-end justify-between"><h3 className="font-serif text-3xl">Featured works</h3><span className="text-xs uppercase tracking-[.12em] text-white/35">Selected collection</span></div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {works.map((work) => (
                <button key={work.id} onClick={() => onArtwork(work)} className="group text-left">
                  <div className="relative aspect-[4/3] overflow-hidden"><Image src={work.image} alt={work.title} fill className="object-cover transition duration-500 group-hover:scale-105" style={{ objectPosition: work.imagePosition ?? "center" }} /></div>
                  <p className="mt-3 font-serif text-xl">{work.title}</p><p className="mt-1 text-xs text-white/45">{work.year} · {work.medium}</p>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
