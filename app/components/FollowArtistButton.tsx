"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setArtistFollowing } from "@/app/actions/marketplace";

export function FollowArtistButton({ artistId, initialFollowing, initialCount, signedIn }: { artistId: string; initialFollowing: boolean; initialCount: number; signedIn: boolean }) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  function toggle() {
    if (!signedIn) { router.push("/sign-in"); return; }
    const desired = !following;
    setMessage("");
    startTransition(async () => {
      const result = await setArtistFollowing(artistId, desired);
      if (!result.ok) { setMessage(result.error); return; }
      setFollowing(Boolean(result.active));
      if (typeof result.count === "number") setCount(result.count);
      router.refresh();
    });
  }
  return <div className="flex flex-wrap items-center gap-4"><span aria-live="polite" className="text-sm text-white/65">Followers: {count}</span><button type="button" aria-pressed={following} disabled={pending} onClick={toggle} className="button-outline disabled:opacity-50">{following ? "Following" : "Follow"}</button><span role="status" className="text-sm text-amber-200">{message}</span></div>;
}
