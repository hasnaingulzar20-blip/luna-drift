"use client";

import { useEffect, useState } from "react";
import { usePlayer } from "@/store/player";

/** In immersive mode: a whisper of UI that appears when the mouse moves, then dissolves. */
export default function ImmersiveHint() {
  const toggleImmersive = usePlayer((s) => s.toggleImmersive);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const show = () => {
      setVisible(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setVisible(false), 2600);
    };
    show();
    window.addEventListener("mousemove", show, { passive: true });
    window.addEventListener("touchstart", show, { passive: true });
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("mousemove", show);
      window.removeEventListener("touchstart", show);
    };
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-8 z-50 flex justify-center transition-all duration-700 ${
        visible ? "immersive-show" : "opacity-0"
      }`}
    >
      <button
        type="button"
        onClick={toggleImmersive}
        className="glass-chip flex items-center gap-3 rounded-full px-5 py-2.5 text-xs text-mist-200 transition hover:text-moon-100"
        aria-label="Exit immersive mode"
      >
        <span className="relative flex h-5 w-5 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-moon-200/25" />
          <span className="block h-3 w-3 rounded-full bg-moon-200 shadow-[0_0_12px_rgba(236,226,200,0.7)]" />
        </span>
        immersion · tap anywhere on the moon to return
      </button>
    </div>
  );
}
