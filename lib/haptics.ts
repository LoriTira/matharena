/**
 * Tiny haptic feedback helper. Wraps `navigator.vibrate` on the web and
 * `@capacitor/haptics` (CoreHaptics) on native iOS/Android, behind named
 * patterns. Respects the shared `ma-sound` localStorage toggle (same key
 * the audio provider uses) so users get a single "feedback on/off" control.
 *
 * Graceful no-op on:
 *   - SSR (no window)
 *   - iOS Safari (no Vibration API — feedback only available in the native
 *     iOS app wrapper via Capacitor)
 *   - Feedback disabled
 *
 * Do NOT React-ify this. It's called from effects, event handlers, and
 * timers — the simplest possible API surface wins.
 */

import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export type HapticStrength = 'light' | 'medium' | 'heavy' | 'success' | 'error';

const WEB_PATTERNS: Record<HapticStrength, number | number[]> = {
  light: 15,
  medium: 40,
  heavy: 60,
  success: [10, 40, 20, 40, 50],
  error: [40, 60, 40],
};

function isFeedbackEnabled(): boolean {
  try {
    return localStorage.getItem('ma-sound') !== 'off';
  } catch {
    return true;
  }
}

function nativeHaptic(strength: HapticStrength): void {
  switch (strength) {
    case 'light':
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
      return;
    case 'medium':
      Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
      return;
    case 'heavy':
      Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
      return;
    case 'success':
      Haptics.notification({ type: NotificationType.Success }).catch(() => {});
      return;
    case 'error':
      Haptics.notification({ type: NotificationType.Error }).catch(() => {});
      return;
  }
}

function webHaptic(strength: HapticStrength): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(WEB_PATTERNS[strength]);
  } catch {
    /* some browsers throw when the tab is backgrounded */
  }
}

export function hapticTap(strength: HapticStrength): void {
  if (typeof window === 'undefined') return;
  if (!isFeedbackEnabled()) return;

  if (Capacitor.isNativePlatform()) {
    nativeHaptic(strength);
    return;
  }

  webHaptic(strength);
}
