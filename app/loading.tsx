import { Sparkles } from "lucide-react";

export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center bg-bg-primary text-text-primary">
      <div className="text-center">
        <div className="relative mx-auto size-16">
          <div className="absolute inset-0 rounded-full border border-border" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-accent-secondary" />
          <div className="absolute inset-0 grid place-items-center">
            <Sparkles size={16} className="text-accent-secondary animate-pulse" />
          </div>
        </div>
        <p className="mt-6 font-serif text-lg text-text-primary">Curating the gallery</p>
        <p className="mt-1 text-xs uppercase tracking-widest text-text-secondary/70">
          Tuning ambient light & works
        </p>
      </div>
    </main>
  );
}
