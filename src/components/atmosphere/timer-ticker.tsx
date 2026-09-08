"use client";

import { useEffect } from "react";
import { usePlayer } from "@/store/player";

/** Drives the sleep-timer countdown, the final-minute audio fade, and star dimming. */
export default function TimerTicker() {
  useEffect(() => {
    const t = setInterval(() => usePlayer.getState().tick(), 1000);
    return () => clearInterval(t);
  }, []);
  return null;
}
