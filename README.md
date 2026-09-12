# Luna Drift

A sleep meditation & ambient soundscapes web app. All soundscape audio is **procedurally synthesized** via the Web Audio API — no audio files for the 9 soundscapes, infinite seamless loops with zero assets. Installable as a PWA (works offline on Android/iOS).

## Stack

- **Next.js 16** (Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS 4** + **shadcn/ui**
- **Prisma** (SQLite) — profile, sleep sessions, dream notes
- **Zustand** (persisted state) + **Web Audio API** (procedural audio)
- **Framer Motion** for animations

## Features

- **9 soundscapes** (Rain, Forest, Ocean, Cafe, Fireplace, Piano, Night Train, Singing Bowls, Snowfall) — all synthesized live
- **3-layer mixer** with presets, share links (`#mix=`), import/export, per-room trims, night-cap loudness ceiling
- **5 narrated sleep stories** with TTS narration, drop-cap reader, narration ducking, resume memory, favorite pinning
- **4-7-8 breathing guide** + 11-station guided body scan (with haptics)
- **Sleep timer** — 30/60/90 min, +15 min extension, last-bell chime, wake-light alarm, drift-till-dawn, drift-for-hours auto-renew
- **Wind-down sequences** — premade + custom, auto-handover to silence, `#seq=` share links
- **Journal** — navigable month constellation heatmap, night-rhythm histogram, sparkline, insights, night-card PNG export, CSV ledger, weekly digest
- **Dream notebook** (full CRUD)
- **Atmosphere** — audio-reactive starfield, full-page weather (snow/rain/embers), moon arc, cursor trail, intro curtain, film grain, vignette
- **PWA** — service worker (offline shell + media), install prompt, manifest shortcuts, deep links, touch polish, Media Session, screen wake lock
- **Keyboard** — `1`–`9` soundscapes, `Space` play/pause, `M` immersion, `?` shortcuts dialog

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Set up the database
cp .env.example .env
npx prisma generate
npx prisma db push

# 3. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Note:** `package.json` scripts reference `bun` for `start`. For the dev server, `npm run dev` works with Node. To use production `start`, install [Bun](https://bun.sh) or replace the `bun` call with `node`.

## Project structure

```
src/
├── app/                    # Next.js routes + API routes
│   ├── api/                # /api/profile, /api/sessions, /api/dreams
│   ├── globals.css         # Design tokens, keyframes, utilities
│   ├── layout.tsx          # Root layout (fonts, metadata, PWA)
│   └── page.tsx            # Main page composition
├── components/
│   ├── atmosphere/         # 21 ambient components (starfield, weather, SW, etc.)
│   ├── sections/           # 12 page sections (hero, library, mixer, stories...)
│   └── ui/                 # shadcn/ui components
├── lib/                    # audio-engine, db, journal, moon, sequences, stories...
├── store/                  # Zustand player store
└── hooks/                  # use-mobile, use-toast
prisma/schema.prisma        # Profile, SleepSession, DreamNote
public/                     # Images, narration WAVs, manifest, service worker
scripts/                    # Generation & QA scripts
```

## License

MIT
