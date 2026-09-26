"use client";

import React, { createContext, useContext, useEffect, useState, useTransition } from "react";

export type Theme = "midnight" | "ivory" | "neon" | "earth" | "system";
export type MotionMode = "cinematic" | "balanced" | "reduced";
export type GalleryDensity = "compact" | "comfortable" | "immersive";
export type ImageAspectMode = "natural" | "editorial";
export type AccentStyle = "cobalt" | "gold" | "violet" | "terracotta";

export interface AuctionSettings {
  soundEnabled: boolean;
  bidAnimationEnabled: boolean;
  countdownEmphasis: boolean;
}

export interface AccessibilitySettings {
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  disableTransparency: boolean;
}

export interface NotificationSettings {
  auctions: boolean;
  outbid: boolean;
  follows: boolean;
  orders: boolean;
  seller: boolean;
}

export interface DisplaySettingsState {
  theme: Theme;
  motion: MotionMode;
  cursorEffects: boolean;
  density: GalleryDensity;
  aspectMode: ImageAspectMode;
  accentStyle: AccentStyle;
  auctions: AuctionSettings;
  accessibility: AccessibilitySettings;
  notifications: NotificationSettings;
}

const STORAGE_KEY = "giggle_display_settings_v1";

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettingsState = {
  theme: "midnight",
  motion: "cinematic",
  cursorEffects: true,
  density: "comfortable",
  aspectMode: "editorial",
  accentStyle: "cobalt",
  auctions: {
    soundEnabled: false, // Per prompt: OFF by default
    bidAnimationEnabled: true,
    countdownEmphasis: true,
  },
  accessibility: {
    reducedMotion: false,
    highContrast: false,
    largeText: false,
    disableTransparency: false,
  },
  notifications: {
    auctions: true,
    outbid: true,
    follows: true,
    orders: true,
    seller: true,
  },
};

interface DisplaySettingsContextValue {
  settings: DisplaySettingsState;
  setTheme: (theme: Theme) => void;
  setMotion: (motion: MotionMode) => void;
  setCursorEffects: (enabled: boolean) => void;
  setDensity: (density: GalleryDensity) => void;
  setAspectMode: (mode: ImageAspectMode) => void;
  setAccentStyle: (accent: AccentStyle) => void;
  updateAuctionSettings: (updates: Partial<AuctionSettings>) => void;
  updateAccessibility: (updates: Partial<AccessibilitySettings>) => void;
  updateNotificationSettings: (updates: Partial<NotificationSettings>) => void;
  resetDefaults: () => void;
}

const DisplaySettingsContext = createContext<DisplaySettingsContextValue | null>(null);

function applySettingsToDOM(settings: DisplaySettingsState) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  // Apply Theme
  root.setAttribute("data-theme", settings.theme);

  // Apply Motion
  const isReduced = settings.motion === "reduced" || settings.accessibility.reducedMotion;
  root.setAttribute("data-motion", isReduced ? "reduced" : settings.motion);

  // Apply Cursor
  root.setAttribute("data-cursor", settings.cursorEffects && !isReduced ? "enabled" : "disabled");

  // Apply Accessibility
  if (settings.accessibility.highContrast) {
    root.setAttribute("data-contrast", "high");
  } else {
    root.removeAttribute("data-contrast");
  }

  if (settings.accessibility.largeText) {
    root.setAttribute("data-large-text", "true");
  } else {
    root.removeAttribute("data-large-text");
  }

  if (settings.accessibility.disableTransparency) {
    root.setAttribute("data-no-blur", "true");
  } else {
    root.removeAttribute("data-no-blur");
  }

  // Gallery Density & Aspect
  root.setAttribute("data-density", settings.density);
  root.setAttribute("data-aspect", settings.aspectMode);
}

function getInitialSettings(): DisplaySettingsState {
  if (typeof window === "undefined") return DEFAULT_DISPLAY_SETTINGS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<DisplaySettingsState>;
      return {
        ...DEFAULT_DISPLAY_SETTINGS,
        ...parsed,
        auctions: { ...DEFAULT_DISPLAY_SETTINGS.auctions, ...(parsed.auctions || {}) },
        accessibility: { ...DEFAULT_DISPLAY_SETTINGS.accessibility, ...(parsed.accessibility || {}) },
        notifications: { ...DEFAULT_DISPLAY_SETTINGS.notifications, ...(parsed.notifications || {}) },
      };
    }
  } catch {
    // fallback
  }
  return DEFAULT_DISPLAY_SETTINGS;
}

export function DisplaySettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<DisplaySettingsState>(getInitialSettings);
  const [, startTransition] = useTransition();

  // Apply to DOM on mount and changes
  useEffect(() => {
    applySettingsToDOM(settings);
  }, [settings]);

  const saveSettings = (newSettings: DisplaySettingsState) => {
    setSettings(newSettings);
    applySettingsToDOM(newSettings);
    startTransition(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      } catch {
        // storage disabled or quota exceeded
      }
    });
  };

  const setTheme = (theme: Theme) => {
    saveSettings({ ...settings, theme });
  };

  const setMotion = (motion: MotionMode) => {
    saveSettings({ ...settings, motion });
  };

  const setCursorEffects = (cursorEffects: boolean) => {
    saveSettings({ ...settings, cursorEffects });
  };

  const setDensity = (density: GalleryDensity) => {
    saveSettings({ ...settings, density });
  };

  const setAspectMode = (aspectMode: ImageAspectMode) => {
    saveSettings({ ...settings, aspectMode });
  };

  const setAccentStyle = (accentStyle: AccentStyle) => {
    saveSettings({ ...settings, accentStyle });
  };

  const updateAuctionSettings = (updates: Partial<AuctionSettings>) => {
    saveSettings({
      ...settings,
      auctions: { ...settings.auctions, ...updates },
    });
  };

  const updateAccessibility = (updates: Partial<AccessibilitySettings>) => {
    saveSettings({
      ...settings,
      accessibility: { ...settings.accessibility, ...updates },
    });
  };

  const updateNotificationSettings = (updates: Partial<NotificationSettings>) => {
    saveSettings({
      ...settings,
      notifications: { ...settings.notifications, ...updates },
    });
  };

  const resetDefaults = () => {
    saveSettings(DEFAULT_DISPLAY_SETTINGS);
  };

  return (
    <DisplaySettingsContext.Provider
      value={{
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
      }}
    >
      {children}
    </DisplaySettingsContext.Provider>
  );
}

export function useDisplaySettings() {
  const context = useContext(DisplaySettingsContext);
  if (!context) {
    // Return safe default if used outside provider
    return {
      settings: DEFAULT_DISPLAY_SETTINGS,
      setTheme: () => {},
      setMotion: () => {},
      setCursorEffects: () => {},
      setDensity: () => {},
      setAspectMode: () => {},
      setAccentStyle: () => {},
      updateAuctionSettings: () => {},
      updateAccessibility: () => {},
      updateNotificationSettings: () => {},
      resetDefaults: () => {},
    };
  }
  return context;
}
