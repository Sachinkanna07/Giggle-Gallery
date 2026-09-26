"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";
import { ArrowUp, MessageCircle, Sparkles } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Artwork, formatPrice, scoreArtwork } from "../data";

type Props = { artworks: Artwork[]; onView: (artwork: Artwork) => void };
const prompts = [
  "Show me peaceful blue art",
  "Dark surreal art under ₹5,000",
  "Something warm for my bedroom",
  "Bold geometric abstractions",
];

export function GiggleAssistant({ artworks, onView }: Props) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("Show me peaceful blue art");
  const [open, setOpen] = useState(false);

  const keywords = useMemo(
    () =>
      submitted
        .toLowerCase()
        .replace(/[₹,]/g, "")
        .split(/\s+/)
        .filter((word) => word.length > 3),
    [submitted]
  );

  const maxPrice = submitted.match(/(?:under|below)\s*₹?\s*([0-9,]+)/i)?.[1]
    ? Number(submitted.match(/(?:under|below)\s*₹?\s*([0-9,]+)/i)?.[1].replace(",", ""))
    : Infinity;

  const results = [...artworks]
    .filter((artwork) => artwork.price <= maxPrice)
    .sort((a, b) => scoreArtwork(b, keywords) - scoreArtwork(a, keywords))
    .slice(0, 3);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (query.trim()) {
      setSubmitted(query.trim());
      setQuery("");
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          aria-label="Open Giggle Assistant"
          className="fixed bottom-20 right-4 z-30 flex items-center gap-2 rounded-full bg-accent px-4 py-3 text-xs font-semibold text-white shadow-xl shadow-accent/25 transition hover:scale-105 hover:bg-accent-secondary hover:text-black active:scale-95 sm:bottom-6 sm:right-6"
        >
          <Sparkles size={15} />
          <span>Ask Giggle</span>
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl border-border bg-surface p-0 text-text-primary shadow-2xl backdrop-blur-2xl"
      >
        <SheetHeader className="border-b border-border p-6 text-left sm:p-8">
          <SheetTitle className="flex items-center gap-3 font-serif text-3xl sm:text-4xl font-normal text-text-primary">
            <MessageCircle size={22} className="text-accent-secondary" /> AI Curator Dialogue
          </SheetTitle>
          <SheetDescription className="text-xs text-text-secondary">
            Describe a mood, architectural aesthetic, tone, or budget. The curator translates language into fine art.
          </SheetDescription>
        </SheetHeader>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap gap-2">
            {prompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => setSubmitted(prompt)}
                className="rounded-full border border-border bg-surface-elevated/40 px-3.5 py-1.5 text-xs text-text-secondary transition hover:border-accent-secondary hover:text-text-primary"
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4 sm:p-5">
            <p className="text-sm leading-relaxed text-text-secondary">
              <Sparkles size={14} className="mr-2 inline text-accent-secondary" />
              Found {results.length} pieces for “<span className="text-text-primary font-medium">{submitted}</span>”. Matched across mood, tonal palette, and edition value.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {results.map((artwork) => (
              <button
                key={artwork.id}
                onClick={() => {
                  onView(artwork);
                  setOpen(false);
                }}
                className="group flex gap-3 rounded-xl border border-border bg-surface-elevated/40 p-3 text-left transition hover:border-accent-secondary sm:block"
              >
                <div className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-lg bg-bg-secondary sm:w-full">
                  <Image
                    src={artwork.image}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 80px, 260px"
                    className="object-cover transition duration-500 group-hover:scale-105"
                    style={{ objectPosition: artwork.imagePosition ?? "center" }}
                  />
                </div>
                <div className="sm:pt-3">
                  <h3 className="font-serif text-lg text-text-primary truncate">{artwork.title}</h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {artwork.artist} · {formatPrice(artwork.price)}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <form
            onSubmit={submit}
            className="flex items-center gap-2 rounded-full border border-border bg-surface-elevated/60 p-2 pl-5 focus-within:border-accent-secondary"
          >
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. “minimalist meditative blue paintings under ₹5,000”"
              aria-label="Ask Giggle"
              className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary/50"
            />
            <button
              type="submit"
              aria-label="Send"
              className="grid size-9 place-items-center rounded-full bg-text-primary text-bg-primary transition hover:bg-accent-secondary"
            >
              <ArrowUp size={16} />
            </button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
