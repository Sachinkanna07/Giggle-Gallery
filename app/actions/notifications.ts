"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { notifications } from "@/db/schema";
import { requireUser } from "@/lib/authz";

export async function markNotificationRead(id: string) {
  try {
    const user = await requireUser();
    await getDb().update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, z.string().uuid().parse(id)), eq(notifications.userId, user.id), isNull(notifications.readAt)));
    revalidatePath("/notifications");
    return { ok: true as const };
  } catch { return { ok: false as const, error: "Unable to update this notification." }; }
}

export async function markAllNotificationsRead() {
  try {
    const user = await requireUser();
    await getDb().update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
    revalidatePath("/notifications");
    return { ok: true as const };
  } catch { return { ok: false as const, error: "Unable to update notifications." }; }
}
