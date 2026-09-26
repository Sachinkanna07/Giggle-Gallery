import { NextResponse } from "next/server";
import { auctionsEnabled } from "@/lib/auctions/feature-flag";
import { settleDueAuctions } from "@/lib/auctions/lifecycle";

/** Vercel Cron GET; Hobby invokes daily. Reads/actions also settle due auctions. */
export async function GET(request: Request) {
  if (!auctionsEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settled = await settleDueAuctions();
  return NextResponse.json({ settled: settled.length });
}
