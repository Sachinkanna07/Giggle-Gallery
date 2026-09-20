import Link from "next/link";
import { auth } from "@/auth";
import { signOutUser } from "@/app/actions/auth";

export async function GalleryShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
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
          <Link href="/orders" className="hidden hover:text-white sm:inline">Orders</Link>
          <Link href={workspace.href} className="hover:text-white">{workspace.label}</Link>
          {session?.user ? <form action={signOutUser}><button className="rounded-full border border-white/15 px-4 py-2 hover:border-white/40">Sign out</button></form> : <Link href="/sign-in" className="rounded-full bg-ivory px-4 py-2 font-semibold text-ink">Sign in</Link>}
        </nav>
      </header>
      <nav className="sticky top-20 z-30 flex items-center justify-around border-b border-white/10 bg-ink/95 px-3 py-3 text-xs text-white/60 backdrop-blur-xl sm:hidden" aria-label="Mobile navigation">
        <Link href="/#gallery" className="px-2 py-1 hover:text-white">Gallery</Link>
        <Link href="/collections" className="px-2 py-1 hover:text-white">Saved</Link>
        <Link href="/orders" className="px-2 py-1 hover:text-white">Orders</Link>
        <Link href={workspace.href} className="px-2 py-1 hover:text-white">{workspace.label}</Link>
      </nav>
      {children}
    </div>
  );
}
