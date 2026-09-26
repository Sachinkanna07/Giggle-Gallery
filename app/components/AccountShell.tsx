import Link from "next/link";

const links = [
  ["Overview", "/account"], ["Orders", "/orders"], ["Auctions", "/account#auctions"], ["Favorites", "/favorites"], ["Collections", "/collections"], ["Following", "/following"], ["Notifications", "/notifications"], ["Profile", "/settings#account"], ["Settings", "/settings"],
] as const;

export function AccountShell({ active, eyebrow, title, description, children }: { active: string; eyebrow?: string; title?: string; description?: string; children: React.ReactNode }) {
  return <div className="section-shell py-8 sm:py-12"><nav aria-label="Breadcrumb" className="mb-6 text-sm text-white/40"><Link href="/" className="hover:text-white">Home</Link><span className="mx-2">/</span><Link href="/account" className="hover:text-white">Your Account</Link>{active !== "Overview" ? <><span className="mx-2">/</span><span className="text-white/70">{active}</span></> : null}</nav><div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]"><aside><nav aria-label="Account sections" className="flex gap-2 overflow-x-auto pb-2 lg:sticky lg:top-24 lg:grid lg:overflow-visible lg:pb-0">{links.map(([label, href]) => <Link key={label} href={href} aria-current={active === label ? "page" : undefined} className={`whitespace-nowrap rounded-xl px-4 py-3 text-sm transition ${active === label ? "bg-white/[.09] text-white" : "text-white/50 hover:bg-white/[.04] hover:text-white"}`}>{label}</Link>)}</nav></aside><div className="min-w-0">{title && <header className="mb-10"><p className="eyebrow">{eyebrow}</p><h1 className="mt-3 font-serif text-5xl tracking-[-.045em]">{title}</h1>{description && <p className="mt-3 max-w-2xl text-white/50">{description}</p>}</header>}{children}</div></div></div>;
}
