import { NextResponse } from "next/server";
import { auctionsEnabled } from "@/lib/auctions/feature-flag";
import { settleDueAuctions } from "@/lib/auctions/lifecycle";

/** Protected scheduler hook. Configure an external scheduler only after feature-flag QA. */
export async function POST(request: Request) {
  if (!auctionsEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const secret = process.env.AUCTION_CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settled = await settleDueAuctions();
  return NextResponse.json({ settled: settled.length });
}
