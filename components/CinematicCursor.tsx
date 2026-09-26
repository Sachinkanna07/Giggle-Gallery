"use client";

import { useEffect, useRef } from "react";
import { useDisplaySettings } from "@/lib/display-settings";

export function CinematicCursor() {
  const { settings } = useDisplaySettings();
  const spotlightRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: -500, y: -500, targetX: -500, targetY: -500 });
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    // 1. Guard against touch devices and disabled settings
    if (!settings.cursorEffects) return;
    if (settings.motion === "reduced" || settings.accessibility.reducedMotion) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window) return;

    const spotlight = spotlightRef.current;
    if (!spotlight) return;

    let isMoving = false;

    const onPointerMove = (e: MouseEvent) => {
      posRef.current.targetX = e.clientX;
      posRef.current.targetY = e.clientY;

      if (!isMoving) {
        isMoving = true;
        spotlight.style.opacity = "1";
      }
    };

    const onMouseLeave = () => {
      isMoving = false;
      if (spotlight) spotlight.style.opacity = "0";
    };

    // Smooth lerp loop via requestAnimationFrame
    const update = () => {
      const { targetX, targetY } = posRef.current;
      posRef.current.x += (targetX - posRef.current.x) * 0.15;
      posRef.current.y += (targetY - posRef.current.y) * 0.15;

      if (spotlight) {
        spotlight.style.transform = `translate3d(${posRef.current.x - 220}px, ${posRef.current.y - 220}px, 0)`;
      }

      rafId.current = requestAnimationFrame(update);
    };

    window.addEventListener("mousemove", onPointerMove, { passive: true });
    document.addEventListener("mouseleave", onMouseLeave);
    rafId.current = requestAnimationFrame(update);

    return () => {
      window.removeEventListener("mousemove", onPointerMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [settings.cursorEffects, settings.motion, settings.accessibility.reducedMotion]);

  if (
    !settings.cursorEffects ||
    settings.motion === "reduced" ||
    settings.accessibility.reducedMotion ||
    settings.accessibility.disableTransparency
  ) {
    return null;
  }

  return (
    <div
      ref={spotlightRef}
      className="pointer-events-none fixed left-0 top-0 -z-40 h-[440px] w-[440px] rounded-full opacity-0 blur-[90px] transition-opacity duration-500 will-change-transform"
      style={{
        background: "radial-gradient(circle, var(--glow) 0%, transparent 70%)",
      }}
      aria-hidden="true"
    />
  );
}
