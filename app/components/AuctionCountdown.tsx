"use client";

import { useEffect, useState } from "react";

export function AuctionCountdown({ target, serverNow, completeLabel = "Ended" }: { target: string; serverNow: string; completeLabel?: string }) {
  const [now, setNow] = useState(() => new Date(serverNow).getTime());
  useEffect(() => {
    const offset = new Date(serverNow).getTime() - Date.now();
    const interval = window.setInterval(() => setNow(Date.now() + offset), 1_000);
    return () => window.clearInterval(interval);
  }, [serverNow]);
  const remaining = Math.max(0, new Date(target).getTime() - now);
  if (!remaining) return <span>{completeLabel}</span>;
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1_000);
  return <span>{days ? `${days}d ` : ""}{hours}h {minutes}m {seconds}s</span>;
}
