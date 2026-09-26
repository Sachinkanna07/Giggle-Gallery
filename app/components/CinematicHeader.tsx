"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Search,
  Sliders,
  Bell,
  Heart,
  Gavel,
  User,
  Home,
  Compass,
  Sparkles,
  LogOut,
} from "lucide-react";
import { CommandSearch } from "@/components/CommandSearch";
import { signOutUser } from "@/app/actions/auth";

interface CinematicHeaderProps {
  user: {
    id?: string;
    role?: string;
    name?: string | null;
    email?: string | null;
  } | null;
  showAuctions: boolean;
  unread: number;
  workspace: { href: string; label: string };
}

export function CinematicHeader({ user, showAuctions, unread, workspace }: CinematicHeaderProps) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 25);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isNavActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* 1. Desktop & Tablet Top Glass Header */}
      <header
        className={`sticky top-0 z-40 flex items-center justify-between px-5 transition-all duration-300 sm:px-8 lg:px-14 ${
          scrolled
            ? "h-16 header-glass scrolled shadow-2xl"
            : "h-20 header-glass bg-glass-bg/60"
        }`}
      >
        {/* Brand Identity */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="group flex items-center gap-2 font-serif text-xl tracking-[-0.035em] sm:text-2xl text-text-primary"
          >
            <span>GIGGLE</span>
            <span className="font-light italic text-accent-secondary transition-colors group-hover:text-text-primary">
              GALLERY
            </span>
          </Link>

          {/* Primary Desktop Nav Links */}
          <nav
            className="hidden items-center gap-6 text-sm text-text-secondary lg:flex ml-4"
            aria-label="Primary navigation"
          >
            <Link
              href="/#gallery"
              className={`nav-link ${isNavActive("/#gallery") ? "text-text-primary" : ""}`}
            >
              Gallery
            </Link>
            {showAuctions && (
              <Link
                href="/auctions"
                className={`nav-link flex items-center gap-1.5 ${
                  isNavActive("/auctions") ? "text-text-primary font-medium" : ""
                }`}
              >
                <span className="size-1.5 rounded-full bg-accent animate-pulse" />
                Auctions
              </Link>
            )}
            <Link href="/#artists" className="nav-link">
              Artists
            </Link>
            <Link
              href="/collections"
              className={`nav-link ${isNavActive("/collections") ? "text-text-primary font-medium" : ""}`}
            >
              Collections
            </Link>
            {user && (
              <Link
                href="/following"
                className={`nav-link ${isNavActive("/following") ? "text-text-primary font-medium" : ""}`}
              >
                Following
              </Link>
            )}
            <Link
              href="/orders"
              className={`nav-link ${isNavActive("/orders") ? "text-text-primary font-medium" : ""}`}
            >
              Orders
            </Link>
            <Link
              href={workspace.href}
              className="nav-link text-accent-secondary hover:text-text-primary font-medium"
            >
              {workspace.label}
            </Link>
          </nav>
        </div>

        {/* Action Controls & Utilities */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Command Search Trigger with ⌘K badge */}
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Search artworks and artists"
            className="header-icon flex items-center gap-2 !w-auto !px-3.5 !py-1.5 rounded-full border border-border bg-surface/50 text-text-secondary hover:border-accent-secondary hover:text-text-primary transition-all"
          >
            <Search size={16} />
            <span className="hidden text-xs text-text-secondary md:inline">Search...</span>
            <kbd className="hidden rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono text-text-secondary sm:inline">
              ⌘K
            </kbd>
          </button>

          {/* Quick Settings Link */}
          <Link
            href="/settings"
            aria-label="Display & theme settings"
            className={`header-icon ${isNavActive("/settings") ? "border-accent-secondary text-text-primary" : ""}`}
          >
            <Sliders size={18} />
          </Link>

          {/* Notifications Bell */}
          {user && (
            <Link
              href="/notifications"
              aria-label={`Notifications, ${unread} unread`}
              className={`header-icon ${unread > 0 ? "text-text-primary" : ""}`}
            >
              <Bell size={18} />
              {unread > 0 && (
                <span className="count-badge animate-pulse">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
          )}

          {/* User Account / Sign In */}
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/account"
                aria-label="Account overview"
                className={`header-icon hidden sm:grid ${
                  isNavActive("/account") ? "border-accent-secondary text-text-primary" : ""
                }`}
              >
                <User size={18} />
              </Link>
              <form action={signOutUser}>
                <button
                  type="submit"
                  aria-label="Sign out"
                  className="rounded-full border border-border px-3.5 py-1.5 text-xs text-text-secondary hover:border-border/80 hover:text-text-primary transition"
                >
                  <span className="hidden sm:inline">Sign out</span>
                  <LogOut size={15} className="sm:hidden" />
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/sign-in"
              className="button-light text-xs !py-2 !px-4 whitespace-nowrap"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>

      {/* 2. Mobile Bottom Navigation Bar (Phase 15: Required Tabs) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border header-glass px-1 py-1.5 sm:hidden"
        aria-label="Mobile primary navigation"
      >
        <Link
          href="/"
          className={`mobile-nav ${pathname === "/" ? "text-accent-secondary font-semibold" : ""}`}
        >
          <Home size={18} />
          <span>Home</span>
        </Link>

        <button
          onClick={() => setSearchOpen(true)}
          className="mobile-nav"
        >
          <Compass size={18} />
          <span>Discover</span>
        </button>

        {showAuctions ? (
          <Link
            href="/auctions"
            className={`mobile-nav relative ${pathname.startsWith("/auctions") ? "text-accent-secondary font-semibold" : ""}`}
          >
            <Gavel size={18} />
            <span>Auctions</span>
            <span className="absolute top-1 right-5 size-1.5 rounded-full bg-accent" />
          </Link>
        ) : (
          <Link
            href="/#gallery"
            className="mobile-nav"
          >
            <Sparkles size={18} />
            <span>Gallery</span>
          </Link>
        )}

        <Link
          href="/collections"
          className={`mobile-nav ${pathname.startsWith("/collections") ? "text-accent-secondary font-semibold" : ""}`}
        >
          <Heart size={18} />
          <span>Saved</span>
        </Link>

        <Link
          href={user ? "/account" : "/sign-in"}
          className={`mobile-nav ${pathname.startsWith("/account") ? "text-accent-secondary font-semibold" : ""}`}
        >
          <User size={18} />
          <span>{user ? "Account" : "Sign In"}</span>
        </Link>
      </nav>

      {/* Global Command Palette */}
      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
