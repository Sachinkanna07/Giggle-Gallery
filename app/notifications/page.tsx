import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { GalleryShell } from "@/app/components/GalleryShell";
import { NotificationControls } from "@/app/components/NotificationControls";
import { getDb } from "@/db";
import { notifications } from "@/db/schema";

export const dynamic = "force-dynamic";
export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.accountStatus !== "ACTIVE" || session.user.disabled) return null;
  const rows = await getDb().select({ id: notifications.id, title: notifications.title, message: notifications.message, data: notifications.data, readAt: notifications.readAt, createdAt: notifications.createdAt }).from(notifications).where(eq(notifications.userId, session.user.id)).orderBy(desc(notifications.createdAt)).limit(100);
  const unread = rows.filter((item) => !item.readAt).length;
  return <GalleryShell><main className="section-shell py-16"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow">Your account</p><h1 className="section-title mt-5">Notifications.</h1><p className="mt-3 text-white/50">{unread} unread in your latest 100 messages</p></div>{unread > 0 && <NotificationControls />}</div><div className="mt-10 space-y-3">{rows.map((item) => { const candidate = item.data.url; const url = typeof candidate === "string" && candidate.startsWith("/") && !candidate.startsWith("//") ? candidate : null; return <article key={item.id} className={`flex flex-wrap items-start justify-between gap-4 border p-5 ${item.readAt ? "border-white/10" : "border-cobalt-light/50"}`}><div><p className="text-xs text-white/40">{item.createdAt.toLocaleString("en-IN")} · {item.readAt ? "Read" : "Unread"}</p><h2 className="mt-2 font-serif text-2xl">{item.title}</h2><p className="mt-2 text-sm text-white/60">{item.message}</p>{url && <Link href={url} className="mt-3 inline-block text-sm underline underline-offset-4">View details</Link>}</div>{!item.readAt && <NotificationControls id={item.id} />}</article>; })}{!rows.length && <p className="border border-white/10 p-10 text-white/45">No notifications yet.</p>}</div></main></GalleryShell>;
}
