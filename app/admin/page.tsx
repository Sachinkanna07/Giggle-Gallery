import { desc } from "drizzle-orm";
import { auth } from "@/auth";
import { GalleryShell } from "@/app/components/GalleryShell";
import { reviewSellerApplicationForm } from "@/app/actions/marketplace";
import { getDb } from "@/db";
import { artistApplications } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return null;
  const applications = await getDb().select().from(artistApplications).orderBy(desc(artistApplications.createdAt));
  return <GalleryShell><main className="section-shell py-16 lg:py-24"><p className="eyebrow">Protected administration</p><h1 className="section-title mt-6">Seller <i>review.</i></h1><div className="mt-12 space-y-5">{applications.map((application) => <article key={application.id} className="border border-white/10 p-6 sm:p-8"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div><h2 className="font-serif text-3xl">{application.displayName}</h2><p className="mt-1 text-sm text-white/45">{application.fullName} · {application.city}, {application.country} · {application.artStyle}</p></div><span className="h-fit rounded-full border border-white/15 px-3 py-1 text-xs">{application.status.replaceAll("_", " ")}</span></div><p className="mt-5 max-w-3xl text-sm leading-relaxed text-white/60">{application.biography}</p><form action={reviewSellerApplicationForm} className="mt-6 flex flex-wrap gap-3"><input type="hidden" name="applicationId" value={application.id} /><button name="decision" value="APPROVED" className="button-light">Approve</button><button name="decision" value="NEEDS_REVIEW" className="button-outline">Needs review</button><button name="decision" value="REJECTED" className="rounded-full border border-red-300/25 px-5 py-3 text-sm text-red-100">Reject</button></form></article>)}{!applications.length && <p className="border border-white/10 p-12 text-center text-white/45">No seller applications are waiting.</p>}</div></main></GalleryShell>;
}
