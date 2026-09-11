import Link from "next/link";
import { auth } from "@/auth";
import { GalleryShell } from "@/app/components/GalleryShell";
import { getViewerState } from "@/lib/marketplace-data";

export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ setup?: string }> }) {
  const session = await auth();
  if (!session?.user) return null;
  const [viewer, params] = await Promise.all([getViewerState(session.user.id), searchParams]);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return <GalleryShell><main className="section-shell py-16 lg:py-24">{params.setup === "database" && <p className="mb-8 border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100">Connect the production database before account actions can be stored.</p>}<p className="eyebrow">Personal gallery</p><h1 className="section-title mt-6">{greeting}, <i>{session.user.name?.split(" ")[0] ?? "collector"}.</i></h1><div className="mt-12 grid gap-px bg-white/10 sm:grid-cols-3">{[["Liked artwork", viewer.likedIds.length], ["Saved artwork", viewer.savedIds.length], ["Following", viewer.followedArtistIds.length]].map(([label, value]) => <div key={String(label)} className="bg-ink p-8"><p className="text-sm text-white/40">{label}</p><p className="mt-3 font-serif text-5xl">{value}</p></div>)}</div><section className="mt-16 grid gap-6 lg:grid-cols-2"><div className="taste-panel"><p className="eyebrow">Your art personality</p><h2 className="mt-5 font-serif text-5xl">{viewer.preferences[0] ? `${viewer.preferences[0]} Explorer` : "Curious Collector"}</h2><div className="mt-7 flex flex-wrap gap-2">{viewer.preferences.length ? viewer.preferences.map((item) => <span key={item} className="rounded-full border border-white/15 px-4 py-2 text-sm">{item}</span>) : <p className="text-white/45">Complete Discover My Art to build your taste profile.</p>}</div><Link href="/#for-you" className="text-link mt-7">Refine my taste</Link></div><div className="border border-white/10 p-8"><p className="eyebrow">Account</p><h2 className="mt-5 font-serif text-4xl">{session.user.name}</h2><p className="mt-2 text-white/45">{session.user.email}</p><p className="mt-5 text-sm text-white/45">Role: {session.user.role}</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/orders" className="button-outline">My orders</Link><Link href="/sell" className="button-outline">Seller profile</Link></div></div></section></main></GalleryShell>;
}
