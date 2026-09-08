"use client";

import { CloudRain, Flame, Info, Volume2, Wind, Shuffle } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { usePlayer } from "@/store/player";
import { MIXER_LAYERS, MIX_PRESETS, TONIGHTS_PICK, type MixerLayerId } from "@/lib/soundscapes";

const LAYER_ICONS = {
  rain: CloudRain,
  wind: Wind,
  fire: Flame,
} as const;

const LAYER_ACCENTS: Record<MixerLayerId, string> = {
  rain: "#8fa1c4",
  wind: "#b7c6e2",
  fire: "#e09659",
};

export default function Mixer() {
  const mix = usePlayer((s) => s.mix);
  const masterVolume = usePlayer((s) => s.masterVolume);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const setMixLayer = usePlayer((s) => s.setMixLayer);
  const setMasterVolume = usePlayer((s) => s.setMasterVolume);
  const applyPreset = usePlayer((s) => s.applyPreset);
  const playSoundscape = usePlayer((s) => s.playSoundscape);

  const onLayerChange = (id: MixerLayerId, v: number) => {
    // dragging a layer while silent gently wakes tonight's drift
    if (!isPlaying && v > 0) playSoundscape(TONIGHTS_PICK);
    setMixLayer(id, v);
  };

  return (
    <section id="mixer" aria-label="Soundscape mixer" className="relative mt-24 sm:mt-32">
      <div className="mx-auto max-w-6xl px-5">
        <div className="glass-panel relative overflow-hidden rounded-[2rem] p-6 sm:p-10">
          {/* faint aurora inside the panel */}
          <div
            aria-hidden="true"
            className="anim-drift pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(127,174,154,0.12),transparent_70%)]"
          />
          <div className="relative grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            {/* left: copy + presets */}
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-moon-300/80">The Mixer</p>
              <h2 className="mt-3 font-serif text-3xl font-light text-moon-100 sm:text-4xl">
                Layer your own night
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-mist-300">
                Pull the sliders to weave rain, wind and fire over any soundscape. Every layer is
                synthesized live — they never loop out of step.
              </p>

              <div className="mt-7 space-y-2.5">
                <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-mist-400">
                  <Shuffle className="h-3 w-3" aria-hidden="true" /> drift presets
                </p>
                {MIX_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="group flex w-full items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-left transition hover:border-moon-200/25 hover:bg-moon-200/[0.06]"
                  >
                    <span>
                      <span className="block text-sm text-moon-100">{p.name}</span>
                      <span className="mt-0.5 block text-[11px] text-mist-400">{p.blurb}</span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="flex gap-1"
                    >
                      {(["rain", "wind", "fire"] as MixerLayerId[]).map((id) =>
                        p[id] > 0 ? (
                          <span
                            key={id}
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ background: LAYER_ACCENTS[id], opacity: 0.35 + p[id] * 0.65 }}
                          />
                        ) : null
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* right: sliders */}
            <div className="flex flex-col justify-center gap-7">
              {MIXER_LAYERS.map((layer) => {
                const Icon = LAYER_ICONS[layer.id];
                const value = Math.round(mix[layer.id] * 100);
                return (
                  <div key={layer.id}>
                    <div className="mb-2.5 flex items-center justify-between">
                      <label
                        htmlFor={`mixer-${layer.id}`}
                        className="flex items-center gap-2.5 text-sm text-moon-100"
                      >
                        <span
                          className="flex h-8 w-8 items-center justify-center rounded-full ring-1 ring-white/10"
                          style={{
                            background: `${LAYER_ACCENTS[layer.id]}14`,
                            boxShadow: `0 0 16px ${LAYER_ACCENTS[layer.id]}22`,
                          }}
                        >
                          <Icon className="h-3.5 w-3.5" style={{ color: LAYER_ACCENTS[layer.id] }} aria-hidden="true" />
                        </span>
                        {layer.name}
                        <span className="hidden text-xs text-mist-500 sm:inline">· {layer.blurb}</span>
                      </label>
                      <span className="font-mono text-xs text-mist-300">{value}%</span>
                    </div>
                    <Slider
                      id={`mixer-${layer.id}`}
                      value={[value]}
                      max={100}
                      step={1}
                      aria-label={`${layer.name} intensity`}
                      onValueChange={(vals) => onLayerChange(layer.id, (vals[0] ?? 0) / 100)}
                      className="[&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:bg-white/8"
                    />
                  </div>
                );
              })}

              <div className="hairline my-1" />

              <div>
                <div className="mb-2.5 flex items-center justify-between">
                  <label htmlFor="master-vol" className="flex items-center gap-2.5 text-sm text-moon-100">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-moon-200/10 ring-1 ring-moon-200/30">
                      <Volume2 className="h-3.5 w-3.5 text-moon-200" aria-hidden="true" />
                    </span>
                    Master volume
                  </label>
                  <span className="font-mono text-xs text-mist-300">
                    {Math.round(masterVolume * 100)}%
                  </span>
                </div>
                <Slider
                  id="master-vol"
                  value={[Math.round(masterVolume * 100)]}
                  max={100}
                  step={1}
                  aria-label="Master volume"
                  onValueChange={(vals) => setMasterVolume((vals[0] ?? 0) / 100)}
                  className="[&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:bg-white/8"
                />
              </div>

              {!isPlaying && (
                <p className="flex items-center gap-2 rounded-xl bg-moon-200/[0.05] px-4 py-3 text-xs text-mist-400">
                  <Info className="h-3.5 w-3.5 shrink-0 text-moon-300/70" aria-hidden="true" />
                  Drag a layer and tonight&apos;s drift will begin with it woven in.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
