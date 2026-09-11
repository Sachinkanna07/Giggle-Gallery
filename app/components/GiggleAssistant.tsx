"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";
import { ArrowUp, MessageCircle, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Artwork, artworks, formatPrice, scoreArtwork } from "../data";

type Props = { onView: (artwork: Artwork) => void };
const prompts = ["Show me peaceful blue art", "Dark surreal art under ₹5,000", "Something warm for my bedroom"];

export function GiggleAssistant({ onView }: Props) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("Show me peaceful blue art");
  const keywords = useMemo(() => submitted.toLowerCase().replace(/[₹,]/g, "").split(/\s+/).filter((word) => word.length > 3), [submitted]);
  const maxPrice = submitted.match(/(?:under|below)\s*₹?\s*([0-9,]+)/i)?.[1] ? Number(submitted.match(/(?:under|below)\s*₹?\s*([0-9,]+)/i)?.[1].replace(",", "")) : Infinity;
  const results = [...artworks].filter((artwork) => artwork.price <= maxPrice).sort((a, b) => scoreArtwork(b, keywords) - scoreArtwork(a, keywords)).slice(0, 3);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (query.trim()) { setSubmitted(query.trim()); setQuery(""); }
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="fixed bottom-20 right-4 z-30 flex items-center gap-2 rounded-full bg-cobalt px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_50px_rgba(39,87,255,.35)] transition hover:-translate-y-0.5 hover:bg-cobalt-light hover:text-ink sm:bottom-6 sm:right-6">
          <Sparkles size={17} /> Ask Giggle
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="mx-auto max-h-[88vh] w-full max-w-5xl overflow-y-auto rounded-t-[1.5rem] border-white/15 bg-[#090c12] p-0 text-ivory">
        <SheetHeader className="border-b border-white/10 p-6 text-left sm:p-8">
          <SheetTitle className="flex items-center gap-3 font-serif text-4xl font-normal"><MessageCircle size={25} className="text-cobalt-light" /> Ask Giggle</SheetTitle>
          <SheetDescription className="text-white/50">Tell me a feeling, room, style or budget. I’ll translate it into art.</SheetDescription>
        </SheetHeader>
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap gap-2">
            {prompts.map((prompt) => <button key={prompt} onClick={() => setSubmitted(prompt)} className="rounded-full border border-white/12 px-4 py-2 text-xs text-white/60 transition hover:border-cobalt-light hover:text-white">{prompt}</button>)}
          </div>
          <div className="mt-7 rounded-2xl border border-cobalt-light/20 bg-cobalt/[.08] p-5">
            <p className="text-sm leading-relaxed text-white/75"><Sparkles size={15} className="mr-2 inline text-cobalt-light" />I found {results.length} pieces for “{submitted}”. I prioritized mood, color, style and your budget.</p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {results.map((artwork) => (
              <button key={artwork.id} onClick={() => onView(artwork)} className="group flex gap-3 rounded-xl border border-white/10 p-3 text-left transition hover:border-white/30 hover:bg-white/[.03] sm:block">
                <div className="relative aspect-square w-20 shrink-0 overflow-hidden sm:w-full"><Image src={artwork.image} alt="" fill className="object-cover transition duration-500 group-hover:scale-105" style={{ objectPosition: artwork.imagePosition ?? "center" }} /></div>
                <div className="sm:pt-3"><h3 className="font-serif text-xl">{artwork.title}</h3><p className="mt-1 text-xs text-white/45">{artwork.artist} · {formatPrice(artwork.price)}</p></div>
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="mt-6 flex items-center gap-2 rounded-full border border-white/15 bg-black/25 p-2 pl-5 focus-within:border-cobalt-light">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try “minimal blue art under ₹4,000”" aria-label="Ask Giggle" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/30" />
            <button type="submit" aria-label="Send" className="grid size-10 place-items-center rounded-full bg-ivory text-ink transition hover:bg-cobalt-light"><ArrowUp size={17} /></button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
