/**
 * Luna Drift — procedural soundscape engine.
 *
 * Everything is synthesized live with the Web Audio API so loops are
 * seamless and infinite, and mixer layers (rain / wind / fire) can be
 * stacked over any base soundscape in real time.
 */

export type SoundscapeId =
  | "rain"
  | "forest"
  | "ocean"
  | "cafe"
  | "fireplace"
  | "piano"
  | "train"
  | "bowls"
  | "snow";

export type MixLayerId = "rain" | "wind" | "fire";

type Dispose = () => void;
type Builder = (ctx: AudioContext, out: GainNode) => Dispose;

/* ─────────────────────────── helpers ─────────────────────────── */

const rnd = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function makeNoiseBuffer(ctx: AudioContext, kind: "white" | "pink" | "brown", seconds = 4): AudioBuffer {
  const length = ctx.sampleRate * seconds;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  if (kind === "white") {
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  } else if (kind === "brown") {
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
  } else {
    // pink (Paul Kellet approximation)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }
  return buffer;
}

class Timers {
  private timers: ReturnType<typeof setTimeout>[] = [];
  after(ms: number, fn: () => void) {
    const t = setTimeout(() => {
      this.timers = this.timers.filter((x) => x !== t);
      fn();
    }, ms);
    this.timers.push(t);
    return t;
  }
  every(ms: number, fn: () => void) {
    let alive = true;
    const loop = () => {
      if (!alive) return;
      fn();
      this.after(ms, loop);
    };
    this.after(ms, loop);
    return () => {
      alive = false;
    };
  }
  dispose() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }
}

interface Sources {
  nodes: AudioScheduledSourceNode[];
}
function noiseSource(ctx: AudioContext, s: Sources, kind: "white" | "pink" | "brown"): AudioBufferSourceNode {
  const src = ctx.createBufferSource();
  src.buffer = makeNoiseBuffer(ctx, kind);
  src.loop = true;
  src.start();
  s.nodes.push(src);
  return src;
}

/* one short filtered-noise burst (used for droplets, crackles, clinks…) */
function burst(
  ctx: AudioContext,
  out: AudioNode,
  opts: {
    kind?: "white" | "pink" | "brown";
    filter: { type: BiquadFilterType; freq: number; q?: number };
    gain: number;
    attack?: number;
    decay: number;
  }
) {
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = makeNoiseBuffer(ctx, opts.kind ?? "white", opts.decay + 0.5);
  const f = ctx.createBiquadFilter();
  f.type = opts.filter.type;
  f.frequency.value = opts.filter.freq;
  if (opts.filter.q) f.Q.value = opts.filter.q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(opts.gain, 0.0002), t + (opts.attack ?? 0.004));
  g.gain.exponentialRampToValueAtTime(0.0001, t + opts.decay);
  src.connect(f).connect(g).connect(out);
  src.start(t);
  src.stop(t + opts.decay + 0.1);
}

/* one tonal ping with pitch envelope (birds, clinks, hoots, notes…) */
function tone(
  ctx: AudioContext,
  out: AudioNode,
  opts: {
    type?: OscillatorType;
    freq: number;
    freqEnd?: number;
    glide?: number;
    gain: number;
    attack?: number;
    decay: number;
    lowpass?: number;
    detune?: number;
  }
) {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(opts.freq, t);
  if (opts.glide) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(opts.freqEnd ?? opts.freq, 1),
      t + opts.glide
    );
  }
  if (opts.detune) osc.detune.value = opts.detune;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(opts.gain, 0.0002), t + (opts.attack ?? 0.01));
  g.gain.exponentialRampToValueAtTime(0.0001, t + opts.decay);
  let node: AudioNode = g;
  if (opts.lowpass) {
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = opts.lowpass;
    g.connect(lp);
    node = lp;
  }
  osc.connect(g);
  node.connect(out);
  osc.start(t);
  osc.stop(t + opts.decay + 0.1);
}

/* ─────────────────────── layer builders ──────────────────────── */

const buildRain: Builder = (ctx, out) => {
  const timers = new Timers();
  const s: Sources = { nodes: [] };

  // steady shower bed
  const bed = noiseSource(ctx, s, "white");
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 420;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 6800;
  const bedGain = ctx.createGain();
  bedGain.gain.value = 0.3;
  bed.connect(hp).connect(lp).connect(bedGain).connect(out);

  // slow breathing of the shower intensity
  const swell = ctx.createOscillator();
  swell.frequency.value = 0.05;
  const swellAmt = ctx.createGain();
  swellAmt.gain.value = 0.06;
  swell.connect(swellAmt).connect(bedGain.gain);
  swell.start();
  s.nodes.push(swell);

  // individual droplet plips
  const droplets = timers.every(rnd(90, 140), () => {
    const n = Math.random() < 0.35 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      timers.after(rnd(0, 120), () =>
        burst(ctx, out, {
          filter: { type: "bandpass", freq: rnd(700, 2600), q: rnd(4, 9) },
          gain: rnd(0.015, 0.09),
          decay: rnd(0.03, 0.09),
        })
      );
    }
  });

  // far-off thunder, rare and soft
  const thunder = timers.every(rnd(50000, 95000), () => {
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = makeNoiseBuffer(ctx, "brown", 6);
    const lpT = ctx.createBiquadFilter();
    lpT.type = "lowpass";
    lpT.frequency.setValueAtTime(110, t);
    lpT.frequency.exponentialRampToValueAtTime(45, t + 5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.11, t + 1.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 6);
    src.connect(lpT).connect(g).connect(out);
    src.start(t);
    src.stop(t + 6.2);
  });

  return () => {
    droplets();
    thunder();
    timers.dispose();
    s.nodes.forEach((n) => {
      try {
        n.stop();
      } catch { /* already stopped */ }
    });
  };
};

const buildWind: Builder = (ctx, out) => {
  const timers = new Timers();
  const s: Sources = { nodes: [] };

  const body = noiseSource(ctx, s, "pink");
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 420;
  lp.Q.value = 0.7;
  const g = ctx.createGain();
  g.gain.value = 0.22;
  body.connect(lp).connect(g).connect(out);

  // LFO sculpting the tone of the wind
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.045;
  const lfoAmt = ctx.createGain();
  lfoAmt.gain.value = 260;
  lfo.connect(lfoAmt).connect(lp.frequency);
  lfo.start();

  const lfo2 = ctx.createOscillator();
  lfo2.frequency.value = 0.062;
  const lfo2Amt = ctx.createGain();
  lfo2Amt.gain.value = 0.07;
  lfo2.connect(lfo2Amt).connect(g.gain);
  lfo2.start();

  // leaves catching the gusts
  const leaves = noiseSource(ctx, s, "white");
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 5200;
  bp.Q.value = 0.6;
  const leafGain = ctx.createGain();
  leafGain.gain.value = 0.015;
  leaves.connect(bp).connect(leafGain).connect(out);

  // occasional stronger gust
  const gusts = timers.every(rnd(9000, 16000), () => {
    const t = ctx.currentTime;
    const peak = rnd(0.3, 0.42);
    const up = rnd(2.4, 4);
    const down = rnd(4, 7);
    g.gain.cancelScheduledValues(t);
    g.gain.setTargetAtTime(peak, t, up / 3);
    g.gain.setTargetAtTime(0.2, t + up, down / 3);
    leafGain.gain.setTargetAtTime(rnd(0.05, 0.085), t, up / 3);
    leafGain.gain.setTargetAtTime(0.014, t + up, down / 3);
  });

  s.nodes.push(lfo, lfo2);
  return () => {
    gusts();
    timers.dispose();
    s.nodes.forEach((n) => {
      try {
        n.stop();
      } catch { /* noop */ }
    });
  };
};

const buildFire: Builder = (ctx, out) => {
  const timers = new Timers();
  const s: Sources = { nodes: [] };

  // warm low bed
  const bed = noiseSource(ctx, s, "brown");
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 240;
  const bedGain = ctx.createGain();
  bedGain.gain.value = 0.4;
  bed.connect(lp).connect(bedGain).connect(out);

  // flickering body
  const body = noiseSource(ctx, s, "brown");
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 130;
  bp.Q.value = 0.5;
  const bodyGain = ctx.createGain();
  bodyGain.gain.value = 0.3;
  body.connect(bp).connect(bodyGain).connect(out);

  const flicker = timers.every(320, () => {
    const t = ctx.currentTime;
    bodyGain.gain.setTargetAtTime(rnd(0.2, 0.42), t, 0.28);
  });

  // crackle & pop sparks
  const crackles = timers.every(rnd(70, 160), () => {
    const pops = Math.random() < 0.22 ? 2 : 1;
    for (let i = 0; i < pops; i++) {
      timers.after(rnd(0, 90), () => {
        const loud = Math.random() < 0.14;
        burst(ctx, out, {
          filter: { type: "highpass", freq: rnd(1400, 3400) },
          gain: loud ? rnd(0.16, 0.3) : rnd(0.012, 0.07),
          attack: 0.002,
          decay: rnd(0.02, loud ? 0.14 : 0.07),
        });
      });
    }
  });

  // faint hiss of embers
  const hiss = noiseSource(ctx, s, "white");
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 6500;
  const hissGain = ctx.createGain();
  hissGain.gain.value = 0.006;
  hiss.connect(hp).connect(hissGain).connect(out);

  return () => {
    flicker();
    crackles();
    timers.dispose();
    s.nodes.forEach((n) => {
      try {
        n.stop();
      } catch { /* noop */ }
    });
  };
};

const buildForest: Builder = (ctx, out) => {
  const timers = new Timers();
  const s: Sources = { nodes: [] };

  // soft night-air bed
  const air = noiseSource(ctx, s, "pink");
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 500;
  const airGain = ctx.createGain();
  airGain.gain.value = 0.12;
  air.connect(lp).connect(airGain).connect(out);

  // leaves, random-walking
  const leaves = noiseSource(ctx, s, "white");
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 5600;
  bp.Q.value = 0.7;
  const leafGain = ctx.createGain();
  leafGain.gain.value = 0.028;
  leaves.connect(bp).connect(leafGain).connect(out);

  const leafWalk = timers.every(1400, () => {
    leafGain.gain.setTargetAtTime(rnd(0.014, 0.055), ctx.currentTime, 1.1);
  });

  // crickets: gated 4.3 kHz trills
  const cricketOsc = ctx.createOscillator();
  cricketOsc.type = "sine";
  cricketOsc.frequency.value = 4250;
  const trem = ctx.createOscillator();
  trem.frequency.value = 24;
  const tremAmt = ctx.createGain();
  tremAmt.gain.value = 0.5;
  const cricketGain = ctx.createGain();
  cricketGain.gain.value = 0;
  trem.connect(tremAmt).connect(cricketGain.gain);
  const cricketLp = ctx.createBiquadFilter();
  cricketLp.type = "lowpass";
  cricketLp.frequency.value = 5200;
  cricketOsc.connect(cricketLp).connect(cricketGain).connect(out);
  cricketOsc.start();
  trem.start();
  s.nodes.push(cricketOsc, trem);

  const cricketChirps = timers.every(rnd(2600, 5200), () => {
    const n = Math.floor(rnd(3, 7));
    for (let i = 0; i < n; i++) {
      timers.after(i * 64, () => {
        const t = ctx.currentTime;
        cricketGain.gain.setTargetAtTime(0.006, t, 0.012);
        timers.after(52, () => cricketGain.gain.setTargetAtTime(0.0002, ctx.currentTime, 0.012));
      });
    }
  });

  // night birds — sparse chirp bursts
  const birds = timers.every(rnd(6000, 13000), () => {
    const chirps = Math.floor(rnd(2, 5));
    const base = rnd(2500, 3600);
    for (let i = 0; i < chirps; i++) {
      timers.after(i * rnd(140, 200), () =>
        tone(ctx, out, {
          type: "sine",
          freq: base * rnd(0.95, 1.08),
          freqEnd: base * rnd(0.78, 0.9),
          glide: 0.09,
          gain: rnd(0.025, 0.055),
          decay: 0.14,
          lowpass: 5200,
        })
      );
    }
  });

  // a distant owl, very rare
  const owl = timers.every(rnd(34000, 74000), () => {
    timers.after(0, () =>
      tone(ctx, out, { freq: 356, freqEnd: 322, glide: 0.35, gain: 0.035, attack: 0.06, decay: 0.5, lowpass: 700 })
    );
    timers.after(700, () =>
      tone(ctx, out, { freq: 330, freqEnd: 295, glide: 0.4, gain: 0.032, attack: 0.06, decay: 0.6, lowpass: 700 })
    );
  });

  return () => {
    leafWalk();
    cricketChirps();
    birds();
    owl();
    timers.dispose();
    s.nodes.forEach((n) => {
      try {
        n.stop();
      } catch { /* noop */ }
    });
  };
};

const buildOcean: Builder = (ctx, out) => {
  const timers = new Timers();
  const s: Sources = { nodes: [] };

  const deep = noiseSource(ctx, s, "brown");
  const deepLp = ctx.createBiquadFilter();
  deepLp.type = "lowpass";
  deepLp.frequency.value = 120;
  const deepGain = ctx.createGain();
  deepGain.gain.value = 0.22;
  deep.connect(deepLp).connect(deepGain).connect(out);

  // the wave body — swells in on a schedule
  const wave = noiseSource(ctx, s, "brown");
  const waveLp = ctx.createBiquadFilter();
  waveLp.type = "lowpass";
  waveLp.frequency.value = 620;
  const waveGain = ctx.createGain();
  waveGain.gain.value = 0.1;
  wave.connect(waveLp).connect(waveGain).connect(out);

  // foam hiss trails the crest
  const foam = noiseSource(ctx, s, "white");
  const foamHp = ctx.createBiquadFilter();
  foamHp.type = "highpass";
  foamHp.frequency.value = 1900;
  const foamGain = ctx.createGain();
  foamGain.gain.value = 0.008;
  foam.connect(foamHp).connect(foamGain).connect(out);

  const swells = timers.every(rnd(8800, 10600), () => {
    const t = ctx.currentTime;
    const up = rnd(2.6, 3.4);
    waveGain.gain.cancelScheduledValues(t);
    foamGain.gain.cancelScheduledValues(t);
    waveGain.gain.setTargetAtTime(rnd(0.42, 0.6), t, up / 3);
    waveGain.gain.setTargetAtTime(0.09, t + up, 1.9);
    foamGain.gain.setTargetAtTime(0.004, t, up / 3);
    foamGain.gain.setTargetAtTime(rnd(0.1, 0.17), t + up * 0.85, 0.5);
    foamGain.gain.setTargetAtTime(0.007, t + up * 0.85 + 1.6, 2.4);
  });

  return () => {
    swells();
    timers.dispose();
    s.nodes.forEach((n) => {
      try {
        n.stop();
      } catch { /* noop */ }
    });
  };
};

const buildCafe: Builder = (ctx, out) => {
  const timers = new Timers();
  const s: Sources = { nodes: [] };

  // room tone
  const room = noiseSource(ctx, s, "brown");
  const roomLp = ctx.createBiquadFilter();
  roomLp.type = "lowpass";
  roomLp.frequency.value = 140;
  const roomGain = ctx.createGain();
  roomGain.gain.value = 0.28;
  room.connect(roomLp).connect(roomGain).connect(out);

  // murmur bed — two wandering voices-like bands
  const murmur = noiseSource(ctx, s, "brown");
  const mBp = ctx.createBiquadFilter();
  mBp.type = "bandpass";
  mBp.frequency.value = 360;
  mBp.Q.value = 0.6;
  const mGain = ctx.createGain();
  mGain.gain.value = 0.3;
  murmur.connect(mBp).connect(mGain).connect(out);

  const murmur2 = noiseSource(ctx, s, "brown");
  const m2Bp = ctx.createBiquadFilter();
  m2Bp.type = "bandpass";
  m2Bp.frequency.value = 780;
  m2Bp.Q.value = 0.9;
  const m2Gain = ctx.createGain();
  m2Gain.gain.value = 0.13;
  murmur2.connect(m2Bp).connect(m2Gain).connect(out);

  const murmurWalk = timers.every(900, () => {
    const t = ctx.currentTime;
    mGain.gain.setTargetAtTime(rnd(0.2, 0.38), t, 0.7);
    m2Gain.gain.setTargetAtTime(rnd(0.07, 0.18), t, 0.8);
    mBp.frequency.setTargetAtTime(rnd(300, 460), t, 0.9);
    m2Bp.frequency.setTargetAtTime(rnd(650, 950), t, 0.9);
  });

  // porcelain & cutlery
  const clinks = timers.every(rnd(6000, 14000), () => {
    const f = rnd(1500, 3300);
    tone(ctx, out, { type: "triangle", freq: f, gain: rnd(0.018, 0.045), decay: rnd(0.25, 0.5), lowpass: 5200 });
    if (Math.random() < 0.45) {
      timers.after(rnd(180, 380), () =>
        tone(ctx, out, { type: "triangle", freq: f * rnd(0.94, 1.06), gain: rnd(0.012, 0.03), decay: 0.3, lowpass: 5200 })
      );
    }
  });

  // occasional chair shuffle / cup set down
  const shuffle = timers.every(rnd(26000, 55000), () => {
    burst(ctx, out, { kind: "pink", filter: { type: "lowpass", freq: 520 }, gain: rnd(0.02, 0.05), decay: rnd(0.2, 0.4) });
  });

  return () => {
    murmurWalk();
    clinks();
    shuffle();
    timers.dispose();
    s.nodes.forEach((n) => {
      try {
        n.stop();
      } catch { /* noop */ }
    });
  };
};

const PENTATONIC = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25];

const buildPiano: Builder = (ctx, out) => {
  const timers = new Timers();
  const s: Sources = { nodes: [] };

  // warm air bed
  const air = noiseSource(ctx, s, "pink");
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 2600;
  const airGain = ctx.createGain();
  airGain.gain.value = 0.012;
  air.connect(lp).connect(airGain).connect(out);

  const padBus = ctx.createGain();
  padBus.gain.value = 1;
  const padLp = ctx.createBiquadFilter();
  padLp.type = "lowpass";
  padLp.frequency.value = 1600;
  padBus.connect(padLp).connect(out);

  const live: { gain: GainNode; nodes: AudioScheduledSourceNode[] }[] = [];

  const playPadChord = () => {
    // fade the previous chord out slowly
    const previous = live.splice(0, live.length);
    previous.forEach((ch) => {
      const t = ctx.currentTime;
      ch.gain.gain.setTargetAtTime(0.0001, t, 4.5);
      timers.after(15000, () => {
        ch.nodes.forEach((n) => {
          try {
            n.stop();
          } catch { /* noop */ }
        });
        try {
          ch.gain.disconnect();
        } catch { /* noop */ }
      });
    });

    const rootI = Math.floor(rnd(0, 4));
    const chord = [PENTATONIC[rootI], PENTATONIC[rootI + 2], PENTATONIC[rootI + 4]];
    const chordGain = ctx.createGain();
    chordGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    chordGain.gain.setTargetAtTime(0.16, ctx.currentTime, 3.4);
    chordGain.connect(padBus);

    const chordNodes: AudioScheduledSourceNode[] = [];
    chord.forEach((f) => {
      [-4, 3].forEach((cents) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = f;
        osc.detune.value = cents;
        const g = ctx.createGain();
        g.gain.value = 0.5 / chord.length;
        osc.connect(g).connect(chordGain);
        osc.start();
        chordNodes.push(osc);
      });
    });
    live.push({ gain: chordGain, nodes: chordNodes });
  };

  playPadChord();
  const padCycle = timers.every(rnd(13000, 18000), playPadChord);

  // sparse felt-piano melody notes
  const melody = timers.every(rnd(5200, 10000), () => {
    const f = pick(PENTATONIC.filter((x) => x >= 329));
    tone(ctx, out, {
      type: "sine",
      freq: f,
      gain: rnd(0.03, 0.06),
      attack: 0.02,
      decay: rnd(2.8, 4.6),
      lowpass: 1400,
    });
    tone(ctx, out, {
      type: "sine",
      freq: f * 2,
      gain: rnd(0.006, 0.014),
      attack: 0.02,
      decay: rnd(1.6, 2.4),
      lowpass: 2400,
    });
  });

  return () => {
    padCycle();
    melody();
    timers.dispose();
    live.forEach((ch) =>
      ch.nodes.forEach((n) => {
        try {
          n.stop();
        } catch { /* noop */ }
      })
    );
    s.nodes.forEach((n) => {
      try {
        n.stop();
      } catch { /* noop */ }
    });
  };
};

const buildTrain: Builder = (ctx, out) => {
  const timers = new Timers();
  const s: Sources = { nodes: [] };

  // deep rumble of the rolling stock
  const rumble = noiseSource(ctx, s, "brown");
  const rLp = ctx.createBiquadFilter();
  rLp.type = "lowpass";
  rLp.frequency.value = 180;
  const rGain = ctx.createGain();
  rGain.gain.value = 0.45;
  rumble.connect(rLp).connect(rGain).connect(out);

  // the whole car gently rocking
  const rock = ctx.createOscillator();
  rock.frequency.value = 0.17;
  const rockAmt = ctx.createGain();
  rockAmt.gain.value = 0.05;
  rock.connect(rockAmt).connect(rGain.gain);
  rock.start();

  // wind combing past the window
  const wind = noiseSource(ctx, s, "pink");
  const wLp = ctx.createBiquadFilter();
  wLp.type = "lowpass";
  wLp.frequency.value = 1800;
  const wGain = ctx.createGain();
  wGain.gain.value = 0.22;
  wind.connect(wLp).connect(wGain).connect(out);
  const wLfo = ctx.createOscillator();
  wLfo.frequency.value = 0.07;
  const wLfoAmt = ctx.createGain();
  wLfoAmt.gain.value = 0.028;
  wLfo.connect(wLfoAmt).connect(wGain.gain);
  wLfo.start();
  s.nodes.push(rock, wLfo);

  // track joints — a hypnotic clack…clack pair drifting around 36 bpm
  let period = rnd(1650, 1850);
  const scheduleClack = () => {
    burst(ctx, out, {
      filter: { type: "bandpass", freq: rnd(1400, 2200), q: 1.5 },
      gain: rnd(0.15, 0.25),
      decay: 0.12,
    });
    timers.after(rnd(110, 150), () =>
      burst(ctx, out, {
        filter: { type: "bandpass", freq: rnd(1000, 1600), q: 1.5 },
        gain: rnd(0.12, 0.2),
        decay: 0.1,
      })
    );
    timers.after(period, scheduleClack);
    period = rnd(1600, 1950);
  };
  scheduleClack();

  // a horn somewhere across the valley, rare and low
  const horn = timers.every(rnd(50000, 100000), () => {
    const t = ctx.currentTime;
    [110, 164.8].forEach((f) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      osc.detune.value = rnd(-6, 6);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.026, t + 0.9);
      g.gain.setValueAtTime(0.026, t + 2.1);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3.6);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 520;
      osc.connect(g).connect(lp).connect(out);
      osc.start(t);
      osc.stop(t + 3.8);
    });
  });

  return () => {
    horn();
    timers.dispose();
    s.nodes.forEach((n) => {
      try {
        n.stop();
      } catch { /* noop */ }
    });
  };
};

/* one struck singing bowl: inharmonic partials with long decay + gentle beating */
function strikeBowl(ctx: AudioContext, out: AudioNode, baseFreq: number, velocity = 1) {
  const t = ctx.currentTime;
  const pan = ctx.createStereoPanner?.();
  const destination = pan ? (pan.connect(out), pan) : out;
  if (pan) pan.pan.value = rnd(-0.55, 0.55);

  // classic bowl mode ratios (inharmonic, slightly stretched)
  const modes: [number, number, number][] = [
    // [ratio, gain, decaySeconds]
    [1, 1, rnd(9, 13)],
    [2.71, 0.42, rnd(7, 10)],
    [5.18, 0.2, rnd(5, 8)],
    [8.9, 0.09, rnd(3.5, 5.5)],
  ];

  modes.forEach(([ratio, gain, decay]) => {
    // two slightly detuned oscillators per mode → slow audible beating
    const beat = ratio === 1 ? rnd(0.6, 1.4) : rnd(1, 2.2);
    for (const detune of [-beat, beat]) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = baseFreq * ratio;
      osc.detune.value = detune * 100 * 0.06; // cents — a whisper off pitch
      const g = ctx.createGain();
      const amp = gain * velocity * 0.05;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(amp, 0.0002), t + rnd(0.03, 0.12));
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      osc.connect(g).connect(destination);
      osc.start(t);
      osc.stop(t + decay + 0.1);
    }
  });

  // the mallet touch itself — a soft filtered knock
  burst(ctx, destination, {
    filter: { type: "bandpass", freq: baseFreq * 2.4, q: 1.4 },
    gain: 0.05 * velocity,
    decay: 0.14,
  });
}

const buildBowls: Builder = (ctx, out) => {
  const timers = new Timers();
  const s: Sources = { nodes: [] };

  // warm dark drone beneath everything (root + fifth, slow beating)
  [110, 164.8].forEach((f, i) => {
    for (const detune of [-4, 4]) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      osc.detune.value = detune;
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.028 : 0.016;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = rnd(0.05, 0.09);
      const lfoAmt = ctx.createGain();
      lfoAmt.gain.value = g.gain.value * 0.45;
      lfo.connect(lfoAmt).connect(g.gain);
      osc.connect(g).connect(out);
      osc.start();
      lfo.start();
      s.nodes.push(osc, lfo);
    }
  });

  // faint stone-room shimmer: high-passed pink noise breathing
  const air = noiseSource(ctx, s, "pink");
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 2400;
  const aGain = ctx.createGain();
  aGain.gain.value = 0.012;
  air.connect(hp).connect(aGain).connect(out);
  const aLfo = ctx.createOscillator();
  aLfo.frequency.value = 0.06;
  const aLfoAmt = ctx.createGain();
  aLfoAmt.gain.value = 0.007;
  aLfo.connect(aLfoAmt).connect(aGain.gain);
  aLfo.start();
  s.nodes.push(aLfo);

  // the bowls themselves — one every 9–16 s, occasionally a soft double-tap
  const bowlNotes = [196, 220, 261.6, 293.7, 349.2, 392];
  let lastNote = -1;
  const scheduleBowl = () => {
    let idx = Math.floor(Math.random() * bowlNotes.length);
    if (idx === lastNote) idx = (idx + 1) % bowlNotes.length;
    lastNote = idx;
    strikeBowl(ctx, out, bowlNotes[idx], rnd(0.75, 1.1));
    if (Math.random() < 0.22) {
      timers.after(rnd(700, 1300), () => strikeBowl(ctx, out, bowlNotes[idx] * 1.5, 0.4));
    }
    timers.after(rnd(9000, 16000), scheduleBowl);
  };
  timers.after(rnd(400, 1200), scheduleBowl);

  return () => {
    timers.dispose();
    s.nodes.forEach((n) => {
      try {
        n.stop();
      } catch { /* noop */ }
    });
  };
};

/**
 * Snowfall — the world wrapped in a blanket.
 * A deep muffled hush (everything high is absorbed), slow wind leaning on
 * the house, the occasional soft whump of snow letting go of a roof, and
 * — very rarely — a tiny icy tick, like a crystal settling on the pane.
 */
const buildSnow: Builder = (ctx, out) => {
  const timers = new Timers();
  const s: Sources = { nodes: [] };

  // the hush itself: brown noise behind a thick felt blanket
  const hush = noiseSource(ctx, s, "brown");
  const hushLp = ctx.createBiquadFilter();
  hushLp.type = "lowpass";
  hushLp.frequency.value = 680;
  const hushGain = ctx.createGain();
  hushGain.gain.value = 0.4;
  hush.connect(hushLp).connect(hushGain).connect(out);
  // the blanket itself breathes, very slowly
  const hushLfo = ctx.createOscillator();
  hushLfo.frequency.value = rnd(0.045, 0.07);
  const hushLfoAmt = ctx.createGain();
  hushLfoAmt.gain.value = 0.035;
  hushLfo.connect(hushLfoAmt).connect(hushGain.gain);
  hushLfo.start();
  s.nodes.push(hushLfo);

  // wind leaning on the walls — band-passed pink noise with a wandering center
  const wind = noiseSource(ctx, s, "pink");
  const windBp = ctx.createBiquadFilter();
  windBp.type = "bandpass";
  windBp.frequency.value = 300;
  windBp.Q.value = 0.7;
  const windGain = ctx.createGain();
  windGain.gain.value = 0.18;
  const windPan = ctx.createStereoPanner();
  wind.connect(windBp).connect(windGain).connect(windPan).connect(out);
  const windWander = ctx.createOscillator();
  windWander.frequency.value = 0.05;
  const windWanderAmt = ctx.createGain();
  windWanderAmt.gain.value = 140;
  windWander.connect(windWanderAmt).connect(windBp.frequency);
  windWander.start();
  s.nodes.push(windWander);

  // gusts: the wind swells, leans from one side, then gives up
  const gust = () => {
    const t = ctx.currentTime;
    const peak = rnd(0.035, 0.085);
    const rise = rnd(2.2, 4.5);
    const fall = rnd(4, 8);
    windGain.gain.cancelScheduledValues(t);
    windGain.gain.setTargetAtTime(peak, t, rise / 3);
    windGain.gain.setTargetAtTime(0.012, t + rise, fall / 3);
    windPan.pan.setTargetAtTime(rnd(-0.6, 0.6), t, rise / 2);
    timers.after(rnd(14000, 26000), gust);
  };
  timers.after(rnd(2500, 6000), gust);

  // snow letting go of the roof — a soft, rounded whump
  const whump = () => {
    burst(ctx, out, {
      kind: "brown",
      filter: { type: "lowpass", freq: rnd(280, 480) },
      gain: rnd(0.22, 0.34),
      attack: 0.22,
      decay: rnd(0.9, 1.6),
    });
    // sometimes a second, smaller sigh from the far eave
    if (Math.random() < 0.35) {
      timers.after(rnd(700, 1600), () =>
        burst(ctx, out, {
          kind: "brown",
          filter: { type: "lowpass", freq: rnd(200, 360) },
          gain: rnd(0.12, 0.18),
          attack: 0.3,
          decay: rnd(0.8, 1.3),
        })
      );
    }
    timers.after(rnd(14000, 26000), whump);
  };
  timers.after(rnd(6000, 12000), whump);

  // a rare icy tick — a crystal settling on the cold pane
  const tickle = () => {
    const pan = ctx.createStereoPanner();
    pan.pan.value = rnd(-0.8, 0.8);
    pan.connect(out);
    tone(ctx, pan, {
      type: "sine",
      freq: rnd(2400, 4200),
      gain: rnd(0.025, 0.045),
      decay: rnd(0.25, 0.6),
    });
    timers.after(1200, () => {
      try {
        pan.disconnect();
      } catch { /* noop */ }
    });
    timers.after(rnd(10000, 25000), tickle);
  };
  timers.after(rnd(8000, 18000), tickle);

  return () => {
    timers.dispose();
    s.nodes.forEach((n) => {
      try {
        n.stop();
      } catch { /* noop */ }
    });
  };
};

const BASE_BUILDERS: Record<SoundscapeId, Builder> = {
  rain: buildRain,
  forest: buildForest,
  ocean: buildOcean,
  cafe: buildCafe,
  fireplace: buildFire,
  piano: buildPiano,
  train: buildTrain,
  bowls: buildBowls,
  snow: buildSnow,
};

const MIX_BUILDERS: Record<MixLayerId, Builder> = {
  rain: buildRain,
  wind: buildWind,
  fire: buildFire,
};

/* mix layers are a touch quieter than the featured soundscape */
const MIX_SCALE: Record<MixLayerId, number> = { rain: 0.85, wind: 0.9, fire: 0.8 };

/* ─────────────────────────── the engine ──────────────────────── */

interface LayerState {
  gain: GainNode;
  dispose: Dispose;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private fade!: GainNode;
  private duck!: GainNode;
  private master!: GainNode;
  private comp: DynamicsCompressorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private analyserData: Uint8Array<ArrayBuffer> | null = null;
  private base: LayerState | null = null;
  private baseId: SoundscapeId | null = null;
  private mix: Partial<Record<MixLayerId, LayerState>> = {};
  private masterVolume = 0.9;
  private baseTrim = 1; // trim for the currently-loading base
  private baseTrims: Partial<Record<SoundscapeId, number>> = {}; // per-soundscape room level 0.4..1.2
  private nightCapOn = false; // gentle loudness ceiling for shared rooms / light sleepers

  get context(): AudioContext | null {
    return this.ctx;
  }

  get currentBase(): SoundscapeId | null {
    return this.baseId;
  }

  ensureContext(): AudioContext {
    if (!this.ctx) {
      const AC: typeof AudioContext =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.fade = this.ctx.createGain();
      this.fade.gain.value = 1;
      this.duck = this.ctx.createGain();
      this.duck.gain.value = 1;
      this.master = this.ctx.createGain();
      this.master.gain.value = this.masterVolume;
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.82;
      this.analyserData = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -20;
      comp.knee.value = 18;
      comp.ratio.value = 4;
      this.comp = comp;
      this.applyNightCapTone();
      this.fade.connect(this.duck).connect(this.master).connect(comp).connect(this.ctx.destination);
      this.master.connect(this.analyser);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  /** start (or crossfade to) a featured soundscape */
  async playBase(id: SoundscapeId, fadeInSeconds = 2.4) {
    const ctx = this.ensureContext();
    if (this.baseId === id && this.base) return;
    if (this.base) {
      const old = this.base;
      // immediately silence and dispose the old base — no lingering overlap
      try { old.gain.gain.cancelScheduledValues(ctx.currentTime); } catch { /* noop */ }
      old.gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3);
      setTimeout(() => {
        old.dispose();
        try { old.gain.disconnect(); } catch { /* noop */ }
      }, 800);
    }
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.baseTrim = this.baseTrims[id] ?? 1;
    gain.gain.setTargetAtTime(this.baseTrim, ctx.currentTime, fadeInSeconds / 3);
    gain.connect(this.fade);
    const dispose = BASE_BUILDERS[id](ctx, gain);
    this.base = { gain, dispose };
    this.baseId = id;
  }

  /** per-soundscape room level (0.4..1.2) — live-ramps only the matching active base */
  setBaseTrim(id: SoundscapeId, v: number) {
    const clamped = Math.max(0.4, Math.min(1.2, v));
    this.baseTrims[id] = clamped;
    if (this.ctx && this.base && this.baseId === id) {
      this.base.gain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.25);
    }
  }

  getTrim(id: SoundscapeId): number {
    return this.baseTrims[id] ?? 1;
  }

  /** set a mixer layer level 0..1; builds/disposes lazily */
  setMixLayer(id: MixLayerId, level: number) {
    const ctx = this.ensureContext();
    const existing = this.mix[id];
    if (level <= 0.005) {
      if (existing) {
        existing.gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.5);
        setTimeout(() => {
          existing.dispose();
          try {
            existing.gain.disconnect();
          } catch { /* noop */ }
        }, 2600);
        delete this.mix[id];
      }
      return;
    }
    if (!existing) {
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.setTargetAtTime(level * MIX_SCALE[id], ctx.currentTime, 1.1);
      gain.connect(this.fade);
      const dispose = MIX_BUILDERS[id](ctx, gain);
      this.mix[id] = { gain, dispose };
    } else {
      existing.gain.gain.setTargetAtTime(level * MIX_SCALE[id], ctx.currentTime, 0.25);
    }
  }

  /**
   * Night cap — a gentle loudness ceiling. When on, sudden louds (far thunder,
   * train horns, crackles, struck bowls) are compressed much harder and the
   * overall level rests a touch lower, so a shared room stays asleep.
   */
  setNightCap(on: boolean) {
    this.nightCapOn = on;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (this.comp) {
      this.comp.threshold.setTargetAtTime(on ? -38 : -20, t, 0.45);
      this.comp.ratio.setTargetAtTime(on ? 12 : 4, t, 0.45);
    }
    this.applyMasterCeiling(0.4);
  }

  get nightCapActive() {
    return this.nightCapOn;
  }

  /** compressor personality follows the night cap switch (used at ctx birth too) */
  private applyNightCapTone() {
    if (!this.comp) return;
    if (this.nightCapOn) {
      this.comp.threshold.value = -38;
      this.comp.ratio.value = 12;
    } else {
      this.comp.threshold.value = -20;
      this.comp.ratio.value = 4;
    }
  }

  /** master gain = user volume × a slightly lower ceiling when capped */
  private applyMasterCeiling(ramp = 0.12) {
    if (!this.ctx) return;
    const ceiling = this.nightCapOn ? 0.82 : 1;
    this.master.gain.setTargetAtTime(this.masterVolume * ceiling, this.ctx.currentTime, ramp);
  }

  setMasterVolume(v: number) {
    this.masterVolume = v;
    this.applyMasterCeiling(0.12);
  }

  /** timer fade — call each tick with remaining/duration when inside last minute */
  setFadeFactor(f: number, rampSeconds = 0.6) {
    if (!this.ctx) return;
    const clamped = Math.max(0.0001, Math.min(1, f));
    this.fade.gain.setTargetAtTime(clamped, this.ctx.currentTime, rampSeconds / 3);
  }

  /** duck the bed under a narrated voice — 0 = full, 1 = eased to a quarter */
  setDuck(amount: number, rampSeconds = 1.4) {
    if (!this.ctx) return;
    const clamped = Math.max(0, Math.min(1, amount));
    this.duck.gain.setTargetAtTime(1 - clamped * 0.75, this.ctx.currentTime, rampSeconds / 3);
  }

  resetFade() {
    if (!this.ctx) return;
    this.fade.gain.setTargetAtTime(1, this.ctx.currentTime, 0.8);
  }

  stopAll(fadeSeconds = 1) {
    if (!this.ctx) return;
    this.fade.gain.setTargetAtTime(0.0001, this.ctx.currentTime, fadeSeconds / 3);
    const kill = () => {
      this.base?.dispose();
      this.base = null;
      this.baseId = null;
      Object.values(this.mix).forEach((l) => l?.dispose());
      this.mix = {};
      const ctx = this.ctx;
      setTimeout(() => {
        try {
          if (ctx) this.fade.gain.setValueAtTime(1, ctx.currentTime);
        } catch { /* noop */ }
      }, 300);
    };
    setTimeout(kill, fadeSeconds * 1000 + 150);
  }

  get isSilent() {
    return !this.base;
  }

  /**
   * A soft bell, routed around the timer fade (straight to master).
   * kind "complete" — single low bell when a sleep timer runs its course.
   * kind "sunrise"  — gentle rising motif for the wake light, repeats 3×.
   */
  playChime(kind: "complete" | "sunrise" = "complete") {
    const ctx = this.ensureContext();
    if (ctx.state === "suspended") void ctx.resume();
    const bus = ctx.createGain();
    bus.gain.value = 0.5;
    bus.connect(this.master);

    const bell = (freq: number, at: number, level: number, decay = 4.5) => {
      const partials = [
        { f: freq, g: 1 },
        { f: freq * 2.01, g: 0.34 },
        { f: freq * 2.99, g: 0.11 },
      ];
      partials.forEach(({ f, g }) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = f;
        const g1 = ctx.createGain();
        g1.gain.setValueAtTime(0.0001, at);
        g1.gain.exponentialRampToValueAtTime(level * g, at + 0.06);
        g1.gain.exponentialRampToValueAtTime(0.0001, at + decay);
        osc.connect(g1).connect(bus);
        osc.start(at);
        osc.stop(at + decay + 0.2);
      });
    };

    const t0 = ctx.currentTime + 0.08;
    if (kind === "complete") {
      // A4 then E5 — "it is safe to sleep now"
      bell(432, t0, 0.2, 5);
      bell(648, t0 + 0.9, 0.13, 5.5);
    } else {
      // C5 · E5 · G5 rising, thrice, softer each time
      const motif = [523.25, 659.25, 783.99];
      for (let rep = 0; rep < 3; rep++) {
        const start = t0 + rep * 5.2;
        motif.forEach((f, i) => bell(f, start + i * 0.85, 0.16 * (1 - rep * 0.26), 4));
      }
    }
    // release the bus long after the last partial dies
    setTimeout(() => {
      try {
        bus.disconnect();
      } catch { /* noop */ }
    }, (kind === "complete" ? 8 : 22) * 1000);
  }

  /** RMS loudness 0..1 — for gentle audio-reactive visuals */
  getLevel(): number {
    if (!this.analyser || !this.analyserData || !this.ctx) return 0;
    this.analyser.getByteFrequencyData(this.analyserData);
    let sum = 0;
    for (let i = 0; i < this.analyserData.length; i++) sum += this.analyserData[i];
    return Math.min(1, sum / this.analyserData.length / 140);
  }
}

export const audioEngine = new AudioEngine();

/** QA/debug handle — lets test harnesses inspect the live audio graph */
if (typeof window !== "undefined") {
  (window as unknown as { __lunaEngine?: AudioEngine }).__lunaEngine = audioEngine;
}
