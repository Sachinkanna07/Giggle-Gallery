"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markAllNotificationsRead, markNotificationRead } from "@/app/actions/notifications";

export function NotificationControls({ id }: { id?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  return <><button type="button" disabled={pending} onClick={() => startTransition(async () => { const result = id ? await markNotificationRead(id) : await markAllNotificationsRead(); if (!result.ok) setError(result.error); else router.refresh(); })} className="button-outline !px-4 !py-2 text-xs disabled:opacity-50">{pending ? "Saving…" : id ? "Mark read" : "Mark all read"}</button><span role="status" className="text-sm text-amber-200">{error}</span></>;
}
