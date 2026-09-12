"use client";

import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";

const CONSENT_KEY = "luna-cookie-consent";

export type ConsentChoice = "accepted" | "declined" | null;

export function getConsent(): ConsentChoice {
  if (typeof window === "undefined") return null;
  try {
    return (localStorage.getItem(CONSENT_KEY) as ConsentChoice) ?? null;
  } catch {
    return null;
  }
}

export function setConsent(choice: "accepted" | "declined") {
  try {
    localStorage.setItem(CONSENT_KEY, choice);
    window.dispatchEvent(new CustomEvent("luna:consent", { detail: choice }));
  } catch {
    /* storage shy */
  }
}

export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const existing = getConsent();
    if (!existing) {
      const t = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  const choose = (choice: "accepted" | "declined") => {
    setConsent(choice);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="immersive-hide fixed bottom-4 left-1/2 z-[80] w-[min(94vw,30rem)] -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
      <div className="glass-chip rounded-2xl p-5 shadow-[0_24px_70px_-20px_rgba(2,4,12,0.95)] ring-1 ring-moon-200/25">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-moon-300" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-serif text-base text-moon-100">A quiet word about cookies</p>
            <p className="mt-1.5 text-xs leading-relaxed text-mist-400">
              Luna Drift uses cookies for analytics and to show ads that keep the night free.
              You can accept or decline — the choice stays yours.
            </p>
            <div className="mt-3.5 flex gap-2">
              <button
                type="button"
                onClick={() => choose("accepted")}
                className="rounded-full bg-moon-200 px-4 py-2 text-xs font-medium text-night-950 transition hover:bg-moon-100"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => choose("declined")}
                className="rounded-full px-4 py-2 text-xs font-medium text-mist-300 transition hover:bg-moon-200/10 hover:text-moon-100"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
