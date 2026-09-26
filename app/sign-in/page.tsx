import { GalleryShell } from "@/app/components/GalleryShell";
import { signInWithGoogle } from "@/app/actions/auth";
import { GoogleSignInButton } from "@/app/sign-in/GoogleSignInButton";
import { authErrorMessage } from "@/lib/auth/policy";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const error = authErrorMessage((await searchParams).error);
  return (
    <GalleryShell>
      <main className="grid min-h-[calc(100vh-5rem)] place-items-center px-5 py-20">
        <section className="w-full max-w-lg border border-white/10 bg-white/[.035] p-8 text-center shadow-2xl sm:p-12">
          <p className="eyebrow justify-center">Your private gallery</p>
          <h1 className="mt-6 font-serif text-5xl font-normal tracking-[-.05em] sm:text-6xl">Come back to your taste.</h1>
          <p className="mx-auto mt-5 max-w-sm leading-relaxed text-white/55">Sign in to keep your likes, collections, follows, cart, orders, and seller profile in sync.</p>
          {error && <p role="alert" className="mt-6 border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100">{error}</p>}
          <form action={signInWithGoogle} className="mt-8">
            <GoogleSignInButton />
          </form>
          <p className="mt-5 text-xs leading-relaxed text-white/35">Giggle Gallery never stores your Google password.</p>
        </section>
      </main>
    </GalleryShell>
  );
}
