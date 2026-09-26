"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Bell, Heart, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { clearCart as clearCartAction, setCartQuantity } from "@/app/actions/marketplace";
import { signOutUser } from "@/app/actions/auth";
import type { CartItemDetail, ViewerState } from "@/lib/marketplace-data";
import { CommerceSheet } from "@/app/components/CommerceSheet";

type HeaderUser = { name?: string | null; image?: string | null; role: "BUYER" | "SELLER" | "ADMIN" } | null;
type Notice = { id: string; title: string; message: string; url: string; unread: boolean; createdAt: string };
type SearchResult = { id: string; href: string; title: string; subtitle: string; image?: string };
type SearchPayload = { artworks: SearchResult[]; artists: SearchResult[]; auctions: SearchResult[] };

export type MarketplaceHeaderProps = {
  user: HeaderUser;
  viewer: ViewerState;
  unreadCount: number;
  latestNotifications: Notice[];
  showAuctions: boolean;
};

function GlobalSearch({ recentSearches }: { recentSearches: string[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchPayload>({ artworks: [], artists: [], auctions: [] });

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    const focus = () => { inputRef.current?.focus(); setOpen(true); };
    window.addEventListener("keydown", shortcut);
    window.addEventListener("giggle:focus-search", focus);
    return () => { window.removeEventListener("keydown", shortcut); window.removeEventListener("giggle:focus-search", focus); };
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (response.ok) setResults(await response.json() as SearchPayload);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setResults({ artworks: [], artists: [], auctions: [] });
      }
    }, 220);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [query]);

  const groups = [["Artworks", results.artworks], ["Artists", results.artists], ["Auctions", results.auctions]] as const;
  const hasResults = groups.some(([, items]) => items.length > 0);
  return (
    <div className="relative w-full">
      <label className="group flex h-11 items-center gap-3 rounded-full border border-white/14 bg-white/[.055] px-4 transition focus-within:border-[#5577FF] focus-within:bg-[#111722]">
        <Search size={17} className="shrink-0 text-white/45" />
        <span className="sr-only">Search Giggle Gallery</span>
        <input ref={inputRef} value={query} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} placeholder="Search artworks, artists, auctions..." className="min-w-0 flex-1 bg-transparent text-sm text-[#F2EEE5] outline-none placeholder:text-white/35" />
        <span className="hidden rounded border border-white/15 px-2 py-0.5 text-[11px] text-white/35 xl:inline">⌘ K</span>
        {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="text-white/45 hover:text-white"><X size={15} /></button>}
      </label>
      {open && (
        <div className="absolute inset-x-0 top-[calc(100%+.6rem)] z-50 max-h-[70vh] overflow-y-auto rounded-2xl border border-white/12 bg-[#0C1018]/98 p-3 shadow-2xl shadow-black/60 backdrop-blur-xl" onMouseLeave={() => query.length < 2 && setOpen(false)}>
          {query.trim().length < 2 ? (
            <div className="p-2"><p className="text-xs font-semibold uppercase tracking-[.14em] text-white/35">Recent searches</p><div className="mt-3 flex flex-wrap gap-2">{recentSearches.length ? recentSearches.map((item) => <button key={item} type="button" onClick={() => setQuery(item)} className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/65 hover:border-white/30 hover:text-white">{item}</button>) : <span className="text-sm text-white/40">Search across the gallery, artists and live auctions.</span>}</div></div>
          ) : hasResults ? groups.map(([label, items]) => items.length > 0 && <section key={label} className="p-2"><p className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-white/35">{label}</p>{items.map((item) => <Link key={`${label}-${item.id}`} href={item.href} onClick={() => setOpen(false)} className="flex items-center justify-between gap-4 rounded-xl px-3 py-3 hover:bg-white/[.06]"><span><span className="block text-sm font-semibold text-[#F2EEE5]">{item.title}</span><span className="mt-0.5 block text-xs text-white/40">{item.subtitle}</span></span><span aria-hidden="true" className="text-white/30">↗</span></Link>)}</section>) : <p className="p-5 text-sm text-white/45">No matching artwork, artist or auction.</p>}
        </div>
      )}
    </div>
  );
}

export function MarketplaceHeader({ user, viewer, unreadCount, latestNotifications, showAuctions }: MarketplaceHeaderProps) {
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<CartItemDetail[]>(viewer.cart);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const update = (event: Event) => setCart((event as CustomEvent<CartItemDetail[]>).detail);
    const open = () => setCartOpen(true);
    window.addEventListener("giggle:cart-updated", update);
    window.addEventListener("giggle:cart-open", open);
    return () => { window.removeEventListener("giggle:cart-updated", update); window.removeEventListener("giggle:cart-open", open); };
  }, []);

  function updateCart(id: string, quantity: number) {
    const before = cart;
    const next = quantity === 0 ? cart.filter((item) => item.artworkId !== id) : cart.map((item) => item.artworkId === id ? { ...item, quantity } : item);
    setCart(next);
    startTransition(async () => { const result = await setCartQuantity(id, quantity); if (!result.ok) setCart(before); });
  }
  function clearCart() {
    const before = cart;
    setCart([]);
    startTransition(async () => { const result = await clearCartAction(); if (!result.ok) setCart(before); });
  }

  const firstName = user?.name?.trim().split(/\s+/)[0] ?? "Collector";
  const seller = user?.role === "SELLER" || user?.role === "ADMIN";
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#06080D]/95 backdrop-blur-2xl">
        <div className="mx-auto flex min-h-16 max-w-[1680px] items-center gap-3 px-4 sm:px-6 lg:px-10">
          <Link href="/" className="shrink-0 font-serif text-lg tracking-[-.045em] text-[#F2EEE5] sm:text-xl">GIGGLE <i className="font-normal text-[#C6A66A]">GALLERY</i></Link>
          <div className="mx-auto hidden max-w-2xl flex-1 md:block"><GlobalSearch recentSearches={viewer.recentSearches} /></div>
          <nav className="ml-auto flex shrink-0 items-center gap-1" aria-label="Marketplace navigation">
            <Link href="/#gallery" className="hidden rounded-full px-3 py-2 text-sm text-white/60 hover:bg-white/[.06] hover:text-white lg:block">Discover</Link>
            {showAuctions && <Link href="/auctions" className="hidden rounded-full px-3 py-2 text-sm text-white/60 hover:bg-white/[.06] hover:text-white lg:block">Auctions</Link>}
            <Link href="/favorites" aria-label={`Favorites, ${viewer.savedIds.length} saved`} className="header-icon hidden sm:grid"><Heart size={18} />{viewer.savedIds.length > 0 && <span className="count-badge">{viewer.savedIds.length}</span>}</Link>
            <button type="button" onClick={() => setCartOpen(true)} aria-label={`Cart, ${cart.length} items`} className="header-icon"><ShoppingBag size={18} />{cart.length > 0 && <span className="count-badge">{cart.length}</span>}</button>
            {user && <details className="group relative hidden sm:block"><summary className="header-icon list-none" aria-label={`Notifications, ${unreadCount} unread`}><Bell size={18} />{unreadCount > 0 && <span className="count-badge">{unreadCount}</span>}</summary><div className="absolute right-0 mt-3 w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-white/12 bg-[#0C1018] p-3 shadow-2xl"><div className="flex items-center justify-between px-3 py-2"><strong className="text-sm">Notifications</strong><Link href="/notifications" className="text-xs text-[#8CA4FF]">View all</Link></div>{latestNotifications.length ? latestNotifications.map((item) => <Link key={item.id} href={item.url} className="block rounded-xl px-3 py-3 hover:bg-white/[.05]"><span className="flex items-start gap-2"><span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${item.unread ? "bg-[#5577FF]" : "bg-transparent"}`} /><span><span className="block text-sm font-semibold">{item.title}</span><span className="mt-1 block text-xs leading-relaxed text-white/45">{item.message}</span></span></span></Link>) : <p className="px-3 py-6 text-sm text-white/40">No notifications yet.</p>}</div></details>}
            <details className="group relative"><summary className="flex list-none items-center gap-2 rounded-full border border-white/12 px-2.5 py-2 text-left hover:border-white/25 hover:bg-white/[.04]"><span className="grid size-7 place-items-center overflow-hidden rounded-full bg-[#111722] text-[#C6A66A]"><UserRound size={16} /></span><span className="hidden min-w-0 sm:block"><span className="block max-w-28 truncate text-[11px] text-white/40">{user ? `Hello, ${firstName}` : "Sign in"}</span><span className="block text-xs font-semibold">Account</span></span><Menu size={15} className="text-white/45" /></summary><div className="absolute right-0 mt-3 max-h-[75vh] w-[min(42rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-white/12 bg-[#0C1018] p-5 shadow-2xl shadow-black/60"><div className="grid gap-6 sm:grid-cols-2">{user ? <><MenuSection title="My account" items={[["Account home","/account"],["Profile & identity","/account#identity"],["Orders","/orders"],["Auction activity","/account#auctions"],["Favorites","/favorites"],["Collections","/collections"],["Following","/following"],["Notifications","/notifications"]]} /><MenuSection title="Selling" items={seller ? [["Seller dashboard","/seller"],["My artworks","/seller#artworks"],["Upload artwork","/seller/artworks/new"],["Seller orders","/seller#orders"],["My auctions","/seller/auctions"]] : [["Become a seller","/sell"]]} />{user.role === "ADMIN" && <MenuSection title="Admin" items={[["Admin dashboard","/admin"],["Seller applications","/admin#seller-applications"],["Artwork review","/admin#artwork-review"],["Auction management","/admin#auctions"],["Order oversight","/admin#orders"]]} />}<MenuSection title="Settings" items={[["Appearance","/settings#appearance"],["Notifications","/settings#notifications"],["Account & security","/settings#security"],["Connected accounts","/settings#connections"]]} /></> : <div className="sm:col-span-2"><p className="text-sm leading-relaxed text-white/50">Sign in to manage orders, saved artwork, bids and artist follows.</p><Link href="/sign-in" className="button-light mt-5 w-full">Sign in with Google</Link></div>}</div>{user && <form action={signOutUser} className="mt-5 border-t border-white/10 pt-4"><button className="w-full rounded-xl px-3 py-3 text-left text-sm text-white/55 hover:bg-white/[.05] hover:text-white">Sign out</button></form>}</div></details>
          </nav>
        </div>
        <div className="px-4 pb-3 md:hidden"><GlobalSearch recentSearches={viewer.recentSearches} /></div>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-white/10 bg-[#06080D]/96 px-2 pb-[max(.45rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-2xl md:hidden" aria-label="Mobile commerce navigation"><Link href="/" className="mobile-nav">Home</Link><button type="button" onClick={() => window.dispatchEvent(new Event("giggle:focus-search"))} className="mobile-nav">Search</button><Link href="/favorites" className="mobile-nav">Favorites</Link><button type="button" onClick={() => setCartOpen(true)} className="mobile-nav">Cart{cart.length > 0 ? ` (${cart.length})` : ""}</button><Link href={user ? "/account" : "/sign-in"} className="mobile-nav">Account</Link></nav>
      <CommerceSheet open={cartOpen} onOpenChange={setCartOpen} items={cart} onQuantity={updateCart} onClear={clearCart} />
    </>
  );
}

function MenuSection({ title, items }: { title: string; items: Array<[string, string]> }) {
  return <section><p className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-[#C6A66A]">{title}</p><div className="grid">{items.map(([label, href]) => <Link key={`${title}-${label}`} href={href} className="rounded-lg px-3 py-2 text-sm text-white/65 hover:bg-white/[.05] hover:text-white">{label}</Link>)}</div></section>;
}
