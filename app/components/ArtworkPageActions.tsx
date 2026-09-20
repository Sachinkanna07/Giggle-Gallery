"use client";

import { useState, useTransition } from "react";
import { Heart, Plus, Share2, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { setCartQuantity, toggleLike, toggleSave } from "@/app/actions/marketplace";

export function ArtworkPageActions({ artworkId, initialLiked, initialSaved, signedIn, persistenceReady, available }: { artworkId: string; initialLiked: boolean; initialSaved: boolean; signedIn: boolean; persistenceReady: boolean; available: boolean }) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [saved, setSaved] = useState(initialSaved);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  function guard() {
    if (!signedIn) {
      router.push("/sign-in");
      return false;
    }
    if (!persistenceReady) {
      router.push("/account?setup=database");
      return false;
    }
    return true;
  }

  function addToCart(goToCheckout = false) {
    if (!guard()) return;
    startTransition(async () => {
      const result = await setCartQuantity(artworkId, 1);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMessage("Added to your cart.");
      if (goToCheckout) router.push("/checkout");
    });
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setMessage("Link copied.");
    } catch {
      setMessage("Copying the link was unavailable. Please copy it from your browser.");
    }
  }

  return <div><div className="grid gap-3 sm:grid-cols-2"><button disabled={!available || pending} onClick={() => addToCart()} className="button-light disabled:opacity-40"><ShoppingBag size={17} /> {available ? "Add to cart" : "Unavailable"}</button><button disabled={!available || pending} onClick={() => addToCart(true)} className="button-outline disabled:opacity-40">Buy now</button></div><div className="mt-3 grid grid-cols-3 gap-2"><button aria-pressed={liked} disabled={pending} onClick={() => { if (!guard()) return; const previous = liked; setLiked(!liked); startTransition(async () => { const result = await toggleLike(artworkId); if (!result.ok) { setLiked(previous); setMessage(result.error); } }); }} className="button-outline !px-3 disabled:opacity-40"><Heart size={16} fill={liked ? "currentColor" : "none"} /> {liked ? "Liked" : "Like"}</button><button aria-pressed={saved} disabled={pending} onClick={() => { if (!guard()) return; const previous = saved; setSaved(!saved); startTransition(async () => { const result = await toggleSave(artworkId); if (!result.ok) { setSaved(previous); setMessage(result.error); } }); }} className="button-outline !px-3 disabled:opacity-40"><Plus size={16} /> {saved ? "Saved" : "Save"}</button><button onClick={share} className="button-outline !px-3"><Share2 size={16} /> Share</button></div><p role="status" className="mt-3 min-h-5 text-sm text-white/45">{message}</p></div>;
}
