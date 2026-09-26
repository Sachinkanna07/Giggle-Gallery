import type { Metadata } from "next";
import { GalleryShell } from "@/app/components/GalleryShell";
import { DisplaySettingsView } from "@/components/DisplaySettingsDialog";
import { Sliders } from "lucide-react";

export const metadata: Metadata = {
  title: "Display Settings | Giggle Gallery",
  description: "Customize themes, sensory motion, gallery density, and accessibility preferences.",
};

export default function SettingsPage() {
  return (
    <GalleryShell>
      <main className="section-shell py-16 lg:py-24">
        <div className="mb-12 max-w-3xl">
          <p className="eyebrow flex items-center gap-2">
            <Sliders size={14} /> Personalization & Controls
          </p>
          <h1 className="section-title mt-4">
            Curate your <i>experience.</i>
          </h1>
          <p className="mt-4 text-base leading-relaxed text-text-secondary">
            Tailor themes, ambient motion, audio cues, gallery layout densities, and accessibility parameters to your personal taste. Preferences are preserved across your collector sessions.
          </p>
        </div>

        <div className="max-w-4xl">
          <DisplaySettingsView />
        </div>
      </main>
    </GalleryShell>
  );
}
