import "server-only";

import { and, count, desc, eq, isNull } from "drizzle-orm";
import { getDb, hasDatabase } from "@/db";
import { notifications } from "@/db/schema";
import { getViewerState } from "@/lib/marketplace-data";

export async function getMarketplaceChromeData(userId?: string) {
  const viewerPromise = getViewerState(userId);
  if (!userId || !hasDatabase()) {
    return { viewer: await viewerPromise, unreadCount: 0, latestNotifications: [] };
  }

  const [viewer, unreadRows, latestRows] = await Promise.all([
    viewerPromise,
    getDb().select({ value: count() }).from(notifications).where(and(eq(notifications.userId, userId), isNull(notifications.readAt))),
    getDb().select({
      id: notifications.id,
      title: notifications.title,
      message: notifications.message,
      data: notifications.data,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    }).from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(5),
  ]);

  return {
    viewer,
    unreadCount: Number(unreadRows[0]?.value ?? 0),
    latestNotifications: latestRows.map((item) => ({
      id: item.id,
      title: item.title,
      message: item.message,
      url: typeof item.data.url === "string" && item.data.url.startsWith("/") ? item.data.url : "/notifications",
      unread: !item.readAt,
      createdAt: item.createdAt.toISOString(),
    })),
  };
}
