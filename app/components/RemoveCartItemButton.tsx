"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { setCartQuantity } from "@/app/actions/marketplace";

export function RemoveCartItemButton({ artworkId, title }: { artworkId: string; title: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await setCartQuantity(artworkId, 0);
        });
      }}
      className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
      aria-label={`Remove ${title} from cart`}
    >
      <Trash2 size={13} />
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}
