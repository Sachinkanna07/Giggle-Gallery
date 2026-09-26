"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { placeAuctionBid } from "@/app/actions/auctions";

export type AuctionLiveState = { status: string; currentBidPaise: string; nextMinimumBidPaise: string; bidCount: number; startsAt: string; endsAt: string; deadlineAt: string | null; serverNow: string; viewerHasBid: boolean; viewerIsHighestBidder: boolean; viewerWon: boolean; recentBids: Array<{ amountPaise: string; createdAt: string }> };

function rupeesFromPaise(value: string) {
  const paise = BigInt(value);
  return `${paise / 100n}.${String(paise % 100n).padStart(2, "0")}`;
}

function paiseFromRupees(value: string) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return null;
  const [rupees, paise = ""] = value.trim().split(".");
  return BigInt(rupees) * 100n + BigInt(paise.padEnd(2, "0"));
}

export function AuctionLivePanel({ auctionId, initial, signedIn }: { auctionId: string; initial: AuctionLiveState; signedIn: boolean }) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [amount, setAmount] = useState(rupeesFromPaise(initial.nextMinimumBidPaise));
  const [clock, setClock] = useState(new Date(initial.serverNow).getTime());
  const [offset, setOffset] = useState(0);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let stopped = false;
    const refresh = async () => {
      if (document.hidden) return;
      try {
        const response = await fetch(`/api/auctions/${auctionId}/state`, { cache: "no-store" });
        if (!response.ok) return;
        const next = await response.json() as AuctionLiveState;
        if (stopped) return;
        setState(next);
        setAmount((previous) => (paiseFromRupees(previous) ?? 0n) < BigInt(next.nextMinimumBidPaise) ? rupeesFromPaise(next.nextMinimumBidPaise) : previous);
        setOffset(new Date(next.serverNow).getTime() - Date.now());
      } catch { /* Temporary network loss does not change server auction state. */ }
    };
    const interval = window.setInterval(refresh, 5_000);
    document.addEventListener("visibilitychange", refresh);
    return () => { stopped = true; window.clearInterval(interval); document.removeEventListener("visibilitychange", refresh); };
  }, [auctionId]);
  useEffect(() => { const interval = window.setInterval(() => setClock(Date.now()), 1_000); return () => window.clearInterval(interval); }, []);

  const end = state.status === "SCHEDULED" ? state.startsAt : state.status === "PAYMENT_PENDING" && state.deadlineAt ? state.deadlineAt : state.endsAt;
  const remaining = Math.max(0, new Date(end).getTime() - (clock + offset));
  const countdown = `${Math.floor(remaining / 3_600_000)}h ${Math.floor((remaining % 3_600_000) / 60_000)}m ${Math.floor((remaining % 60_000) / 1_000)}s`;
  const canBid = (state.status === "LIVE" || (state.status === "SCHEDULED" && new Date(state.startsAt).getTime() <= clock + offset)) && new Date(state.endsAt).getTime() > clock + offset;
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signedIn) { router.push("/sign-in"); return; }
    setMessage("");
    const submitted = paiseFromRupees(amount);
    if (submitted === null || submitted < BigInt(state.nextMinimumBidPaise)) { setMessage(`Enter at least ₹${rupeesFromPaise(state.nextMinimumBidPaise)}.`); return; }
    startTransition(async () => {
      const result = await placeAuctionBid(auctionId, submitted, crypto.randomUUID());
      setMessage(result.message);
      if (result.ok) {
        const response = await fetch(`/api/auctions/${auctionId}/state`, { cache: "no-store" });
        if (response.ok) setState(await response.json() as AuctionLiveState);
      }
    });
  }
  return <div className="mt-7" aria-live="polite">
    <div className="grid gap-4 sm:grid-cols-3"><div className="border border-white/10 p-5"><p className="text-xs text-white/45">{state.bidCount ? "Current highest" : "Opening bid"}</p><strong className="mt-2 block font-serif text-3xl font-normal">₹{(Number(state.currentBidPaise) / 100).toLocaleString("en-IN")}</strong></div><div className="border border-white/10 p-5"><p className="text-xs text-white/45">Accepted bids</p><strong className="mt-2 block font-serif text-3xl font-normal">{state.bidCount}</strong></div><div className="border border-white/10 p-5"><p className="text-xs text-white/45">{state.status === "SCHEDULED" ? "Starts in" : state.status === "PAYMENT_PENDING" ? "Payment window" : "Ends in"}</p><strong className="mt-2 block font-serif text-3xl font-normal">{countdown}</strong></div></div>
    <p className="mt-5 text-sm text-white/60">Status: {state.status.replaceAll("_", " ")}{state.viewerWon ? " · You won" : state.viewerIsHighestBidder ? " · You are the highest bidder" : state.viewerHasBid && canBid ? " · You have been outbid" : state.viewerHasBid && !canBid ? " · You did not win" : ""}</p>
    {canBid && <p className="mt-2 text-sm text-white/45">Next minimum bid: ₹{(Number(state.nextMinimumBidPaise) / 100).toLocaleString("en-IN")} · A valid bid in the final two minutes extends the auction by two minutes.</p>}
    {canBid && <form onSubmit={submit} className="mt-6 flex max-w-md flex-wrap items-end gap-3"><label className="min-w-[180px] flex-1 text-sm">Your bid in rupees<input className="field mt-2" type="text" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required /></label><button disabled={pending} className="button-light disabled:opacity-50">{pending ? "Submitting…" : "Place bid"}</button></form>}
    {state.viewerWon && state.status === "PAYMENT_PENDING" && <Link href="/auctions/won" className="button-light mt-6">Pay winning bid</Link>}
    <p role="status" className="mt-3 text-sm text-amber-200">{message}</p>
    <section className="mt-12"><h2 className="font-serif text-3xl">Recent bids</h2><ol className="mt-5 space-y-2 text-sm text-white/60">{state.recentBids.map((bid, index) => <li key={`${bid.createdAt}-${index}`}>Bid {state.bidCount - index} · ₹{(Number(bid.amountPaise) / 100).toLocaleString("en-IN")} · {new Date(bid.createdAt).toLocaleString("en-IN")}</li>)}</ol>{!state.bidCount && <p className="mt-3 text-sm text-white/45">No bids yet.</p>}</section>
  </div>;
}
