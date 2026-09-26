import { and, count, eq, isNull } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb, hasDatabase } from "@/db";
import { notifications } from "@/db/schema";
import { auctionsEnabled } from "@/lib/auctions/feature-flag";
import { CinematicHeader } from "./CinematicHeader";

export async function GalleryShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const showAuctions = auctionsEnabled();
  const unread =
    session?.user?.id && hasDatabase()
      ? Number(
          (
            await getDb()
              .select({ value: count() })
              .from(notifications)
              .where(
                and(
                  eq(notifications.userId, session.user.id),
                  isNull(notifications.readAt)
                )
              )
          )[0]?.value ?? 0
        )
      : 0;

  const workspace =
    session?.user?.role === "ADMIN"
      ? { href: "/admin", label: "Admin" }
      : session?.user?.role === "SELLER"
      ? { href: "/seller", label: "Seller studio" }
      : { href: "/sell", label: "Sell art" };

  return (
    <div className="relative min-h-screen bg-bg-primary text-text-primary pb-20 sm:pb-0">
      <CinematicHeader
        user={session?.user ?? null}
        showAuctions={showAuctions}
        unread={unread}
        workspace={workspace}
      />
      {children}
    </div>
  );
}
