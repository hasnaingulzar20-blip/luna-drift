"use client";

import { useEffect } from "react";
import { toast } from "@/hooks/use-toast";

/**
 * Registers the service worker so Luna Drift can be installed on Android and
 * keeps humming when the signal does not. When a newer night has downloaded
 * in the background, a quiet whisper offers the reload — never a demand.
 */
export default function SwRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // secure contexts only — localhost and the https preview both qualify
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
      return;
    }

    let cancelled = false;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        if (cancelled || !reg) return;

        // a waiting worker means an update was prepared while we were away
        const announce = (worker: ServiceWorker | null) => {
          if (!worker || worker.state !== "installed") return;
          // first install has no controller yet — the night is simply new
          if (!navigator.serviceWorker.controller) return;
          toast({
            title: "a newer night is ready",
            description: "reload when you're ready — the stars will wait.",
          });
        };

        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => announce(worker));
        });
        if (reg.waiting) announce(reg.waiting);
      } catch {
        /* the night works without a service worker too */
      }
    };

    void register();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
