"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelAuction, createAuctionDraft, scheduleAuction } from "@/app/actions/auctions";

export function AuctionDraftForm({ eligible }: { eligible: Array<{ id: string; title: string }> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  function submit(formData: FormData) {
    setMessage("");
    const toPaise = (value: FormDataEntryValue | null) => {
      const text = String(value ?? "").trim();
      if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
      const [rupees, paise = ""] = text.split(".");
      return BigInt(rupees) * 100n + BigInt(paise.padEnd(2, "0"));
    };
    const openingBidPaise = toPaise(formData.get("openingBidRupees"));
    const minimumIncrementPaise = toPaise(formData.get("minimumIncrementRupees"));
    if (!openingBidPaise || !minimumIncrementPaise) { setMessage("Enter positive rupee amounts with no more than two decimal places."); return; }
    startTransition(async () => {
      const result = await createAuctionDraft({ artworkId: String(formData.get("artworkId") ?? ""), openingBidPaise, minimumIncrementPaise, startsAt: new Date(String(formData.get("startsAt") ?? "")), endsAt: new Date(String(formData.get("endsAt") ?? "")) });
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  }
  return <form action={submit} className="mt-10 grid max-w-2xl gap-4 border border-white/10 p-6"><label className="text-sm">Artwork<select name="artworkId" required className="field mt-2"><option value="">Choose published single-stock artwork</option>{eligible.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="text-sm">Opening bid in rupees<input className="field mt-2" name="openingBidRupees" type="number" min="1" step="0.01" required /></label><label className="text-sm">Minimum increment in rupees<input className="field mt-2" name="minimumIncrementRupees" type="number" min="1" step="0.01" required /></label><label className="text-sm">Starts<input className="field mt-2" name="startsAt" type="datetime-local" required /></label><label className="text-sm">Ends<input className="field mt-2" name="endsAt" type="datetime-local" required /></label><button disabled={pending} className="button-light disabled:opacity-50">{pending ? "Saving…" : "Create draft for admin review"}</button><p role="status" className="text-sm text-amber-200">{message}</p></form>;
}

export function ScheduleAuctionButton({ auctionId }: { auctionId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return <div><button type="button" disabled={pending} onClick={() => startTransition(async () => { const result = await scheduleAuction(auctionId); setMessage(result.message); if (result.ok) router.refresh(); })} className="button-light disabled:opacity-50">{pending ? "Checking…" : "Schedule and reserve"}</button><p role="status" className="mt-2 max-w-xs text-sm text-amber-200">{message}</p></div>;
}

export function CancelAuctionButton({ auctionId }: { auctionId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return <div><button type="button" disabled={pending} onClick={() => startTransition(async () => { const result = await cancelAuction(auctionId); setMessage(result.message); if (result.ok) router.refresh(); })} className="rounded-full border border-red-300/25 px-4 py-2 text-sm text-red-100 disabled:opacity-50">{pending ? "Cancelling…" : "Cancel safely"}</button><p role="status" className="mt-2 max-w-xs text-sm text-amber-200">{message}</p></div>;
}
