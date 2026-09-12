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

const BASE_URL = "https://lunadrift-seven.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Luna Drift — Sleep Meditation & Ambient Soundscapes | Free ASMR & Rain Sounds",
    template: "%s | Luna Drift",
  },
  description:
    "Free sleep meditation app with 9 ambient soundscapes — rain, ocean, fireplace, forest, cafe, piano, singing bowls, snowfall & more. Procedurally generated for infinite, seamless looping. Includes narrated sleep stories, 4-7-8 breathing guide, sleep timer with fade-out, and a wind-down sequencer. No sign-up required. Works offline as a PWA.",
  keywords: [
    "sleep sounds",
    "sleep meditation",
    "ASMR",
    "rain sounds for sleep",
    "ambient soundscape",
    "white noise",
    "sleep timer",
    "sleep stories",
    "breathing guide",
    "4-7-8 breathing",
    "ocean sounds",
    "fireplace sounds",
    "forest sounds",
    "cafe sounds",
    "piano sleep music",
    "singing bowls",
    "snow sounds",
    "night train sounds",
    "sleep app",
    "free sleep app",
    "insomnia relief",
    "relaxation sounds",
    "deep sleep",
    "sleep mixer",
    "wind down",
    "bedtime sounds",
    "nature sounds for sleep",
  ],
  authors: [{ name: "Luna Drift" }],
  creator: "Luna Drift",
  publisher: "Luna Drift",
  manifest: "/manifest.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: BASE_URL,
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Luna Drift",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "Luna Drift — Free Sleep Meditation & Ambient Soundscapes",
    description:
      "Drift into deep sleep with 9 seamless ambient soundscapes (rain, ocean, fire, forest, cafe, piano, bowls, snow, train), narrated sleep stories, a 3-layer sound mixer, 4-7-8 breathing guide, and a gentle sleep timer with fade-out. Free, no sign-up, works offline.",
    siteName: "Luna Drift",
    type: "website",
    url: BASE_URL,
    locale: "en_US",
    images: [
      {
        url: "/screenshots/wide.png",
        width: 1280,
        height: 800,
        alt: "Luna Drift — sleep meditation app with starfield and ambient soundscapes",
      },
      {
        url: "/screenshots/narrow.png",
        width: 390,
        height: 844,
        alt: "Luna Drift mobile — sleep timer and sound mixer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Luna Drift — Free Sleep Meditation & Ambient Soundscapes",
    description:
      "9 seamless ambient soundscapes, narrated sleep stories, breathing guide, sleep timer with fade-out. Free, no sign-up, works offline.",
    images: ["/screenshots/wide.png"],
  },
  category: "health",
  classification: "Health & Wellness",
};

export const viewport: Viewport = {
  themeColor: "#04060f",
  width: "device-width",
  initialScale: 1,
  // let the sky reach under the gesture bar / notch on phones
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Luna Drift",
    url: BASE_URL,
    description:
      "Free sleep meditation app with 9 ambient soundscapes, narrated sleep stories, breathing guide, and sleep timer. Works offline as a PWA.",
    applicationCategory: "HealthApplication",
    operatingSystem: "Any (web browser, PWA installable)",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "9 procedurally-synthesized soundscapes (rain, ocean, fireplace, forest, cafe, piano, singing bowls, snowfall, night train)",
      "3-layer sound mixer with presets and share links",
      "5 narrated sleep stories with TTS narration",
      "4-7-8 breathing guide with haptics",
      "11-station guided body scan",
      "Sleep timer with fade-out and last-bell chime",
      "Wake-light alarm with sunrise overlay",
      "Wind-down sequences with auto-handover to silence",
      "Sleep journal with constellation heatmap and insights",
      "Dream notebook",
      "Offline support via service worker (PWA)",
      "Keyboard shortcuts",
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "5",
      reviewCount: "1",
    },
    screenshot: `${BASE_URL}/screenshots/wide.png`,
    genre: ["Meditation", "Sleep Aid", "ASMR", "Ambient Music"],
  };

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${display.variable} ${body.variable} ${mono.variable} antialiased bg-background text-foreground font-sans`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
