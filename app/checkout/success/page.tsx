import Link from "next/link";
import { Check } from "lucide-react";
import { GalleryShell } from "@/app/components/GalleryShell";

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  return <GalleryShell><main className="grid min-h-[calc(100vh-5rem)] place-items-center px-5 text-center"><div><div className="mx-auto grid size-24 place-items-center rounded-full bg-cobalt"><Check size={38} /></div><p className="eyebrow mt-8 justify-center">Payment verified</p><h1 className="mt-5 font-serif text-6xl tracking-[-.05em]">Something beautiful is yours.</h1><p className="mx-auto mt-5 max-w-lg text-white/50">Your order {order ? order.slice(0, 8) : ""} is confirmed. Follow its progress from My Orders.</p><div className="mt-8 flex justify-center gap-3"><Link href="/orders" className="button-light">View my orders</Link><Link href="/#gallery" className="button-outline">Keep exploring</Link></div></div></main></GalleryShell>;
}
