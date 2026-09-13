import type { Metadata } from "next";
import { assertRuntimeEnvironment } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: "Giggle Gallery — Art that feels like you", template: "%s | Giggle Gallery" },
  description: "Discover original art curated around your mood, personality and visual taste.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Giggle Gallery" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  assertRuntimeEnvironment();
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
