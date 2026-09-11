"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowLeft, Check, LockKeyhole, ShoppingBag, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Artwork, formatPrice } from "../data";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: Artwork[];
  onRemove: (id: string) => void;
  onClear: () => void;
};

export function CommerceSheet({ open, onOpenChange, items, onRemove, onClear }: Props) {
  const [step, setStep] = useState<"cart" | "checkout" | "success">("cart");
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const total = subtotal + (items.length ? 350 : 0);

  function close(openState: boolean) {
    onOpenChange(openState);
    if (!openState) window.setTimeout(() => setStep("cart"), 300);
  }

  function placeOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStep("success");
    onClear();
  }

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetContent className="w-full border-white/15 bg-[#090c12] p-0 text-ivory sm:max-w-xl" side="right">
        {step === "cart" && (
          <>
            <SheetHeader className="border-b border-white/10 p-6 sm:p-8">
              <SheetTitle className="flex items-center gap-3 font-serif text-4xl font-normal"><ShoppingBag size={24} /> Your cart</SheetTitle>
              <SheetDescription className="text-white/45">A small collection of very good decisions.</SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
              {items.length ? (
                <div className="space-y-5">
                  {items.map((item) => (
                    <div key={item.id} className="grid grid-cols-[78px_1fr_auto] gap-4 border-b border-white/10 pb-5">
                      <div className="relative aspect-[4/5] overflow-hidden"><Image src={item.image} alt="" fill className="object-cover" style={{ objectPosition: item.imagePosition ?? "center" }} /></div>
                      <div><h3 className="font-serif text-xl">{item.title}</h3><p className="mt-1 text-xs text-white/45">{item.artist}<br />Signed archival edition</p><p className="mt-3 text-sm font-semibold">{formatPrice(item.price)}</p></div>
                      <button onClick={() => onRemove(item.id)} aria-label={`Remove ${item.title}`} className="grid size-9 place-items-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white"><Trash2 size={16} /></button>
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
                <button onClick={() => setStep("checkout")} className="flex w-full items-center justify-center gap-3 rounded-full bg-ivory px-5 py-4 text-sm font-semibold text-ink transition hover:bg-cobalt-light">Continue to checkout</button>
                <p className="mt-3 flex items-center justify-center gap-2 text-xs text-white/35"><LockKeyhole size={13} /> Secure demo checkout · no real charge</p>
              </div>
            )}
          </>
        )}

        {step === "checkout" && (
          <form onSubmit={placeOrder} className="flex h-full flex-col">
            <SheetHeader className="border-b border-white/10 p-6 sm:p-8">
              <button type="button" onClick={() => setStep("cart")} className="mb-3 flex w-fit items-center gap-2 text-sm text-white/50 transition hover:text-white"><ArrowLeft size={16} /> Back to cart</button>
              <SheetTitle className="font-serif text-4xl font-normal">Checkout</SheetTitle>
              <SheetDescription className="text-white/45">Delivery and demo payment details.</SheetDescription>
            </SheetHeader>
            <div className="flex-1 space-y-7 overflow-y-auto p-6 sm:p-8">
              <fieldset className="space-y-3"><legend className="mb-3 text-xs font-semibold uppercase tracking-[.14em] text-cobalt-light">Contact</legend>
                <input required type="email" placeholder="Email address" aria-label="Email address" className="field" />
              </fieldset>
              <fieldset className="grid grid-cols-2 gap-3"><legend className="col-span-2 mb-1 text-xs font-semibold uppercase tracking-[.14em] text-cobalt-light">Delivery</legend>
                <input required placeholder="First name" aria-label="First name" className="field" /><input required placeholder="Last name" aria-label="Last name" className="field" />
                <input required placeholder="Address" aria-label="Address" className="field col-span-2" /><input required placeholder="City" aria-label="City" className="field" /><input required inputMode="numeric" pattern="[0-9]{6}" placeholder="PIN code" aria-label="PIN code" className="field" />
              </fieldset>
              <fieldset className="grid grid-cols-2 gap-3"><legend className="col-span-2 mb-1 text-xs font-semibold uppercase tracking-[.14em] text-cobalt-light">Demo payment</legend>
                <input required inputMode="numeric" minLength={12} placeholder="Card number" aria-label="Card number" className="field col-span-2" /><input required placeholder="MM / YY" aria-label="Expiry date" className="field" /><input required inputMode="numeric" minLength={3} placeholder="CVC" aria-label="CVC" className="field" />
              </fieldset>
              <div className="rounded-xl border border-white/10 p-4 text-sm"><div className="flex justify-between text-white/50"><span>Artwork</span><span>{formatPrice(subtotal)}</span></div><div className="mt-2 flex justify-between text-white/50"><span>Insured delivery</span><span>{formatPrice(350)}</span></div><div className="mt-4 flex justify-between border-t border-white/10 pt-4 text-base"><strong>Total</strong><strong>{formatPrice(total)}</strong></div></div>
            </div>
            <div className="border-t border-white/10 p-6 sm:p-8"><button type="submit" className="w-full rounded-full bg-ivory px-5 py-4 text-sm font-semibold text-ink transition hover:bg-cobalt-light">Place demo order · {formatPrice(total)}</button><p className="mt-3 text-center text-xs text-white/35">This is a simulated checkout. No payment will be processed.</p></div>
          </form>
        )}

        {step === "success" && (
          <div className="grid h-full place-items-center px-8 text-center"><div><div className="mx-auto grid size-24 place-items-center rounded-full bg-cobalt"><Check size={36} /></div><p className="mt-8 text-xs font-semibold uppercase tracking-[.15em] text-cobalt-light">Demo order GG–2609</p><SheetTitle className="mt-3 font-serif text-5xl font-normal tracking-[-.04em]">Something beautiful is yours.</SheetTitle><SheetDescription className="mx-auto mt-4 max-w-sm text-base leading-relaxed text-white/55">Your demo order is confirmed. No real payment was charged.</SheetDescription><button onClick={() => close(false)} className="mt-8 rounded-full bg-ivory px-7 py-4 text-sm font-semibold text-ink">Continue exploring</button></div></div>
        )}
      </SheetContent>
    </Sheet>
  );
}
