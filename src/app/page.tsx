"use client";

import { useEffect } from "react";
import Starfield from "@/components/atmosphere/starfield";
import MoonArc from "@/components/atmosphere/moon-arc";
import CursorTrail from "@/components/atmosphere/cursor-trail";
import TimerTicker from "@/components/atmosphere/timer-ticker";
import SiteHeader from "@/components/sections/site-header";
import Hero from "@/components/sections/hero";
import Library from "@/components/sections/library";
import Mixer from "@/components/sections/mixer";
import Stories from "@/components/sections/stories";
import SleepTimer from "@/components/sections/sleep-timer";
import Journal from "@/components/sections/journal";
import SiteFooter from "@/components/sections/site-footer";
import ImmersiveHint from "@/components/sections/immersive-hint";
import { usePlayer } from "@/store/player";

export default function Home() {
  const immersive = usePlayer((s) => s.immersive);

  // immersion locks scrolling, Esc returns
  useEffect(() => {
    document.documentElement.classList.toggle("immersive", immersive);
    if (immersive) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") usePlayer.getState().setImmersive(false);
      };
      window.addEventListener("keydown", onKey);
      return () => {
        document.body.style.overflow = prev;
        window.removeEventListener("keydown", onKey);
      };
    }
  }, [immersive]);

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* ── the night sky (always visible) ── */}
      <Starfield />
      <MoonArc />
      <CursorTrail />
      <TimerTicker />

      {/* ── the interface (fades away in immersion) ── */}
      <div
        className={`relative z-10 flex min-h-screen flex-col ${
          immersive ? "immersive-hide" : "immersive-show"
        }`}
      >
        <SiteHeader />

        <main className="flex-1">
          <Hero />
          <Library />
          <Mixer />
          <Stories />
          <SleepTimer />
          <Journal />
        </main>

        <SiteFooter />
      </div>

      {immersive && <ImmersiveHint />}

      {/* screen-reader summary of ambient state */}
      <p className="sr-only" aria-live="polite">
        {immersive
          ? "Immersive mode. Press escape or tap the moon to bring back the interface."
          : ""}
      </p>
    </div>
  );
}
