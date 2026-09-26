"use client";

import React, { useSyncExternalStore } from "react";
import { useDisplaySettings } from "@/lib/display-settings";

const subscribe = () => () => {};

interface CinematicBackgroundProps {
  dominantColor?: string; // Optional dynamic accent from artwork dominant color (Phase 24)
}

export function CinematicBackground({ dominantColor }: CinematicBackgroundProps) {
  const { settings } = useDisplaySettings();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  const isReduced = settings.motion === "reduced" || settings.accessibility.reducedMotion;

  // Map dominant color string to rgba glow if provided
  const dynamicGlow = dominantColor
    ? dominantColor.toLowerCase().includes("blue")
      ? "rgba(39, 87, 255, 0.35)"
      : dominantColor.toLowerCase().includes("coral") || dominantColor.toLowerCase().includes("red")
      ? "rgba(235, 87, 87, 0.3)"
      : dominantColor.toLowerCase().includes("gold") || dominantColor.toLowerCase().includes("warm")
      ? "rgba(229, 169, 59, 0.3)"
      : dominantColor.toLowerCase().includes("teal") || dominantColor.toLowerCase().includes("green")
      ? "rgba(16, 185, 129, 0.3)"
      : undefined
    : undefined;

  return (
    <div
      className="pointer-events-none fixed inset-0 -z-50 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* 1. Base Gradient Canvas */}
      <div
        className="absolute inset-0 transition-colors duration-700"
        style={{
          background: "var(--bg-primary)",
        }}
      />

      {/* 2. Soft Ambient Drift Orbs */}
      {!isReduced && mounted && (
        <>
          <div
            className="ambient-layer absolute -left-[10vw] -top-[15vh] h-[65vw] w-[65vw] max-w-[900px] rounded-full blur-[140px] transition-all duration-1000"
            style={{
              background: dynamicGlow || "var(--glow)",
              opacity: settings.accessibility.disableTransparency ? 0 : 0.28,
            }}
          />
          <div
            className="ambient-layer absolute -right-[15vw] top-[40vh] h-[55vw] w-[55vw] max-w-[800px] rounded-full blur-[160px] transition-all duration-1000"
            style={{
              animationDelay: "-12s",
              background: "var(--glow)",
              opacity: settings.accessibility.disableTransparency ? 0 : 0.18,
            }}
          />
          <div
            className="ambient-layer absolute bottom-[-10vh] left-[25vw] h-[50vw] w-[50vw] max-w-[700px] rounded-full blur-[150px] transition-all duration-1000"
            style={{
              animationDelay: "-6s",
              background: "var(--glow)",
              opacity: settings.accessibility.disableTransparency ? 0 : 0.14,
            }}
          />
        </>
      )}

      {/* 3. Subtle Film Grain / Noise Overlay */}
      <div
        className="noise absolute inset-0 opacity-[0.24] mix-blend-soft-light"
        style={{
          display: settings.accessibility.disableTransparency ? "none" : "block",
        }}
      />

      {/* 4. Soft Vignette Depth */}
      <div
        className="absolute inset-0 bg-radial-[circle_at_center,transparent_0%,rgba(0,0,0,0.35)_100%]"
        style={{ opacity: settings.theme === "ivory" ? 0.05 : 0.5 }}
      />
    </div>
  );
}
