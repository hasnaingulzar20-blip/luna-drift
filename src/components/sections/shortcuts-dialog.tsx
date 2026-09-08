"use client";

import { useEffect, useState } from "react";
import { Keyboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["Space"], label: "Play or pause tonight's drift" },
  { keys: ["1", "…", "7"], label: "Drift straight into a soundscape" },
  { keys: ["M"], label: "Immersive mode — the sky alone" },
  { keys: ["Esc"], label: "Return from immersion, close panels" },
  { keys: ["?"], label: "This little guide" },
];

/** Quiet keys — the keyboard is a remote control for the night. */
export default function ShortcutsDialog() {
  const [open, setOpen] = useState(false);

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
      if (e.key === "?" && !e.repeat) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onShow = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("luna:show-shortcuts", onShow as EventListener);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("luna:show-shortcuts", onShow as EventListener);
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md gap-5 rounded-3xl border-white/10 bg-night-900/95 p-7 data-[state=open]:animate-in data-[state=closed]:animate-out">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 font-serif text-2xl font-light text-moon-100">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-moon-200/10 ring-1 ring-moon-200/30">
              <Keyboard className="h-4 w-4 text-moon-200" aria-hidden="true" />
            </span>
            Quiet keys
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-mist-300">
            The keyboard is a remote control for the night — reach for it without
            opening your eyes.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2.5">
          {SHORTCUTS.map((s) => (
            <li
              key={s.label}
              className="flex items-center justify-between gap-4 rounded-xl bg-white/[0.03] px-4 py-3 ring-1 ring-white/6"
            >
              <span className="text-sm text-mist-200">{s.label}</span>
              <span className="flex shrink-0 items-center gap-1" aria-label={s.keys.join(" ")}>
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="rounded-md border border-white/15 bg-white/[0.06] px-2 py-0.5 font-mono text-[11px] text-moon-100 shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)]"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
