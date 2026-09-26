import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-bg-primary px-5 text-center text-text-primary">
      <div className="max-w-md rounded-3xl border border-border bg-surface p-10 sm:p-14 shadow-2xl backdrop-blur-2xl">
        <p className="eyebrow justify-center flex items-center gap-1.5">
          <Sparkles size={14} /> 404 · Empty Frame
        </p>
        <h1 className="mt-5 font-serif text-5xl font-light text-text-primary leading-[0.95]">
          This artwork <i>moved.</i>
        </h1>
        <p className="mt-4 text-sm text-text-secondary leading-relaxed">
          The requested room or exhibition lot is not located at this coordinate.
        </p>
        <Link href="/" className="button-light mt-8 text-xs !py-3 !px-6 inline-block">
          Return to Giggle Gallery
        </Link>
      </div>
    </main>
  );
}
