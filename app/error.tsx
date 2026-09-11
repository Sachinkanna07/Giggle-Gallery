"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="grid min-h-screen place-items-center bg-ink px-5 text-center text-ivory"><div><p className="eyebrow justify-center">The frame slipped</p><h1 className="mt-5 font-serif text-6xl">Something went wrong.</h1><p className="mt-4 text-white/45">Your gallery is safe. Try loading this view again.</p><button onClick={reset} className="button-light mt-7">Try again</button></div></main>;
}
