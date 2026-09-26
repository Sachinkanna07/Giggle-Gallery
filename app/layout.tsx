import type { Metadata } from "next";
import { assertRuntimeEnvironment } from "@/lib/env";
import { DisplaySettingsProvider } from "@/lib/display-settings";
import { CinematicBackground } from "@/components/CinematicBackground";
import { CinematicCursor } from "@/components/CinematicCursor";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: "Giggle Gallery — Art that feels like you", template: "%s | Giggle Gallery" },
  description: "Discover original art curated around your mood, personality and visual taste.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Giggle Gallery",
    title: "Giggle Gallery - Art that feels like you",
    description: "Discover original art curated around your mood, personality and visual taste.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Giggle Gallery - Art that feels like you",
    description: "Discover original art curated around your mood, personality and visual taste.",
  },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Giggle Gallery" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  assertRuntimeEnvironment();
  return (
    <html lang="en" suppressHydrationWarning data-theme="midnight">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('giggle_display_settings_v1');if(s){var p=JSON.parse(s);if(p.theme)document.documentElement.setAttribute('data-theme',p.theme);if(p.motion)document.documentElement.setAttribute('data-motion',p.motion);if(p.accessibility&&p.accessibility.highContrast)document.documentElement.setAttribute('data-contrast','high');if(p.accessibility&&p.accessibility.largeText)document.documentElement.setAttribute('data-large-text','true');if(p.accessibility&&p.accessibility.disableTransparency)document.documentElement.setAttribute('data-no-blur','true');}else{document.documentElement.setAttribute('data-theme','midnight');}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-screen bg-bg-primary text-text-primary antialiased selection:bg-accent selection:text-white">
        <DisplaySettingsProvider>
          <CinematicBackground />
          <CinematicCursor />
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "var(--surface-elevated)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
                backdropFilter: "blur(12px)",
              },
            }}
          />
          {children}
        </DisplaySettingsProvider>
      </body>
    </html>
  );
}
