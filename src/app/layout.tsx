import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
});

const body = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Luna Drift — Sleep Meditation & Ambient Soundscapes",
  description:
    "Drift into deep sleep with looping ambient soundscapes, narrated sleep stories, a layered sound mixer, and a gentle sleep timer with fade-out.",
  keywords: [
    "sleep",
    "meditation",
    "ASMR",
    "ambient soundscape",
    "sleep timer",
    "rain sounds",
    "white noise",
  ],
  authors: [{ name: "Luna Drift" }],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Luna Drift",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "Luna Drift — Sleep Meditation & Ambient Soundscapes",
    description:
      "Looping rain, ocean, fire and piano soundscapes with narrated sleep stories and a fading sleep timer.",
    siteName: "Luna Drift",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#04060f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${display.variable} ${body.variable} ${mono.variable} antialiased bg-background text-foreground font-sans`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
