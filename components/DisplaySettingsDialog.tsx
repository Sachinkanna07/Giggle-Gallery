"use client";

import React from "react";
import {
  useDisplaySettings,
  Theme,
  MotionMode,
  GalleryDensity,
} from "@/lib/display-settings";
import {
  Palette,
  Eye,
  Sparkles,
  Gavel,
  Volume2,
  VolumeX,
  Check,
  RotateCcw,
  Layers,
  Bell,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

export function DisplaySettingsView() {
  const {
    settings,
    setTheme,
    setMotion,
    setCursorEffects,
    setDensity,
    setAspectMode,
    setAccentStyle,
    updateAuctionSettings,
    updateAccessibility,
    updateNotificationSettings,
    resetDefaults,
  } = useDisplaySettings();

  const themes: Array<{
    id: Theme;
    name: string;
    description: string;
    colors: [string, string, string];
  }> = [
    {
      id: "midnight",
      name: "Midnight Gallery",
      description: "Deep obsidian, cobalt luminescence, ivory editorial text",
      colors: ["#05070c", "#0f1422", "#2757ff"],
    },
    {
      id: "ivory",
      name: "Ivory Museum",
      description: "Warm limestone, charcoal contrast, muted museum gold",
      colors: ["#f8f5ee", "#ffffff", "#b59247"],
    },
    {
      id: "neon",
      name: "Neon Atelier",
      description: "Dark graphite canvas, electric violet, cyan highlights",
      colors: ["#07080d", "#151624", "#8b5cf6"],
    },
    {
      id: "earth",
      name: "Earth Canvas",
      description: "Dark terracotta earth, warm clay, olive botanical tones",
      colors: ["#120e0b", "#241e17", "#cf6f4e"],
    },
    {
      id: "system",
      name: "System Adaptive",
      description: "Seamlessly aligns with your operating system preference",
      colors: ["#1e293b", "#475569", "#94a3b8"],
    },
  ];

  const motionOptions: Array<{ id: MotionMode; label: string; desc: string }> = [
    {
      id: "cinematic",
      label: "Full Cinematic",
      desc: "Ambient mesh, parallax depth, 3D card tilt, spotlight cursor",
    },
    {
      id: "balanced",
      label: "Balanced",
      desc: "Standard smooth transitions, reduced continuous animations",
    },
    {
      id: "reduced",
      label: "Reduced Motion",
      desc: "Minimal transitions for maximum comfort and speed",
    },
  ];

  const densities: Array<{ id: GalleryDensity; label: string; desc: string }> = [
    { id: "compact", label: "Compact Grid", desc: "Highest density for collectors browsing large catalogs" },
    { id: "comfortable", label: "Comfortable", desc: "Balanced editorial spacing with optimal metadata" },
    { id: "immersive", label: "Immersive View", desc: "Large heroic artwork displays with museum presence" },
  ];

  return (
    <div className="space-y-12 pb-10">
      {/* SECTION 1: APPEARANCE */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <Palette className="text-accent-secondary" size={20} />
          <div>
            <h2 className="font-serif text-2xl text-text-primary">Appearance & Themes</h2>
            <p className="text-xs text-text-secondary">
              Curated visual environments crafted for fine art contemplation
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {themes.map((t) => {
            const isSelected = settings.theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all duration-300 ${
                  isSelected
                    ? "border-accent ring-2 ring-accent/30 bg-surface-elevated shadow-lg"
                    : "border-border bg-surface hover:border-border/80 hover:bg-surface-elevated/50"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <p className="font-serif text-lg font-medium text-text-primary">{t.name}</p>
                    {isSelected && (
                      <span className="grid size-5 place-items-center rounded-full bg-accent text-white">
                        <Check size={12} />
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
                    {t.description}
                  </p>
                </div>

                <div className="mt-5 flex items-center gap-2">
                  {t.colors.map((c, i) => (
                    <span
                      key={i}
                      className="size-5 rounded-full border border-black/10 shadow-sm"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Accent Color Palette */}
        <div className="pt-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
            Accent Palette
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: "cobalt" as const, name: "Cobalt", color: "#2757ff" },
              { id: "gold" as const, name: "Museum Gold", color: "#d4af37" },
              { id: "violet" as const, name: "Electric Violet", color: "#8a2be2" },
              { id: "terracotta" as const, name: "Terracotta Clay", color: "#c86446" },
            ].map((acc) => {
              const isSelected = settings.accentStyle === acc.id;
              return (
                <button
                  key={acc.id}
                  onClick={() => setAccentStyle(acc.id)}
                  className={`flex items-center gap-2.5 rounded-lg border p-2.5 text-left text-xs transition ${
                    isSelected
                      ? "border-accent ring-1 ring-accent bg-surface-elevated font-medium"
                      : "border-border bg-surface hover:bg-surface-elevated/50 text-text-secondary"
                  }`}
                >
                  <span
                    className="size-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: acc.color }}
                  />
                  <span className="truncate">{acc.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 2: MOTION & SENSORY */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <Sparkles className="text-accent-secondary" size={20} />
          <div>
            <h2 className="font-serif text-2xl text-text-primary">Motion & Physics</h2>
            <p className="text-xs text-text-secondary">
              Fluid ambient animations, dynamic lighting, and pointer reactivity
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {motionOptions.map((opt) => {
            const isSelected = settings.motion === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setMotion(opt.id)}
                className={`flex flex-col justify-between rounded-xl border p-4 text-left transition-all ${
                  isSelected
                    ? "border-accent ring-2 ring-accent/30 bg-surface-elevated"
                    : "border-border bg-surface hover:bg-surface-elevated/50"
                }`}
              >
                <div>
                  <p className="font-serif text-lg text-text-primary">{opt.label}</p>
                  <p className="mt-1.5 text-xs text-text-secondary leading-relaxed">{opt.desc}</p>
                </div>
                {isSelected && (
                  <span className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-accent-secondary">
                    <Check size={13} /> Active mode
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4">
          <div>
            <p className="text-sm font-medium text-text-primary">Desktop Cursor Spotlight</p>
            <p className="text-xs text-text-secondary">
              Radial ambient glow and subtle card tilt following your mouse movements
            </p>
          </div>
          <Switch
            checked={settings.cursorEffects && settings.motion !== "reduced"}
            disabled={settings.motion === "reduced"}
            onCheckedChange={(checked) => setCursorEffects(checked)}
          />
        </div>
      </section>

      {/* SECTION 3: GALLERY EXPERIENCE */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <Layers className="text-accent-secondary" size={20} />
          <div>
            <h2 className="font-serif text-2xl text-text-primary">Gallery Browsing Modes</h2>
            <p className="text-xs text-text-secondary">
              Customize artwork grid density and visual framing
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {densities.map((d) => {
            const isSelected = settings.density === d.id;
            return (
              <button
                key={d.id}
                onClick={() => setDensity(d.id)}
                className={`rounded-xl border p-4 text-left transition-all ${
                  isSelected
                    ? "border-accent ring-2 ring-accent/30 bg-surface-elevated"
                    : "border-border bg-surface hover:bg-surface-elevated/50"
                }`}
              >
                <p className="font-serif text-lg text-text-primary">{d.label}</p>
                <p className="mt-1 text-xs text-text-secondary leading-relaxed">{d.desc}</p>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4">
          <div>
            <p className="text-sm font-medium text-text-primary">Image Aspect Mode</p>
            <p className="text-xs text-text-secondary">
              Toggle between Natural proportions or Editorial uniform crop
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setAspectMode("editorial")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                settings.aspectMode === "editorial"
                  ? "bg-text-primary text-bg-primary"
                  : "border border-border text-text-secondary hover:text-text-primary"
              }`}
            >
              Editorial Crop (4:5)
            </button>
            <button
              onClick={() => setAspectMode("natural")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                settings.aspectMode === "natural"
                  ? "bg-text-primary text-bg-primary"
                  : "border border-border text-text-secondary hover:text-text-primary"
              }`}
            >
              Natural Aspect
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 4: AUCTIONS EXPERIENCE & SOUNDS */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <Gavel className="text-accent-secondary" size={20} />
          <div>
            <h2 className="font-serif text-2xl text-text-primary">Live Auction Room Preferences</h2>
            <p className="text-xs text-text-secondary">
              Sensory feedback and live bidding atmosphere (Phase 14 audio)
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center gap-3">
              {settings.auctions.soundEnabled ? (
                <Volume2 size={20} className="text-accent-secondary" />
              ) : (
                <VolumeX size={20} className="text-text-secondary" />
              )}
              <div>
                <p className="text-sm font-medium text-text-primary">Auction Sound System</p>
                <p className="text-xs text-text-secondary">
                  Subtle audio chimes on accepted bids, outbids, and countdown warnings (OFF by default)
                </p>
              </div>
            </div>
            <Switch
              checked={settings.auctions.soundEnabled}
              onCheckedChange={(checked) =>
                updateAuctionSettings({ soundEnabled: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
            <div>
              <p className="text-sm font-medium text-text-primary">Live Bid Pulse Animation</p>
              <p className="text-xs text-text-secondary">
                Subtle highlight pulse when new competing bids arrive in real-time
              </p>
            </div>
            <Switch
              checked={settings.auctions.bidAnimationEnabled}
              onCheckedChange={(checked) =>
                updateAuctionSettings({ bidAnimationEnabled: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
            <div>
              <p className="text-sm font-medium text-text-primary">Closing Countdown Urgency</p>
              <p className="text-xs text-text-secondary">
                Emphasize remaining time when under 2 minutes with Christie&apos;s style precision
              </p>
            </div>
            <Switch
              checked={settings.auctions.countdownEmphasis}
              onCheckedChange={(checked) =>
                updateAuctionSettings({ countdownEmphasis: checked })
              }
            />
          </div>
        </div>
      </section>

      {/* SECTION 5: ACCESSIBILITY */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <Eye className="text-accent-secondary" size={20} />
          <div>
            <h2 className="font-serif text-2xl text-text-primary">Accessibility & Legibility</h2>
            <p className="text-xs text-text-secondary">
              Enhanced contrast, enlarged typography, and visual comfort adjustments
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
            <div>
              <p className="text-sm font-medium text-text-primary">High Contrast Borders</p>
              <p className="text-xs text-text-secondary">
                Enhance edge definition and division lines
              </p>
            </div>
            <Switch
              checked={settings.accessibility.highContrast}
              onCheckedChange={(checked) =>
                updateAccessibility({ highContrast: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
            <div>
              <p className="text-sm font-medium text-text-primary">Larger UI Typography</p>
              <p className="text-xs text-text-secondary">
                Scale base font sizes for effortless reading
              </p>
            </div>
            <Switch
              checked={settings.accessibility.largeText}
              onCheckedChange={(checked) =>
                updateAccessibility({ largeText: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
            <div>
              <p className="text-sm font-medium text-text-primary">Disable Backdrop Blur</p>
              <p className="text-xs text-text-secondary">
                Render solid opaque surfaces without glassmorphism
              </p>
            </div>
            <Switch
              checked={settings.accessibility.disableTransparency}
              onCheckedChange={(checked) =>
                updateAccessibility({ disableTransparency: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
            <div>
              <p className="text-sm font-medium text-text-primary">Force Reduced Motion</p>
              <p className="text-xs text-text-secondary">
                Disable all non-essential movement across the gallery
              </p>
            </div>
            <Switch
              checked={settings.accessibility.reducedMotion}
              onCheckedChange={(checked) =>
                updateAccessibility({ reducedMotion: checked })
              }
            />
          </div>
        </div>
      </section>

      {/* SECTION 6: NOTIFICATIONS PREFERENCES */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <Bell className="text-accent-secondary" size={20} />
          <div>
            <h2 className="font-serif text-2xl text-text-primary">Collector Notifications</h2>
            <p className="text-xs text-text-secondary">
              Fine-tune alerts delivered to your notification bell
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
            <div>
              <p className="text-sm font-medium text-text-primary">Auction & Outbid Alerts</p>
              <p className="text-xs text-text-secondary">
                Real-time alerts when you are outbid or an auction is concluding
              </p>
            </div>
            <Switch
              checked={settings.notifications.outbid}
              onCheckedChange={(checked) =>
                updateNotificationSettings({ outbid: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
            <div>
              <p className="text-sm font-medium text-text-primary">Followed Artist Releases</p>
              <p className="text-xs text-text-secondary">
                Notifies when artists you follow publish new artworks or schedule auctions
              </p>
            </div>
            <Switch
              checked={settings.notifications.follows}
              onCheckedChange={(checked) =>
                updateNotificationSettings({ follows: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
            <div>
              <p className="text-sm font-medium text-text-primary">Orders & Fulfillment Status</p>
              <p className="text-xs text-text-secondary">
                Shipping, tracking, and delivery milestones
              </p>
            </div>
            <Switch
              checked={settings.notifications.orders}
              onCheckedChange={(checked) =>
                updateNotificationSettings({ orders: checked })
              }
            />
          </div>
        </div>
      </section>

      {/* RESET TO FACTORY DEFAULTS */}
      <div className="flex justify-end pt-4">
        <button
          onClick={resetDefaults}
          className="flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-xs text-text-secondary transition hover:border-text-primary hover:text-text-primary"
        >
          <RotateCcw size={14} /> Reset all settings to defaults
        </button>
      </div>
    </div>
  );
}
