/**
 * Rough moon-phase helper — accurate to within a couple of hours over the
 * modern era, which is far more precision than a whisper in the footer needs.
 */
const SYNODIC = 29.530588853; // days
/** reference new moon: 2000-01-06 18:14 UTC */
const REF = Date.UTC(2000, 0, 6, 18, 14);

export interface MoonPhaseInfo {
  /** 0..1 position in the synodic cycle (0 = new moon, 0.5 = full moon) */
  phase: number;
  /** 0..1 fraction of the disc that is lit */
  illumination: number;
  /** human-readable phase name */
  name: string;
}

export function getMoonPhase(date: Date = new Date()): MoonPhaseInfo {
  const days = (date.getTime() - REF) / 86_400_000;
  const phase = (((days % SYNODIC) + SYNODIC) % SYNODIC) / SYNODIC;
  const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2;
  const name =
    phase < 0.02 || phase > 0.98
      ? "new moon"
      : phase < 0.23
        ? "waxing crescent"
        : phase < 0.27
          ? "first quarter"
          : phase < 0.48
            ? "waxing gibbous"
            : phase < 0.52
              ? "full moon"
              : phase < 0.73
                ? "waning gibbous"
                : phase < 0.77
                  ? "last quarter"
                  : "waning crescent";
  return { phase, illumination, name };
}

/** nights from now until the next full moon (0 = full tonight) */
export function nightsUntilFullMoon(date: Date = new Date()): number {
  const { phase } = getMoonPhase(date);
  const fractionToFull = (((0.5 - phase) % 1) + 1) % 1;
  return Math.round(fractionToFull * SYNODIC);
}
