"use client";

import { useState, useTransition } from "react";
import { Heart, Plus, Share2, ShoppingBag } from "lucide-react";
import { setCartQuantity, toggleLike, toggleSave } from "@/app/actions/marketplace";

export function ArtworkPageActions({ artworkId, initialLiked, initialSaved, signedIn, available }: { artworkId: string; initialLiked: boolean; initialSaved: boolean; signedIn: boolean; available: boolean }) {
  const [liked, setLiked] = useState(initialLiked);
  const [saved, setSaved] = useState(initialSaved);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  function guard() { if (signedIn) return true; window.location.href = "/sign-in"; return false; }
  return <div><div className="grid gap-3 sm:grid-cols-2"><button disabled={!available || pending} onClick={() => { if (!guard()) return; startTransition(async () => { const result = await setCartQuantity(artworkId, 1); setMessage(result.ok ? "Added to your cart." : result.error); }); }} className="button-light disabled:opacity-40"><ShoppingBag size={17} /> {available ? "Add to cart" : "Unavailable"}</button><a href="/checkout" className={`button-outline ${available ? "" : "pointer-events-none opacity-40"}`}>Buy now</a></div><div className="mt-3 grid grid-cols-3 gap-2"><button onClick={() => { if (!guard()) return; const previous = liked; setLiked(!liked); startTransition(async () => { const result = await toggleLike(artworkId); if (!result.ok) { setLiked(previous); setMessage(result.error); } }); }} className="button-outline !px-3"><Heart size={16} fill={liked ? "currentColor" : "none"} /> Like</button><button onClick={() => { if (!guard()) return; const previous = saved; setSaved(!saved); startTransition(async () => { const result = await toggleSave(artworkId); if (!result.ok) { setSaved(previous); setMessage(result.error); } }); }} className="button-outline !px-3"><Plus size={16} /> Save</button><button onClick={async () => { await navigator.clipboard.writeText(window.location.href); setMessage("Link copied."); }} className="button-outline !px-3"><Share2 size={16} /> Share</button></div><p role="status" className="mt-3 min-h-5 text-sm text-white/45">{message}</p></div>;
}
