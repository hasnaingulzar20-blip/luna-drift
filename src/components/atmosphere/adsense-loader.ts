"use client";

import { useEffect, useState } from "react";

const ADSENSE_ID = "ca-pub-0000000000000000"; // replace with your publisher ID

function loadAdSense() {
  if (document.getElementById("adsense-script")) return;
  const s = document.createElement("script");
  s.id = "adsense-script";
  s.async = true;
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_ID}`;
  s.crossOrigin = "anonymous";
  document.head.appendChild(s);
}

export function useConsent() {
  const [consent, setConsentState] = useState<"accepted" | "declined" | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("luna-cookie-consent") as typeof consent;
    setConsentState(stored);

    const onConsent = (e: Event) => {
      const detail = (e as CustomEvent).detail as typeof consent;
      setConsentState(detail);
    };
    window.addEventListener("luna:consent", onConsent);
    return () => window.removeEventListener("luna:consent", onConsent);
  }, []);

  useEffect(() => {
    if (consent === "accepted") loadAdSense();
  }, [consent]);

  return consent;
}
