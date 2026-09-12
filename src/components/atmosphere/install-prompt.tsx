"use client";

import { useEffect, useState } from "react";
import { Download, MoonStar, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

/**
 * "Take the night home" — when Android Chrome offers the install, the event
 * is held back and offered again in the page's own voice. iPhone never fires
 * beforeinstallprompt, so it receives the share-sheet recipe instead.
 * Hidden once installed; dismissed for the rest of the day on ✕.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "luna-install-dismissed";
const today = () => new Date().toISOString().slice(0, 10);

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    // iOS Safari's own flag, outside the standard
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [dismissedDay, setDismissedDay] = useState<string | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isStandalone()) return; // already living on a home screen

    const onPrompt = (e: Event) => {
      e.preventDefault(); // the page asks in its own time, not Chrome's banner
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      toast({
        title: "luna drift lives on your home screen now",
        description: "full screen, offline, and the stars come along.",
      });
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // iOS never fires the install event — offer the share-sheet recipe instead
    const ua = window.navigator.userAgent;
    const touchIos =
      /iPad|iPhone|iPod/.test(ua) ||
      (ua.includes("Macintosh") && window.navigator.maxTouchPoints > 1);

    // let the intro curtain finish before whispering about installation
    const t = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(DISMISS_KEY);
        if (raw) setDismissedDay(raw);
      } catch {
        /* storage shy — show anyway */
      }
      if (touchIos) setIsIos(true);
      setReady(true);
    }, 4200);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.clearTimeout(t);
    };
  }, []);

  if (installed || !ready) return null;
  if (!deferred && !isIos) return null;
  if (dismissedDay === today()) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, today());
    } catch {
      /* noop */
    }
    setDismissedDay(today());
  };

  const install = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        setDeferred(null); // appinstalled will close the chip
      } else {
        dismiss();
      }
    } catch {
      dismiss();
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Install Luna Drift as an app"
      className="immersive-hide fixed bottom-24 right-4 z-[68] w-[min(92vw,20.5rem)] sm:right-6"
    >
      <div className="glass-chip relative overflow-hidden rounded-2xl p-4 shadow-[0_24px_70px_-20px_rgba(2,4,12,0.95)] ring-1 ring-moon-200/25">
        <div
          aria-hidden="true"
          className="anim-breathe pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(205,180,124,0.14),transparent_70%)]"
        />
        <div className="relative">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-moon-300/80">
                <MoonStar className="h-3 w-3" aria-hidden="true" />
                android &amp; iphone
              </p>
              <p className="mt-1 font-serif text-base text-moon-100">take the night home</p>
              <p className="mt-1 text-[11px] leading-relaxed text-mist-500">
                {deferred
                  ? "install luna drift as an app — full screen, offline, stars included."
                  : "on iphone: share, then “add to home screen” — the night moves in."}
              </p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss install suggestion"
              className="rounded-full p-1.5 text-mist-400 transition hover:bg-moon-200/10 hover:text-moon-100"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
          {deferred && (
            <button
              type="button"
              onClick={install}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-moon-200 px-4 py-2 text-xs font-medium text-night-950 transition hover:bg-moon-100"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              install the app
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
