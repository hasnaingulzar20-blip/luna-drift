"use client";

import { useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CloudRain,
  Flame,
  Info,
  Link2,
  Plus,
  SlidersHorizontal,
  Star,
  Trash2,
  Volume2,
  Wind,
  Shuffle,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { usePlayer } from "@/store/player";
import { MIXER_LAYERS, MIX_PRESETS, TONIGHTS_PICK, getSoundscape, type MixerLayerId } from "@/lib/soundscapes";
import { buildMixLink } from "@/components/atmosphere/shared-mix";

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
  const customPresets = usePlayer((s) => s.customPresets);
  const saveCustomPreset = usePlayer((s) => s.saveCustomPreset);
  const deleteCustomPreset = usePlayer((s) => s.deleteCustomPreset);
  const exportPresets = usePlayer((s) => s.exportPresets);
  const importPresets = usePlayer((s) => s.importPresets);
  const trims = usePlayer((s) => s.trims);
  const setTrim = usePlayer((s) => s.setTrim);
  const active = usePlayer((s) => s.active);
  const [presetName, setPresetName] = useState("");
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importNote, setImportNote] = useState<string | null>(null);
  const [exportNote, setExportNote] = useState<string | null>(null);
  const importAreaRef = useRef<HTMLTextAreaElement>(null);

  const onLayerChange = (id: MixerLayerId, v: number) => {
    // dragging a layer while silent gently wakes tonight's drift
    if (!isPlaying && v > 0) playSoundscape(TONIGHTS_PICK);
    setMixLayer(id, v);
  };

  return (
    <section id="mixer" aria-label="Soundscape mixer" className="relative mt-24 scroll-mt-28 sm:mt-32">
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
              <p className="text-[11px] uppercase tracking-[0.3em] text-moon-300/80">
                <span className="text-moon-300/40" aria-hidden="true">III</span>
                <span className="mx-1.5 text-white/20" aria-hidden="true">·</span>The Mixer
              </p>
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

                {/* ── your own presets ── */}
                {customPresets.length > 0 && (
                  <div className="space-y-2.5 pt-2">
                    <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-moon-300/70">
                      <Star className="h-3 w-3 fill-moon-300/40" aria-hidden="true" /> your shelf
                    </p>
                    {customPresets.map((p) => (
                      <div
                        key={p.id}
                        className="group flex w-full items-center justify-between gap-2 rounded-xl border border-moon-200/15 bg-moon-200/[0.05] px-4 py-3 transition hover:border-moon-200/35"
                      >
                        <button
                          type="button"
                          onClick={() => applyPreset(p)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="block truncate text-sm text-moon-100">{p.name}</span>
                          <span className="mt-0.5 block truncate text-[11px] text-mist-400">
                            {getSoundscape(p.base).name} · rain {Math.round(p.rain * 100)} · wind {Math.round(p.wind * 100)} · fire {Math.round(p.fire * 100)}
                          </span>
                        </button>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={async () => {
                              const link = buildMixLink({
                                name: p.name,
                                base: p.base,
                                rain: p.rain,
                                wind: p.wind,
                                fire: p.fire,
                              });
                              try {
                                await navigator.clipboard.writeText(link);
                                setExportNote(`link copied for “${p.name}”`);
                              } catch {
                                setExportNote("could not reach the clipboard");
                              }
                              setTimeout(() => setExportNote(null), 2600);
                            }}
                            aria-label={`Copy share link for ${p.name}`}
                            title="Copy a share link for this mix"
                            className="flex h-8 w-8 items-center justify-center rounded-full text-mist-500 opacity-0 ring-1 ring-white/10 transition hover:bg-moon-200/10 hover:text-moon-200 focus-visible:opacity-100 group-hover:opacity-100"
                          >
                            <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteCustomPreset(p.id)}
                            aria-label={`Delete preset ${p.name}`}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-mist-500 opacity-0 ring-1 ring-white/10 transition hover:bg-red-500/10 hover:text-red-300 focus-visible:opacity-100 group-hover:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── save current mix ── */}
                {saving ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (saveCustomPreset(presetName)) {
                        setPresetName("");
                        setSaving(false);
                      }
                    }}
                    className="flex items-center gap-2 rounded-xl border border-moon-200/20 bg-white/[0.03] px-3 py-2"
                  >
                    <input
                      autoFocus
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setSaving(false);
                          setPresetName("");
                        }
                      }}
                      placeholder="Name this mix…"
                      maxLength={32}
                      aria-label="Preset name"
                      className="min-w-0 flex-1 bg-transparent text-sm text-moon-100 outline-none placeholder:text-mist-600"
                    />
                    <button
                      type="submit"
                      disabled={!presetName.trim()}
                      className="rounded-full bg-moon-200 px-3 py-1 text-[11px] font-medium text-night-950 transition disabled:opacity-30"
                    >
                      Keep
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSaving(true)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/10 px-4 py-2.5 text-xs text-mist-400 transition hover:border-moon-200/30 hover:text-moon-100"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Keep the current mix as a preset
                  </button>
                )}

                {/* ── import / export the shelf ── */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      if (customPresets.length === 0) {
                        setExportNote("the shelf is empty — keep a mix first");
                        setTimeout(() => setExportNote(null), 2600);
                        return;
                      }
                      const json = exportPresets();
                      try {
                        await navigator.clipboard.writeText(json);
                        setExportNote("copied to clipboard");
                      } catch {
                        setExportNote("downloaded as file");
                        const blob = new Blob([json], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "luna-mix-presets.json";
                        a.click();
                        URL.revokeObjectURL(url);
                      }
                      setTimeout(() => setExportNote(null), 2600);
                    }}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/[0.03] px-3 py-2 text-[11px] text-mist-300 ring-1 ring-white/10 transition hover:bg-moon-200/10 hover:text-moon-100"
                  >
                    <ArrowUpFromLine className="h-3 w-3" aria-hidden="true" />
                    Share mixes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImportOpen((v) => !v);
                      setImportNote(null);
                      setTimeout(() => importAreaRef.current?.focus(), 50);
                    }}
                    aria-expanded={importOpen}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/[0.03] px-3 py-2 text-[11px] text-mist-300 ring-1 ring-white/10 transition hover:bg-moon-200/10 hover:text-moon-100"
                  >
                    <ArrowDownToLine className="h-3 w-3" aria-hidden="true" />
                    Import mixes
                  </button>
                </div>
                {exportNote && (
                  <p className="text-[11px] text-moon-300" aria-live="polite">
                    {exportNote}
                  </p>
                )}
                {importOpen && (
                  <div className="rounded-xl border border-moon-200/20 bg-white/[0.03] p-3">
                    <label htmlFor="preset-import" className="sr-only">
                      Paste shared mix presets as JSON
                    </label>
                    <textarea
                      id="preset-import"
                      ref={importAreaRef}
                      value={importJson}
                      onChange={(e) => {
                        setImportJson(e.target.value);
                        setImportNote(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setImportOpen(false);
                      }}
                      rows={4}
                      placeholder='[{"name":"Quiet Rain","base":"rain","rain":0.8,"wind":0.1,"fire":0}]'
                      className="w-full resize-none rounded-lg border border-white/10 bg-night-950/40 px-3 py-2 font-mono text-[11px] leading-relaxed text-moon-100 outline-none transition placeholder:text-mist-600 focus:border-moon-200/40"
                    />
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-moon-300" aria-live="polite">
                        {importNote}
                      </span>
                      <button
                        type="button"
                        disabled={!importJson.trim()}
                        onClick={() => {
                          const { added, skipped } = importPresets(importJson);
                          setImportNote(
                            added === 0 && skipped === 0
                              ? "nothing readable in there"
                              : `${added} added · ${skipped} skipped`
                          );
                          if (added > 0) {
                            setImportJson("");
                            setImportOpen(false);
                          }
                        }}
                        className="rounded-full bg-moon-200 px-3.5 py-1 text-[11px] font-medium text-night-950 transition disabled:opacity-30"
                      >
                        Add to shelf
                      </button>
                    </div>
                  </div>
                )}
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

              {/* per-soundscape room level — every room has its own voice */}
              {active && (
                <div>
                  <div className="mb-2.5 flex items-center justify-between">
                    <label
                      htmlFor="base-trim"
                      className="flex items-center gap-2.5 text-sm text-moon-100"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.04] ring-1 ring-white/10">
                        <SlidersHorizontal
                          className="h-3.5 w-3.5 text-mist-300"
                          aria-hidden="true"
                        />
                      </span>
                      Room level
                      <span className="hidden text-xs text-mist-500 sm:inline">
                        · {getSoundscape(active).name}
                      </span>
                    </label>
                    <span className="font-mono text-xs text-mist-300">
                      {Math.round((trims[active] ?? 1) * 100)}%
                    </span>
                  </div>
                  <Slider
                    id="base-trim"
                    value={[Math.round((trims[active] ?? 1) * 100)]}
                    min={40}
                    max={120}
                    step={5}
                    aria-label={`Room level for ${getSoundscape(active).name}`}
                    onValueChange={(vals) => setTrim(active, (vals[0] ?? 100) / 100)}
                    className="[&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:bg-white/8"
                  />
                  <p className="mt-1.5 text-[11px] text-mist-600">
                    some rooms carry further than others — set each one once, it is remembered
                  </p>
                </div>
              )}

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
