import type { Metadata } from "next";
import { assertRuntimeEnvironment } from "@/lib/env";
import { AmbientPointer } from "@/app/components/AmbientPointer";
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
    <html lang="en" suppressHydrationWarning>
      <body><AmbientPointer />{children}</body>
    </html>
  );
}
