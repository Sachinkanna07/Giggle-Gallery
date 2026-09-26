import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { GalleryShell } from "@/app/components/GalleryShell";
import { CheckoutForm } from "@/app/components/CheckoutForm";
import { getDb } from "@/db";
import { auctionPaymentAttempts, auctions, artworks } from "@/db/schema";
import { auctionsEnabled } from "@/lib/auctions/feature-flag";
import { settleDueAuctions } from "@/lib/auctions/lifecycle";
import { Sparkles, Gavel, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function WonAuctionPage() {
  const session = await auth();
  if (!session?.user || !auctionsEnabled()) return null;
  await settleDueAuctions();

  const rows = await getDb()
    .select({
      id: auctions.id,
      title: artworks.title,
      deadline: auctions.paymentDeadlineAt,
      bid: auctions.winningBidPaise,
    })
    .from(auctionPaymentAttempts)
    .innerJoin(auctions, eq(auctionPaymentAttempts.auctionId, auctions.id))
    .innerJoin(artworks, eq(auctions.artworkId, artworks.id))
    .where(
      and(
        eq(auctionPaymentAttempts.winnerId, session.user.id),
        eq(auctions.status, "PAYMENT_PENDING"),
        eq(auctionPaymentAttempts.status, "PENDING")
      )
    );

  return (
    <GalleryShell>
      <main className="section-shell py-16 lg:py-24 space-y-12">
        <Link
          href="/account"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft size={14} /> Back to Collector Dashboard
        </Link>

        <div className="max-w-3xl border-b border-border pb-8">
          <p className="eyebrow flex items-center gap-2">
            <Sparkles size={14} /> Auction Room Victory
          </p>
          <h1 className="section-title mt-4">
            Complete your <i>winning bid.</i>
          </h1>
          <p className="mt-3 text-sm text-text-secondary leading-relaxed">
            Congratulations! You were confirmed as the winning collector for the lots below. Finalize secure checkout within the 24-hour settlement window to authorize transfer and delivery.
          </p>
        </div>

        {rows.map((row) => (
          <section
            key={row.id}
            className="max-w-3xl rounded-2xl border border-border bg-surface p-6 sm:p-10 shadow-2xl"
          >
            <div className="border-b border-border pb-5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-accent-secondary">
                Won Auction Lot #{row.id.slice(0, 8)}
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl text-text-primary mt-1">{row.title}</h2>
              <p className="mt-2 text-sm text-text-secondary">
                Winning Bid: <strong className="text-text-primary">₹{(Number(row.bid ?? 0n) / 100).toLocaleString("en-IN")}</strong> · Settlement Deadline:{" "}
                <span className="text-amber-300 font-medium">
                  {row.deadline?.toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </p>
            </div>

            <div className="mt-8">
              <CheckoutForm auctionId={row.id} />
            </div>
          </section>
        ))}

        {!rows.length && (
          <div className="rounded-2xl border border-border p-16 text-center text-text-secondary max-w-2xl">
            <Gavel size={36} className="mx-auto mb-3 opacity-30 text-accent-secondary" />
            <p className="font-serif text-2xl text-text-primary">No pending auction payments</p>
            <p className="mt-1 text-xs">
              You currently have no payable auction wins requiring settlement.
            </p>
            <Link href="/auctions" className="button-light mt-6 text-xs !py-2.5 !px-5 inline-block">
              Explore Live Auctions
            </Link>
          </div>
        )}
      </main>
    </GalleryShell>
  );
}
