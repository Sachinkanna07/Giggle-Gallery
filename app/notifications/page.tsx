import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { GalleryShell } from "@/app/components/GalleryShell";
import { NotificationControls } from "@/app/components/NotificationControls";
import { getDb } from "@/db";
import { notifications } from "@/db/schema";
import { Bell, Gavel, Package, Heart, Sparkles, CheckCheck, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id || session.user.accountStatus !== "ACTIVE" || session.user.disabled) {
    return null;
  }

  const { filter = "all" } = await searchParams;

  const rows = await getDb()
    .select({
      id: notifications.id,
      title: notifications.title,
      message: notifications.message,
      data: notifications.data,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(eq(notifications.userId, session.user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(100);

  const unreadCount = rows.filter((item) => !item.readAt).length;

  // Filter categorization
  const filteredRows = rows.filter((item) => {
    if (filter === "all") return true;
    const title = item.title.toLowerCase();
    const msg = item.message.toLowerCase();
    if (filter === "auctions") {
      return (
        title.includes("auction") ||
        title.includes("bid") ||
        title.includes("outbid") ||
        msg.includes("auction") ||
        msg.includes("bid")
      );
    }
    if (filter === "orders") {
      return (
        title.includes("order") ||
        title.includes("delivery") ||
        title.includes("shipment") ||
        title.includes("payment") ||
        msg.includes("order")
      );
    }
    if (filter === "social") {
      return (
        title.includes("follow") ||
        title.includes("like") ||
        title.includes("artist") ||
        msg.includes("follow")
      );
    }
    if (filter === "seller") {
      return (
        title.includes("sale") ||
        title.includes("studio") ||
        title.includes("review") ||
        title.includes("application") ||
        msg.includes("payout")
      );
    }
    return true;
  });

  const getIconForNotification = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes("bid") || t.includes("auction")) return <Gavel size={18} className="text-accent-secondary" />;
    if (t.includes("order") || t.includes("delivery") || t.includes("shipped")) return <Package size={18} className="text-emerald-400" />;
    if (t.includes("like") || t.includes("favorite")) return <Heart size={18} className="text-rose-400" />;
    return <Sparkles size={18} className="text-accent-secondary" />;
  };

  const categories = [
    { id: "all", label: "All Alerts" },
    { id: "auctions", label: "Auctions & Bids" },
    { id: "orders", label: "Orders & Shipping" },
    { id: "social", label: "Follows & Activity" },
    { id: "seller", label: "Studio" },
  ];

  return (
    <GalleryShell>
      <main className="section-shell py-16 lg:py-24">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-border pb-8">
          <div>
            <p className="eyebrow flex items-center gap-2">
              <Bell size={14} /> Collector Notification Center
            </p>
            <h1 className="section-title mt-3">
              Alerts & <i>Updates.</i>
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              {unreadCount} unread notification{unreadCount === 1 ? "" : "s"} across your activities
            </p>
          </div>

          {unreadCount > 0 && (
            <div className="flex items-center gap-2">
              <NotificationControls />
            </div>
          )}
        </div>

        {/* Category Tabs */}
        <div className="mt-8 flex flex-wrap gap-2">
          {categories.map((cat) => {
            const isActive = filter === cat.id;
            return (
              <Link
                key={cat.id}
                href={`/notifications?filter=${cat.id}`}
                className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                  isActive
                    ? "bg-text-primary text-bg-primary shadow"
                    : "border border-border text-text-secondary hover:border-text-primary hover:text-text-primary"
                }`}
              >
                {cat.label}
              </Link>
            );
          })}
        </div>

        {/* Notifications List */}
        <div className="mt-10 space-y-4">
          {filteredRows.map((item) => {
            const candidate = item.data.url;
            const url =
              typeof candidate === "string" && candidate.startsWith("/") && !candidate.startsWith("//")
                ? candidate
                : null;
            const isUnread = !item.readAt;

            return (
              <article
                key={item.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-6 transition-all ${
                  isUnread
                    ? "border-accent/40 bg-surface-elevated shadow-lg ring-1 ring-accent/20"
                    : "border-border bg-surface hover:border-border/80"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="grid size-10 place-items-center rounded-full bg-surface-elevated border border-border shrink-0 mt-0.5">
                    {getIconForNotification(item.title)}
                  </div>

                  <div>
                    <div className="flex items-center gap-3">
                      <p className="font-serif text-xl sm:text-2xl text-text-primary">
                        {item.title}
                      </p>
                      {isUnread && (
                        <span className="size-2 rounded-full bg-accent animate-pulse" />
                      )}
                    </div>

                    <p className="mt-1.5 text-sm text-text-secondary max-w-2xl leading-relaxed">
                      {item.message}
                    </p>

                    <div className="mt-3 flex items-center gap-4 text-xs text-text-secondary/70">
                      <span>
                        {item.createdAt.toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {url && (
                        <Link
                          href={url}
                          className="flex items-center gap-1 font-semibold text-accent-secondary hover:underline"
                        >
                          View details <ArrowRight size={12} />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {isUnread && (
                  <div className="sm:self-center shrink-0">
                    <NotificationControls id={item.id} />
                  </div>
                )}
              </article>
            );
          })}

          {!filteredRows.length && (
            <div className="rounded-2xl border border-border p-16 text-center text-text-secondary">
              <CheckCheck size={36} className="mx-auto mb-3 opacity-30 text-accent-secondary" />
              <p className="font-serif text-2xl text-text-primary">All caught up</p>
              <p className="mt-1 text-xs">
                No alerts found in this category. You are entirely up to date.
              </p>
            </div>
          )}
        </div>
      </main>
    </GalleryShell>
  );
}
