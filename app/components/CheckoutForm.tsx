"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { beginAuctionCheckout, beginCheckout } from "@/app/actions/checkout";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, callback: (response: { error?: { description?: string } }) => void) => void };
  }
}

async function loadRazorpay() {
  if (window.Razorpay) return true;
  return new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function CheckoutForm({ auctionId }: { auctionId?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  function submit(formData: FormData) {
    setError("");
    startTransition(async () => {
      const ready = await loadRazorpay();
      if (!ready) { setError("Secure payment could not load. Check your connection and try again."); return; }
      const result = auctionId ? await beginAuctionCheckout(auctionId, Object.fromEntries(formData) as never) : await beginCheckout(Object.fromEntries(formData) as never);
      if (!result.ok) { setError(result.error); return; }
      const checkout = new window.Razorpay!({
        key: result.key,
        amount: result.amountPaise,
        currency: result.currency,
        name: "Giggle Gallery",
        description: auctionId ? "Test auction winner payment" : "Original artwork order",
        order_id: result.providerOrderId,
        prefill: result.buyer,
        theme: { color: "#2757ff" },
        handler: async (response: Record<string, string>) => {
          const verification = await fetch("/api/payments/razorpay/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...response, internalOrderId: result.internalOrderId }) });
          if (verification.ok) router.push(`/checkout/success?order=${result.internalOrderId}`);
          else setError("Payment was received but verification is still pending. Check My Orders shortly.");
        },
        modal: {
          ondismiss: () => setError("Payment window closed. Your purchase was not confirmed."),
        },
      });
      checkout.on("payment.failed", (response) => setError(response.error?.description ?? "Payment failed. No order was confirmed."));
      checkout.open();
    });
  }
  return <form action={submit} className="grid gap-5 sm:grid-cols-2"><label className="form-label sm:col-span-2">Full name<input name="fullName" required className="field mt-2" /></label><label className="form-label">Phone<input name="phone" type="tel" required className="field mt-2" /></label><label className="form-label">Country<select name="country" defaultValue="IN" className="field mt-2"><option value="IN">India</option></select></label><label className="form-label sm:col-span-2">Address<input name="line1" required className="field mt-2" /></label><label className="form-label sm:col-span-2">Apartment, suite, landmark<input name="line2" className="field mt-2" /></label><label className="form-label">City<input name="city" required className="field mt-2" /></label><label className="form-label">State<input name="state" required className="field mt-2" /></label><label className="form-label">PIN code<input name="postalCode" required inputMode="numeric" className="field mt-2" /></label><div className="self-end"><button disabled={pending} className="button-light w-full disabled:opacity-50">{pending ? "Opening secure payment…" : "Continue to payment"}</button></div><p role="alert" className="text-sm text-red-200 sm:col-span-2">{error}</p><p className="text-xs leading-relaxed text-white/35 sm:col-span-2">Opening Razorpay creates a pending order. Closing it without paying does not confirm a purchase. Payment details stay with Razorpay, and Giggle Gallery confirms the order only after signature verification.</p></form>;
}
