import { auth } from "@/auth";
import { auctionsEnabled } from "@/lib/auctions/feature-flag";
import { getMarketplaceChromeData } from "@/lib/marketplace-chrome";
import { MarketplaceHeader } from "@/app/components/MarketplaceHeader";

export async function GalleryShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const showAuctions = auctionsEnabled();
  const chrome = await getMarketplaceChromeData(session?.user?.id);
  return (
    <div className="min-h-screen bg-ink pb-20 text-ivory md:pb-0">
      <MarketplaceHeader user={session?.user ?? null} viewer={chrome.viewer} unreadCount={chrome.unreadCount} latestNotifications={chrome.latestNotifications} showAuctions={showAuctions} />
      {children}
    </div>
  );
}
