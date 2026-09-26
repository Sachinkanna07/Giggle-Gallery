"use client";

import Link from "next/link";
import { useEffect, useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { placeAuctionBid } from "@/app/actions/auctions";
import { useDisplaySettings } from "@/lib/display-settings";
import {
  playBidAcceptedSound,
  playOutbidSound,
  playAuctionWonSound,
  playCountdownTickSound,
} from "@/lib/sound";
import {
  Gavel,
  Clock,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Volume2,
  VolumeX,
  TrendingUp,
} from "lucide-react";

export type AuctionLiveState = {
  status: string;
  currentBidPaise: string;
  nextMinimumBidPaise: string;
  bidCount: number;
  startsAt: string;
  endsAt: string;
  deadlineAt: string | null;
  serverNow: string;
  viewerHasBid: boolean;
  viewerIsHighestBidder: boolean;
  viewerWon: boolean;
  recentBids: Array<{ amountPaise: string; createdAt: string; bidderId?: string }>;
};

function rupeesFromPaise(value: string) {
  const paise = BigInt(value);
  return `${paise / 100n}.${String(paise % 100n).padStart(2, "0")}`;
}

function formatPaiseToINR(value: string) {
  const num = Number(value) / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

function paiseFromRupees(value: string) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return null;
  const [rupees, paise = ""] = value.trim().split(".");
  return BigInt(rupees) * 100n + BigInt(paise.padEnd(2, "0"));
}

// Deterministic collector masking (Phase 13: Never show private data!)
function maskBidder(index: number, isViewer: boolean) {
  if (isViewer) return "You (Collector)";
  const randomSuffix = ((index * 37 + 19) % 900 + 100).toString();
  return `Collector • ${randomSuffix}`;
}

export function AuctionLivePanel({
  auctionId,
  initial,
  signedIn,
}: {
  auctionId: string;
  initial: AuctionLiveState;
  signedIn: boolean;
}) {
  const router = useRouter();
  const { settings, updateAuctionSettings } = useDisplaySettings();
  const [state, setState] = useState(initial);
  const [amount, setAmount] = useState(rupeesFromPaise(initial.nextMinimumBidPaise));
  const [clock, setClock] = useState(new Date(initial.serverNow).getTime());
  const [offset, setOffset] = useState(0);
  const [message, setMessage] = useState("");
  const [isPulsing, setIsPulsing] = useState(false);
  const [pending, startTransition] = useTransition();

  const prevBidCountRef = useRef(initial.bidCount);
  const prevHighestBidderRef = useRef(initial.viewerIsHighestBidder);

  // Poll state every 4s and sync clocks
  useEffect(() => {
    let stopped = false;
    const refresh = async () => {
      if (document.hidden) return;
      try {
        const response = await fetch(`/api/auctions/${auctionId}/state`, { cache: "no-store" });
        if (!response.ok) return;
        const next = (await response.json()) as AuctionLiveState;
        if (stopped) return;

        // Check if new bid arrived
        if (next.bidCount > prevBidCountRef.current) {
          setIsPulsing(true);
          setTimeout(() => setIsPulsing(false), 1200);

          // Audio triggers (Phase 14)
          if (settings.auctions.soundEnabled) {
            if (next.viewerWon) {
              playAuctionWonSound(true);
            } else if (prevHighestBidderRef.current && !next.viewerIsHighestBidder) {
              playOutbidSound(true);
            }
          }
        }

        prevBidCountRef.current = next.bidCount;
        prevHighestBidderRef.current = next.viewerIsHighestBidder;

        setState(next);
        setAmount((prev) =>
          (paiseFromRupees(prev) ?? 0n) < BigInt(next.nextMinimumBidPaise)
            ? rupeesFromPaise(next.nextMinimumBidPaise)
            : prev
        );
        setOffset(new Date(next.serverNow).getTime() - Date.now());
      } catch {
        // network loss handling
      }
    };

    const interval = window.setInterval(refresh, 4_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      stopped = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [auctionId, settings.auctions.soundEnabled]);

  // Local second ticker
  useEffect(() => {
    const interval = window.setInterval(() => setClock(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  const end =
    state.status === "SCHEDULED"
      ? state.startsAt
      : state.status === "PAYMENT_PENDING" && state.deadlineAt
      ? state.deadlineAt
      : state.endsAt;

  const remainingMs = Math.max(0, new Date(end).getTime() - (clock + offset));
  const remainingSeconds = Math.floor(remainingMs / 1_000);
  const isUrgent = state.status === "LIVE" && remainingSeconds > 0 && remainingSeconds <= 120;

  // Tick sound in the final 10 seconds
  useEffect(() => {
    if (isUrgent && remainingSeconds <= 10 && remainingSeconds > 0 && settings.auctions.soundEnabled) {
      playCountdownTickSound(true);
    }
  }, [remainingSeconds, isUrgent, settings.auctions.soundEnabled]);

  const hours = Math.floor(remainingMs / 3_600_000);
  const minutes = Math.floor((remainingMs % 3_600_000) / 60_000);
  const seconds = Math.floor((remainingMs % 60_000) / 1_000);

  const countdownText = `${hours > 0 ? `${hours}h ` : ""}${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;

  const canBid =
    (state.status === "LIVE" ||
      (state.status === "SCHEDULED" && new Date(state.startsAt).getTime() <= clock + offset)) &&
    new Date(state.endsAt).getTime() > clock + offset;

  // Quick increment buttons (+1000, +2500, +5000)
  const handleQuickAdd = (incrementRupees: number) => {
    const currentPaise = paiseFromRupees(amount) ?? BigInt(state.nextMinimumBidPaise);
    const addedPaise = currentPaise + BigInt(incrementRupees * 100);
    setAmount(rupeesFromPaise(addedPaise.toString()));
  };

  const submitBid = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!signedIn) {
      router.push("/sign-in");
      return;
    }
    setMessage("");
    const submitted = paiseFromRupees(amount);
    if (submitted === null || submitted < BigInt(state.nextMinimumBidPaise)) {
      setMessage(`Minimum acceptable bid is ₹${rupeesFromPaise(state.nextMinimumBidPaise)}.`);
      return;
    }

    startTransition(async () => {
      const result = await placeAuctionBid(auctionId, submitted, crypto.randomUUID());
      setMessage(result.message);
      if (result.ok) {
        if (settings.auctions.soundEnabled) {
          playBidAcceptedSound(true);
        }
        const response = await fetch(`/api/auctions/${auctionId}/state`, { cache: "no-store" });
        if (response.ok) {
          const next = (await response.json()) as AuctionLiveState;
          setState(next);
          prevBidCountRef.current = next.bidCount;
        }
      }
    });
  };

  // Status Banner styling and message
  const renderStatusAlert = () => {
    if (state.viewerWon) {
      return (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="text-emerald-400" size={20} />
            <div>
              <p className="font-serif text-lg font-medium">You won this auction lot!</p>
              <p className="text-xs text-emerald-300/80">Complete payment to finalize transfer and shipping.</p>
            </div>
          </div>
          {state.status === "PAYMENT_PENDING" && (
            <Link href="/auctions/won" className="button-light text-xs !py-2 !px-4 whitespace-nowrap">
              Pay winning bid
            </Link>
          )}
        </div>
      );
    }

    if (state.viewerIsHighestBidder) {
      return (
        <div className="rounded-xl border border-accent/40 bg-accent/10 p-4 text-accent-secondary flex items-center gap-3">
          <span className="size-2.5 rounded-full bg-accent animate-ping" />
          <div>
            <p className="font-serif text-base font-medium text-text-primary">You are currently the highest bidder</p>
            <p className="text-xs text-text-secondary">We will alert you immediately if you are outbid.</p>
          </div>
        </div>
      );
    }

    if (state.viewerHasBid && canBid) {
      return (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-200 flex items-center gap-3">
          <AlertCircle size={20} className="text-amber-400 shrink-0" />
          <div>
            <p className="font-serif text-base font-medium text-amber-300">You have been outbid</p>
            <p className="text-xs text-amber-200/80">Place another bid above the minimum to regain the lead.</p>
          </div>
        </div>
      );
    }

    if (state.viewerHasBid && !canBid && !state.viewerWon) {
      return (
        <div className="rounded-xl border border-border bg-surface p-4 text-text-secondary text-sm">
          Auction concluded. Your bid was outpaced in the final room.
        </div>
      );
    }

    return null;
  };

  return (
    <div className="mt-8 space-y-6" aria-live="polite">
      {/* Top Status Banner */}
      {renderStatusAlert()}

      {/* Christie's / Artsy Live Metric Matrix */}
      <div className="grid gap-3 sm:grid-cols-3">
        {/* Highest Bid Card */}
        <div
          className={`rounded-2xl border border-border bg-surface p-5 transition-all ${
            isPulsing && settings.auctions.bidAnimationEnabled ? "animate-bid-pulse border-accent" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              {state.bidCount ? "Current Bid" : "Opening Bid"}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-accent-secondary font-medium">
              <TrendingUp size={12} /> Live
            </span>
          </div>
          <p className="mt-2 font-serif text-3xl sm:text-4xl font-normal text-text-primary">
            {formatPaiseToINR(state.currentBidPaise)}
          </p>
          <p className="mt-1 text-[11px] text-text-secondary">
            Min increment: {formatPaiseToINR("100000")}
          </p>
        </div>

        {/* Accepted Bids Card */}
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              Bids Placed
            </span>
            <Gavel size={14} className="text-text-secondary" />
          </div>
          <p className="mt-2 font-serif text-3xl sm:text-4xl font-normal text-text-primary">
            {state.bidCount}
          </p>
          <p className="mt-1 text-[11px] text-text-secondary">Active room participants</p>
        </div>

        {/* Countdown Timer Card */}
        <div
          className={`rounded-2xl border bg-surface p-5 transition-colors ${
            isUrgent && settings.auctions.countdownEmphasis
              ? "border-red-500/50 bg-red-950/20 text-red-200"
              : "border-border text-text-primary"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              {state.status === "SCHEDULED"
                ? "Starts In"
                : state.status === "PAYMENT_PENDING"
                ? "Payment Window"
                : "Time Remaining"}
            </span>
            <Clock size={14} className={isUrgent ? "text-red-400 animate-spin" : "text-text-secondary"} />
          </div>
          <p
            className={`mt-2 font-serif text-3xl sm:text-4xl font-normal ${
              isUrgent ? "text-red-400 font-semibold" : ""
            }`}
          >
            {countdownText}
          </p>
          <p className="mt-1 text-[11px] text-text-secondary">
            {isUrgent ? "Late bids extend by 2 mins" : "Server synced clock"}
          </p>
        </div>
      </div>

      {/* Audio Sound Toggle & Auction Transparency */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-surface-elevated/40 px-4 py-2.5 text-xs text-text-secondary">
        <span className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-accent-secondary" />
          Transparent server-verified Christie&apos;s 2-minute overtime extension rule
        </span>
        <button
          onClick={() =>
            updateAuctionSettings({ soundEnabled: !settings.auctions.soundEnabled })
          }
          className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition"
        >
          {settings.auctions.soundEnabled ? (
            <>
              <Volume2 size={14} className="text-accent-secondary" /> Audio On
            </>
          ) : (
            <>
              <VolumeX size={14} /> Audio Off
            </>
          )}
        </button>
      </div>

      {/* Bidding Controls Form */}
      {canBid && (
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-xl">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-serif text-2xl text-text-primary">Enter your bid</p>
            <p className="text-xs text-text-secondary">
              Next allowed minimum:{" "}
              <strong className="text-text-primary">{formatPaiseToINR(state.nextMinimumBidPaise)}</strong>
            </p>
          </div>

          <form onSubmit={submitBid} className="mt-5 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-serif text-lg text-text-secondary">
                  ₹
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={rupeesFromPaise(state.nextMinimumBidPaise)}
                  className="field pl-9 text-lg font-serif !py-3 font-medium"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={pending}
                className="button-light whitespace-nowrap text-sm !py-3 !px-8 shadow-xl disabled:opacity-50"
              >
                {pending ? "Submitting Bid..." : "Confirm & Place Bid"}
              </button>
            </div>

            {/* Quick Bid Increment Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-text-secondary">
              <span>Quick add:</span>
              <button
                type="button"
                onClick={() => handleQuickAdd(500)}
                className="rounded-full border border-border px-3 py-1 hover:border-accent-secondary hover:text-text-primary transition"
              >
                +₹500
              </button>
              <button
                type="button"
                onClick={() => handleQuickAdd(1000)}
                className="rounded-full border border-border px-3 py-1 hover:border-accent-secondary hover:text-text-primary transition"
              >
                +₹1,000
              </button>
              <button
                type="button"
                onClick={() => handleQuickAdd(2500)}
                className="rounded-full border border-border px-3 py-1 hover:border-accent-secondary hover:text-text-primary transition"
              >
                +₹2,500
              </button>
            </div>
          </form>

          {message && (
            <p role="status" className="mt-4 text-xs font-semibold text-accent-secondary">
              {message}
            </p>
          )}

          {/* Phase 27: Auction Cost Estimate Transparency */}
          <div className="mt-6 border-t border-border pt-4 text-xs text-text-secondary flex justify-between">
            <span>Winning Bid Subtotal + Free Insured Transit</span>
            <span className="font-semibold text-text-primary">
              Est. Total: ₹{amount ? Number(amount).toLocaleString("en-IN") : "0"}
            </span>
          </div>
        </div>
      )}

      {/* Phase 13: LIVE BID ACTIVITY FEED */}
      <section className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h2 className="font-serif text-2xl text-text-primary">Live Bid Activity</h2>
            <p className="text-xs text-text-secondary">Real-time authenticated bids stream</p>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-accent-secondary">
            <span className="size-2 rounded-full bg-accent animate-pulse" />
            Connected
          </span>
        </div>

        {state.recentBids.length > 0 ? (
          <ol className="mt-4 divide-y divide-border/60">
            {state.recentBids.map((bid, index) => {
              const isViewer = Boolean(state.viewerIsHighestBidder && index === 0);
              return (
                <li
                  key={`${bid.createdAt}-${index}`}
                  className="flex items-center justify-between py-3 transition hover:bg-white/[0.02] px-2 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-text-secondary/70 font-mono">
                      #{state.bidCount - index}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {maskBidder(index, isViewer)}
                      </p>
                      <p className="text-[11px] text-text-secondary">
                        {new Date(bid.createdAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <span className="font-serif text-lg font-medium text-text-primary">
                    {formatPaiseToINR(bid.amountPaise)}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="py-8 text-center text-text-secondary text-sm">
            No bids placed yet. Be the first collector to place the opening bid!
          </div>
        )}
      </section>
    </div>
  );
}
