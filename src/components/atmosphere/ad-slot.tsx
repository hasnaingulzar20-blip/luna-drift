"use client";

import { useEffect, useRef } from "react";
import { useConsent } from "./adsense-loader";

interface AdSlotProps {
  slot: string;
  format?: "auto" | "fluid" | "rectangle";
  className?: string;
}

export default function AdSlot({
  slot,
  format = "auto",
  className = "",
}: AdSlotProps) {
  const consent = useConsent();
  const insRef = useRef<HTMLModElement>(null);
  const pushedRef = useRef(false);

  useEffect(() => {
    if (consent !== "accepted" || !insRef.current || pushedRef.current) return;
    try {
      // @ts-expect-error adsbygoogle is injected by the AdSense script
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushedRef.current = true;
    } catch {
      /* adsbygoogle not ready yet — will retry on next render */
    }
  }, [consent]);

  if (consent !== "accepted") return null;

  return (
    <div className={`immersive-hide my-6 flex justify-center ${className}`}>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block", minWidth: 300 }}
        data-ad-client="ca-pub-0000000000000000"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
