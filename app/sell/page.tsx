import { auth } from "@/auth";
import Link from "next/link";
import { GalleryShell } from "@/app/components/GalleryShell";
import { SellerApplicationForm } from "@/app/components/SellerForms";
import { getSellerSnapshot } from "@/lib/marketplace-data";
import { Palette, CheckCircle, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SellPage() {
  const session = await auth();
  if (!session?.user) return null;
  const snapshot = await getSellerSnapshot(session.user.id);

  return (
    <GalleryShell>
      <main className="min-h-screen">
        <section className="border-b border-border px-5 py-24 sm:px-10 lg:px-16 lg:py-32 bg-surface-elevated/20">
          <div className="section-shell">
            <p className="eyebrow flex items-center gap-2">
              <Palette size={14} /> Creator Representation & Studio
            </p>
            <h1 className="section-title mt-4 max-w-4xl text-text-primary">
              Turn your art into <i>something more.</i>
            </h1>
            <p className="mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-text-secondary">
              Build an official artist studio profile, release authenticated editions, reach dedicated collectors, and manage every acquisition from one focused studio.
            </p>
          </div>
        </section>

        <section className="section-shell py-20">
          {snapshot.artist ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-text-primary max-w-2xl">
              <p className="eyebrow !text-emerald-300 flex items-center gap-2">
                <CheckCircle size={15} /> Approved Studio Creator
              </p>
              <h2 className="mt-3 font-serif text-4xl text-text-primary">Your studio is active.</h2>
              <p className="mt-2 text-sm text-text-secondary">
                You can now publish artwork, manage orders, and initiate live auction releases.
              </p>
              <Link href="/seller" className="button-light mt-6 text-xs !py-2.5 !px-5 inline-flex items-center gap-1.5">
                Open studio console <ArrowRight size={13} />
              </Link>
            </div>
          ) : snapshot.application ? (
            <div className="rounded-2xl border border-border bg-surface p-8 max-w-3xl space-y-6">
              <div>
                <p className="eyebrow">Application Status</p>
                <h2 className="mt-2 font-serif text-3xl text-text-primary">
                  {snapshot.application.status.replaceAll("_", " ")}
                </h2>
                <p className="mt-2 text-xs text-text-secondary">
                  Submitted on {snapshot.application.createdAt.toLocaleDateString("en-IN")}. You can revise and resubmit your portfolio details below while under review.
                </p>
              </div>
              <SellerApplicationForm email={session.user.email} name={session.user.name} />
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-surface p-8 max-w-3xl">
              <SellerApplicationForm email={session.user.email} name={session.user.name} />
            </div>
          )}
        </section>
      </main>
    </GalleryShell>
  );
}
