"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertCircle, Minus, Plus, ShoppingBag, Trash2, ArrowRight } from "lucide-react";
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
  const subtotal = items.reduce(
    (sum, item) => sum + (item.isAvailable ? item.price * item.quantity : 0),
    0
  );
  const hasUnavailable = items.some((item) => !item.isAvailable);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="flex w-full flex-col border-border bg-surface p-0 text-text-primary sm:max-w-lg shadow-2xl backdrop-blur-2xl"
        side="right"
      >
        <SheetHeader className="border-b border-border p-6 sm:p-8">
          <SheetTitle className="flex items-center gap-3 font-serif text-3xl sm:text-4xl font-normal text-text-primary">
            <ShoppingBag size={22} className="text-accent-secondary" /> Your Bag
          </SheetTitle>
          <SheetDescription className="text-xs text-text-secondary">
            Verified artwork editions reserved in your session and re-validated prior to checkout.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 space-y-4">
          {hasUnavailable && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-200 flex items-start gap-3">
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-400" />
              <div>
                <p className="font-semibold text-amber-300">Unavailable pieces in bag</p>
                <p className="mt-0.5 opacity-90">
                  Some pieces have sold out or become reserved. Please remove them before checkout.
                </p>
              </div>
            </div>
          )}

          {items.length ? (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.artworkId}
                  className={`grid grid-cols-[72px_1fr_auto] gap-4 rounded-xl border p-3.5 transition ${
                    item.isAvailable
                      ? "border-border/60 bg-surface-elevated/40"
                      : "border-rose-500/30 bg-rose-950/20"
                  }`}
                >
                  <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-bg-secondary">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="72px"
                      className="object-cover"
                    />
                  </div>

                  <div className="flex flex-col justify-between min-w-0">
                    <div>
                      <h4 className="font-serif text-base text-text-primary truncate">{item.title}</h4>
                      <p className="text-xs text-text-secondary mt-0.5 truncate">{item.artist}</p>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => onQuantity(item.artworkId, Math.max(0, item.quantity - 1))}
                        aria-label="Decrease quantity"
                        className="grid size-6 place-items-center rounded-full border border-border text-text-secondary hover:border-text-primary hover:text-text-primary transition"
                      >
                        <Minus size={11} />
                      </button>
                      <span className="text-xs font-mono font-medium">{item.quantity}</span>
                      <button
                        onClick={() => onQuantity(item.artworkId, Math.min(item.stock, item.quantity + 1))}
                        disabled={item.quantity >= item.stock}
                        aria-label="Increase quantity"
                        className="grid size-6 place-items-center rounded-full border border-border text-text-secondary hover:border-text-primary hover:text-text-primary transition disabled:opacity-30"
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between items-end">
                    <button
                      onClick={() => onQuantity(item.artworkId, 0)}
                      aria-label={`Remove ${item.title}`}
                      className="text-text-secondary hover:text-rose-400 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                    <span className="font-serif text-sm text-text-primary">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center text-text-secondary">
              <ShoppingBag size={32} className="mx-auto mb-3 opacity-30 text-accent-secondary" />
              <p className="font-serif text-2xl text-text-primary">Your bag is empty</p>
              <p className="mt-1 text-xs">Explore the gallery to acquire pieces.</p>
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-border p-6 sm:p-8 space-y-4 bg-surface-elevated/40">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-text-secondary">Subtotal</span>
              <strong className="font-serif text-2xl font-normal text-text-primary">
                {formatPrice(subtotal)}
              </strong>
            </div>

            <p className="text-[11px] text-text-secondary">
              Delivery insurance calculated at checkout.
            </p>

            <div className="flex gap-2">
              <Link
                href="/checkout"
                onClick={() => onOpenChange(false)}
                className="button-light flex-1 text-xs !py-3 font-semibold justify-center"
              >
                Proceed to Checkout <ArrowRight size={14} />
              </Link>
              <button
                onClick={onClear}
                className="rounded-full border border-border px-4 py-2 text-xs text-text-secondary hover:text-text-primary transition"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
