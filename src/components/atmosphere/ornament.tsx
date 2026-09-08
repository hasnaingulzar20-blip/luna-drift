import { cn } from "@/lib/utils";

/** A tiny four-point star between two hairlines — a quiet divider for section internals. */
export default function Ornament({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)} aria-hidden="true">
      <span className="hairline flex-1" />
      <svg width="14" height="14" viewBox="0 0 14 14" className="text-moon-300/70">
        <path
          d="M7 0.8 L8.3 5.7 L13.2 7 L8.3 8.3 L7 13.2 L5.7 8.3 L0.8 7 L5.7 5.7 Z"
          fill="currentColor"
        />
      </svg>
      <span className="hairline flex-1" />
    </div>
  );
}
