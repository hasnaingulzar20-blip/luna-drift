"use client";

import { useEffect } from "react";
import Starfield from "@/components/atmosphere/starfield";
import MoonArc from "@/components/atmosphere/moon-arc";
import CursorTrail from "@/components/atmosphere/cursor-trail";
import TimerTicker from "@/components/atmosphere/timer-ticker";
import MediaSessionBridge from "@/components/atmosphere/media-session";
import WakeLight from "@/components/atmosphere/wake-light";
import Grain from "@/components/atmosphere/grain";
import Reveal from "@/components/atmosphere/reveal";
import SiteHeader from "@/components/sections/site-header";
import Hero from "@/components/sections/hero";
import Library from "@/components/sections/library";
import Mixer from "@/components/sections/mixer";
import Stories from "@/components/sections/stories";
import Breathe from "@/components/sections/breathe";
import SleepTimer from "@/components/sections/sleep-timer";
import Journal from "@/components/sections/journal";
import SiteFooter from "@/components/sections/site-footer";
import ImmersiveHint from "@/components/sections/immersive-hint";
import { usePlayer } from "@/store/player";
import { SOUNDSCAPES, TONIGHTS_PICK } from "@/lib/soundscapes";

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

  // keyboard shortcuts: space = play/pause · 1–7 = soundscapes · m = immersion
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      ) {
        return;
      }
      const s = usePlayer.getState();
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        if (s.isPlaying) s.stopAll();
        else s.playSoundscape(s.active ?? TONIGHTS_PICK);
      } else if (e.key.toLowerCase() === "m" && !e.repeat) {
        s.toggleImmersive();
      } else if (/^[1-7]$/.test(e.key) && !e.repeat) {
        const sc = SOUNDSCAPES[Number(e.key) - 1];
        if (sc) s.playSoundscape(sc.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* ── the night sky (always visible) ── */}
      <Starfield />
      <MoonArc />
      <CursorTrail />
      <TimerTicker />
      <MediaSessionBridge />
      <Grain />

      {/* ── the interface (fades away in immersion) ── */}
      <div
        className={`relative z-10 flex min-h-screen flex-col ${
          immersive ? "immersive-hide" : "immersive-show"
        }`}
      >
        <SiteHeader />

        <main className="flex-1">
          <Reveal>
            <Hero />
          </Reveal>
          <Reveal delay={40}>
            <Library />
          </Reveal>
          <Reveal delay={40}>
            <Mixer />
          </Reveal>
          <Reveal delay={40}>
            <Stories />
          </Reveal>
          <Reveal delay={40}>
            <Breathe />
          </Reveal>
          <Reveal delay={40}>
            <SleepTimer />
          </Reveal>
          <Reveal delay={40}>
            <Journal />
          </Reveal>
        </main>

        <SiteFooter />
      </div>

      {immersive && <ImmersiveHint />}

      {/* the dawn, when it comes */}
      <WakeLight />

      {/* screen-reader summary of ambient state */}
      <p className="sr-only" aria-live="polite">
        {immersive
          ? "Immersive mode. Press escape or tap the moon to bring back the interface."
          : ""}
      </p>
    </div>
  );
}
