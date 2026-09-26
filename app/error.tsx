"use client";

import { Sparkles, RotateCcw } from "lucide-react";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-bg-primary px-5 text-center text-text-primary">
      <div className="max-w-md rounded-3xl border border-border bg-surface p-10 sm:p-14 shadow-2xl backdrop-blur-2xl">
        <p className="eyebrow justify-center flex items-center gap-1.5">
          <Sparkles size={14} /> The Frame Slipped
        </p>
        <h1 className="mt-5 font-serif text-5xl font-light text-text-primary leading-[0.95]">
          Something went <i>wrong.</i>
        </h1>
        <p className="mt-4 text-sm text-text-secondary leading-relaxed">
          Your collector session and preferences are safe. Try reloading this visual gallery view.
        </p>
        <button
          onClick={reset}
          className="button-light mt-8 text-xs !py-3 !px-6 inline-flex items-center gap-2"
        >
          <RotateCcw size={14} /> Reconnect Gallery View
        </button>
      </div>
    </main>
  );
}
