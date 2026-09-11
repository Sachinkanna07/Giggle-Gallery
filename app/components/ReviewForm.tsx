"use client";

import { useActionState } from "react";
import { submitReview } from "@/app/actions/marketplace";

export function ReviewForm({ orderItemId }: { orderItemId: string }) {
  const [state, action, pending] = useActionState(submitReview, { ok: false, message: "" });
  return <form action={action} className="mt-4 grid gap-3 border-t border-white/10 pt-4"><input type="hidden" name="orderItemId" value={orderItemId} /><label className="text-xs text-white/45">Rating<select name="rating" defaultValue="5" className="field mt-2"><option value="5">5 — Exceptional</option><option value="4">4 — Very good</option><option value="3">3 — Good</option><option value="2">2 — Fair</option><option value="1">1 — Poor</option></select></label><label className="text-xs text-white/45">Review<textarea name="body" minLength={10} required className="field mt-2" /></label><button disabled={pending} className="button-outline w-fit">{pending ? "Publishing…" : "Publish review"}</button>{state.message && <p role="status" className="text-xs text-white/50">{state.message}</p>}</form>;
}
