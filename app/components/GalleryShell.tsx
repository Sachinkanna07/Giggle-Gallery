import Link from "next/link";
import { and, count, eq, isNull } from "drizzle-orm";
import { auth } from "@/auth";
import { signOutUser } from "@/app/actions/auth";
import { getDb, hasDatabase } from "@/db";
import { notifications } from "@/db/schema";
import { auctionsEnabled } from "@/lib/auctions/feature-flag";

export async function GalleryShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const showAuctions = auctionsEnabled();
  const unread = session?.user?.id && hasDatabase() ? Number((await getDb().select({ value: count() }).from(notifications).where(and(eq(notifications.userId, session.user.id), isNull(notifications.readAt))))[0]?.value ?? 0) : 0;
  const workspace = session?.user?.role === "ADMIN"
    ? { href: "/admin", label: "Admin" }
    : session?.user?.role === "SELLER"
      ? { href: "/seller", label: "Seller studio" }
      : { href: "/sell", label: "Sell your art" };
  return (
    <div className="min-h-screen bg-ink text-ivory">
      <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b border-white/10 bg-ink/90 px-5 backdrop-blur-xl sm:px-10 lg:px-16">
        <Link href="/" className="font-serif text-xl tracking-[-0.04em] sm:text-2xl">GIGGLE <i className="font-light text-cobalt-light">GALLERY</i></Link>
        <nav className="flex items-center gap-3 text-sm text-white/60 sm:gap-6" aria-label="Account navigation">
          <Link href="/#gallery" className="hidden hover:text-white sm:inline">Gallery</Link>
          <Link href="/collections" className="hidden hover:text-white sm:inline">Collections</Link>
          {session?.user && <Link href="/following" className="hidden hover:text-white sm:inline">Following</Link>}
          {showAuctions && <Link href="/auctions" className="hidden hover:text-white sm:inline">Auctions</Link>}
          <Link href="/orders" className="hidden hover:text-white sm:inline">Orders</Link>
          {session?.user && <Link href="/notifications" className="hidden hover:text-white sm:inline" aria-label={`Notifications, ${unread} unread`}>Alerts{unread > 0 && <span className="ml-1 rounded-full bg-cobalt px-2 py-0.5 text-xs text-white">{unread}</span>}</Link>}
          <Link href={workspace.href} className="hidden hover:text-white sm:inline">{workspace.label}</Link>
          {session?.user ? <form action={signOutUser}><button className="rounded-full border border-white/15 px-4 py-2 hover:border-white/40">Sign out</button></form> : <Link href="/sign-in" className="rounded-full bg-ivory px-4 py-2 font-semibold text-ink">Sign in</Link>}
        </nav>
      </header>
      <nav className="sticky top-20 z-30 flex items-center gap-2 overflow-x-auto whitespace-nowrap border-b border-white/10 bg-ink/95 px-3 py-3 text-xs text-white/60 backdrop-blur-xl sm:hidden" aria-label="Mobile navigation">
        <Link href="/#gallery" className="px-2 py-1 hover:text-white">Gallery</Link>
        <Link href="/collections" className="px-2 py-1 hover:text-white">Saved</Link>
        {session?.user && <Link href="/following" className="px-2 py-1 hover:text-white">Following</Link>}
        {showAuctions && <Link href="/auctions" className="px-2 py-1 hover:text-white">Auctions</Link>}
        <Link href="/orders" className="px-2 py-1 hover:text-white">Orders</Link>
        {session?.user && <Link href="/notifications" className="px-2 py-1 hover:text-white">Alerts{unread > 0 ? ` (${unread})` : ""}</Link>}
        <Link href={workspace.href} className="px-2 py-1 hover:text-white">{workspace.label}</Link>
      </nav>
      {children}
    </div>
  );
}
