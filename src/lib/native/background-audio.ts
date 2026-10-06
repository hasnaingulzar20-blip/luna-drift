import { isNative } from "@/lib/platform";

let isEnabled = false;

/**
 * Enable background audio mode so soundscapes keep playing
 * when the screen turns off. On web this is a no-op.
 */
export async function enableBackgroundAudio(): Promise<void> {
  if (!isNative || isEnabled) return;
  try {
    const { BackgroundMode } = await import("@capacitor-community/background-mode");
    await BackgroundMode.enable();
    await BackgroundMode.setDefaults({
      title: "Luna Drift",
      subtitle: "Drifting…",
      text: "Your soundscape is playing",
      silent: true,
    });
    isEnabled = true;
  } catch {
    /* plugin not installed — web build or missing dependency */
  }
}

/**
 * Disable background audio mode.
 * Called when all playback stops.
 */
export async function disableBackgroundAudio(): Promise<void> {
  if (!isNative || !isEnabled) return;
  try {
    const { BackgroundMode } = await import("@capacitor-community/background-mode");
    await BackgroundMode.disable();
    isEnabled = false;
  } catch {
    /* plugin not installed */
  }
}

export function isBackgroundAudioEnabled(): boolean {
  return isEnabled;
}
