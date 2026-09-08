export default function SiteFooter() {
  return (
    <footer className="mt-auto">
      <div className="mx-auto max-w-6xl px-5 pb-8 pt-16">
        <div className="hairline" />
        <div className="mt-7 flex flex-col items-center justify-between gap-5 pb-[env(safe-area-inset-bottom)] sm:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-moon-200/10 ring-1 ring-moon-200/25">
              <span className="block h-3 w-3 rounded-full bg-moon-200 shadow-[0_0_10px_rgba(236,226,200,0.6)]" />
            </span>
            <span className="font-serif text-base tracking-wide text-moon-100">
              Luna <span className="italic text-moon-300">Drift</span>
            </span>
          </div>

          <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-mist-400">
            <a href="#tonight" className="transition hover:text-moon-200">Tonight</a>
            <a href="#library" className="transition hover:text-moon-200">Library</a>
            <a href="#mixer" className="transition hover:text-moon-200">Mixer</a>
            <a href="#stories" className="transition hover:text-moon-200">Stories</a>
            <a href="#breathe" className="transition hover:text-moon-200">Breathe</a>
            <a href="#timer" className="transition hover:text-moon-200">Timer</a>
            <a href="#journal" className="transition hover:text-moon-200">Journal</a>
          </nav>

          <p className="text-center text-[11px] italic leading-relaxed text-mist-500">
            sleep well — the moon keeps watch
            <span className="mt-0.5 block not-italic text-mist-600">made for quiet hours · headphones advised</span>
            <span className="mt-1 block font-mono text-[10px] not-italic tracking-wide text-mist-600/80">
              space play/pause · 1–7 soundscapes · m immersion
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
