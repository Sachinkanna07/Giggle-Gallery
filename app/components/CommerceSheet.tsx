"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertCircle, LockKeyhole, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatPrice } from "../data";

export type CommerceSheetItem = {
  artworkId: string;
  title: string;
  artist: string;
  price: number;
  image: string;
  type: "DIGITAL" | "PHYSICAL";
  stock: number;
  quantity: number;
  isAvailable: boolean;
  unavailableReason?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommerceSheetItem[];
  onQuantity: (id: string, quantity: number) => void;
  onClear: () => void;
};

export function CommerceSheet({ open, onOpenChange, items, onQuantity, onClear }: Props) {
  const subtotal = items.reduce((sum, item) => sum + (item.isAvailable ? item.price * item.quantity : 0), 0);
  const hasUnavailable = items.some((item) => !item.isAvailable);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col border-white/15 bg-[#090c12] p-0 text-ivory sm:max-w-xl" side="right">
        <SheetHeader className="border-b border-white/10 p-6 sm:p-8">
          <SheetTitle className="flex items-center gap-3 font-serif text-4xl font-normal"><ShoppingBag size={24} /> Your cart</SheetTitle>
          <SheetDescription className="text-white/45">Saved to your account and checked again before payment.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          {hasUnavailable && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-400" />
              <div>
                <p className="font-semibold text-amber-300">Unavailable items in cart</p>
                <p className="mt-0.5 text-xs opacity-90">Some items can no longer be purchased. Please remove them before proceeding to checkout.</p>
              </div>
            </div>
          )}
          {items.length ? (
            <div className="space-y-5">
              {items.map((item) => (
                <div key={item.artworkId} className={`grid grid-cols-[78px_1fr_auto] gap-4 border-b pb-5 ${item.isAvailable ? "border-white/10" : "border-red-500/30 bg-red-950/20 p-3 rounded-xl"}`}>
                  <div className="relative aspect-[4/5] overflow-hidden rounded"><Image src={item.image} alt={`${item.title} by ${item.artist}`} fill sizes="78px" className="object-cover" /></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif text-xl">{item.title}</h3>
                      {!item.isAvailable && <span className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-300 uppercase">Unavailable</span>}
                    </div>
                    <p className="mt-1 text-xs text-white/45">{item.artist}<br />{item.type === "DIGITAL" ? "Digital edition" : "Insured physical delivery"}</p>
                    {!item.isAvailable && item.unavailableReason && <p className="mt-2 text-xs font-medium text-red-400">{item.unavailableReason}</p>}
                    <p className="mt-3 text-sm font-semibold">{formatPrice(item.price * item.quantity)}</p>
                    <div className="mt-3 flex w-fit items-center rounded-full border border-white/15">
                      <button onClick={() => onQuantity(item.artworkId, item.quantity - 1)} aria-label={`Decrease ${item.title} quantity`} className="grid size-8 place-items-center"><Minus size={13} /></button>
                      <span className="min-w-8 text-center text-xs" aria-live="polite">{item.quantity}</span>
                      <button onClick={() => onQuantity(item.artworkId, item.quantity + 1)} disabled={!item.isAvailable || item.quantity >= (item.stock ?? 1)} aria-label={`Increase ${item.title} quantity`} className="grid size-8 place-items-center disabled:opacity-25"><Plus size={13} /></button>
                    </div>
                  </div>
                  <button onClick={() => onQuantity(item.artworkId, 0)} aria-label={`Remove ${item.title}`} className="grid size-9 place-items-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white"><Trash2 size={16} /></button>
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
            {hasUnavailable ? (
              <button disabled className="flex w-full items-center justify-center gap-3 rounded-full bg-white/15 px-5 py-4 text-sm font-semibold text-white/40 cursor-not-allowed">Remove unavailable item(s) to checkout</button>
            ) : (
              <Link href="/checkout" onClick={() => onOpenChange(false)} className="flex w-full items-center justify-center gap-3 rounded-full bg-ivory px-5 py-4 text-sm font-semibold text-ink transition hover:bg-cobalt-light">Continue to secure checkout</Link>
            )}
            <div className="mt-3 flex items-center justify-between"><p className="flex items-center gap-2 text-xs text-white/35"><LockKeyhole size={13} /> Totals recalculated on the server</p><button onClick={onClear} className="text-xs text-white/45 underline underline-offset-4 hover:text-white">Clear cart</button></div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
