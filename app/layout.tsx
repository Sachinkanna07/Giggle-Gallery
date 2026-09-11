import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Giggle Gallery — Art that feels like you",
  description: "Discover original art curated around your mood, personality and visual taste.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
