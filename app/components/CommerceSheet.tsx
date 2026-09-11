"use client";

import Image from "next/image";
import Link from "next/link";
import { LockKeyhole, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Artwork, formatPrice } from "../data";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: Array<{ artwork: Artwork; quantity: number }>;
  onQuantity: (id: string, quantity: number) => void;
  onClear: () => void;
};

export function CommerceSheet({ open, onOpenChange, items, onQuantity, onClear }: Props) {
  const subtotal = items.reduce((sum, item) => sum + item.artwork.price * item.quantity, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col border-white/15 bg-[#090c12] p-0 text-ivory sm:max-w-xl" side="right">
        <SheetHeader className="border-b border-white/10 p-6 sm:p-8">
          <SheetTitle className="flex items-center gap-3 font-serif text-4xl font-normal"><ShoppingBag size={24} /> Your cart</SheetTitle>
          <SheetDescription className="text-white/45">Saved to your account and checked again before payment.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          {items.length ? (
            <div className="space-y-5">
              {items.map(({ artwork, quantity }) => (
                <div key={artwork.id} className="grid grid-cols-[78px_1fr_auto] gap-4 border-b border-white/10 pb-5">
                  <div className="relative aspect-[4/5] overflow-hidden"><Image src={artwork.image} alt="" fill sizes="78px" className="object-cover" style={{ objectPosition: artwork.imagePosition ?? "center" }} /></div>
                  <div><h3 className="font-serif text-xl">{artwork.title}</h3><p className="mt-1 text-xs text-white/45">{artwork.artist}<br />{artwork.type === "DIGITAL" ? "Digital edition" : "Insured physical delivery"}</p><p className="mt-3 text-sm font-semibold">{formatPrice(artwork.price * quantity)}</p><div className="mt-3 flex w-fit items-center rounded-full border border-white/15"><button onClick={() => onQuantity(artwork.id, quantity - 1)} aria-label={`Decrease ${artwork.title} quantity`} className="grid size-8 place-items-center"><Minus size={13} /></button><span className="min-w-8 text-center text-xs" aria-live="polite">{quantity}</span><button onClick={() => onQuantity(artwork.id, quantity + 1)} disabled={quantity >= (artwork.stock ?? 1)} aria-label={`Increase ${artwork.title} quantity`} className="grid size-8 place-items-center disabled:opacity-25"><Plus size={13} /></button></div></div>
                  <button onClick={() => onQuantity(artwork.id, 0)} aria-label={`Remove ${artwork.title}`} className="grid size-9 place-items-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid min-h-[55vh] place-items-center text-center"><div><ShoppingBag className="mx-auto text-white/25" size={38} /><h3 className="mt-5 font-serif text-3xl">Nothing here yet.</h3><p className="mt-2 text-sm text-white/45">Let’s find something beautiful.</p></div></div>
          )}
        </div>
        {items.length > 0 && (
          <div className="border-t border-white/10 bg-black/20 p-6 sm:p-8">
            <div className="mb-5 flex items-center justify-between"><span className="text-sm text-white/55">Subtotal</span><strong className="font-serif text-2xl font-normal">{formatPrice(subtotal)}</strong></div>
            <Link href="/checkout" onClick={() => onOpenChange(false)} className="flex w-full items-center justify-center gap-3 rounded-full bg-ivory px-5 py-4 text-sm font-semibold text-ink transition hover:bg-cobalt-light">Continue to secure checkout</Link>
            <div className="mt-3 flex items-center justify-between"><p className="flex items-center gap-2 text-xs text-white/35"><LockKeyhole size={13} /> Totals recalculated on the server</p><button onClick={onClear} className="text-xs text-white/45 underline underline-offset-4 hover:text-white">Clear cart</button></div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
