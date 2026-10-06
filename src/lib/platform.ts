import { Capacitor } from "@capacitor/core";

/** true when running inside a Capacitor native shell (Android/iOS) */
export const isNative = Capacitor.isNativePlatform();

/** true when running in a regular web browser */
export const isWeb = Capacitor.getPlatform() === "web";

/** the current platform string: 'web' | 'android' | 'ios' */
export const platform = Capacitor.getPlatform();

/**
 * Build the OAuth redirect URL for the current platform.
 * Web  → https://your-domain/auth/callback
 * Native → lunadrift://auth/callback (deep link, configured in AndroidManifest)
 */
export function getAuthRedirectUrl(): string {
  if (isNative) {
    return "lunadrift://auth/callback";
  }
  return `${window.location.origin}/auth/callback`;
}
