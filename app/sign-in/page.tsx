import { GalleryShell } from "@/app/components/GalleryShell";
import { signInWithGoogle } from "@/app/actions/auth";
import { GoogleSignInButton } from "@/app/sign-in/GoogleSignInButton";
import { authErrorMessage } from "@/lib/auth/policy";
import { Sparkles, ShieldCheck } from "lucide-react";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const error = authErrorMessage((await searchParams).error);
  return (
    <GalleryShell>
      <main className="grid min-h-[calc(100vh-5rem)] place-items-center px-5 py-20">
        <section className="w-full max-w-md rounded-3xl border border-border bg-surface p-8 sm:p-12 text-center shadow-2xl backdrop-blur-2xl">
          <p className="eyebrow justify-center flex items-center gap-2">
            <Sparkles size={14} /> Private Collector Suite
          </p>
          <h1 className="mt-5 font-serif text-5xl font-light tracking-[-0.04em] text-text-primary leading-[0.95]">
            Come back to <i>your taste.</i>
          </h1>
          <p className="mx-auto mt-4 text-sm leading-relaxed text-text-secondary">
            Sign in to preserve your curatorial likes, collections, follows, cart, and live bidding permissions.
          </p>

          {error && (
            <div role="alert" className="mt-6 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-xs text-amber-200">
              {error}
            </div>
          )}

          <form action={signInWithGoogle} className="mt-8">
            <GoogleSignInButton />
          </form>

          <p className="mt-6 text-[11px] leading-relaxed text-text-secondary/70 flex items-center justify-center gap-1.5">
            <ShieldCheck size={13} className="text-accent-secondary" />
            Giggle Gallery authenticates safely with Google OAuth 2.0.
          </p>
        </section>
      </main>
    </GalleryShell>
  );
}
