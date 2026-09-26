import { auth } from "@/auth";
import { GalleryShell } from "@/app/components/GalleryShell";
import { SellerApplicationForm } from "@/app/components/SellerForms";
import { getSellerSnapshot } from "@/lib/marketplace-data";

export const dynamic = "force-dynamic";

export default async function SellPage() {
  const session = await auth();
  if (!session?.user) return null;
  const snapshot = await getSellerSnapshot(session.user.id);
  return (
    <GalleryShell>
      <main>
        <section className="border-b border-white/10 px-5 py-24 sm:px-10 lg:px-16 lg:py-36">
          <p className="eyebrow">Sell with Giggle Gallery</p>
          <h1 className="section-title mt-6 max-w-6xl">Turn your art into <i>something more.</i></h1>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-white/55">Build an artist profile, publish verified work, reach collectors, and manage every sale from one focused studio.</p>
        </section>
        <section className="section-shell py-20">
          {snapshot.artist ? <div className="border border-emerald-300/20 bg-emerald-300/[.06] p-8"><p className="eyebrow !text-emerald-200">Approved seller</p><h2 className="mt-4 font-serif text-4xl">Your studio is ready.</h2><a href="/seller" className="button-light mt-7">Open seller dashboard</a></div> : snapshot.application ? <div className="border border-white/10 bg-white/[.03] p-8"><p className="eyebrow">Application status</p><h2 className="mt-4 font-serif text-4xl">{snapshot.application.status.replaceAll("_", " ")}</h2><p className="mt-4 max-w-xl text-white/50">Submitted {snapshot.application.createdAt.toLocaleDateString("en-IN")}. You can update and resubmit the details below while review is pending.</p><SellerApplicationForm email={session.user.email} name={session.user.name} /></div> : <SellerApplicationForm email={session.user.email} name={session.user.name} />}
        </section>
      </main>
    </GalleryShell>
  );
}
