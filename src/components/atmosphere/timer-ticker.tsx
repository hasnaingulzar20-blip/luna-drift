"use client";

import { useEffect } from "react";
import { usePlayer } from "@/store/player";

/** Drives the sleep-timer countdown, the final-minute audio fade, star dimming, and the wake light. */
export default function TimerTicker() {
  useEffect(() => {
    const t = setInterval(() => {
      const s = usePlayer.getState();
      s.tick();
      s.checkWake();
    }, 1000);
    return () => clearInterval(t);
  }, []);
  return null;
}
