/**
 * Tiny haptic feedback helper. Wraps `navigator.vibrate` with named patterns
 * and respects the shared `ma-sound` localStorage toggle (same key the audio
 * provider uses) so users get a single "feedback on/off" control.
 *
 * Graceful no-op on:
 *   - SSR (no window / navigator)
 *   - iOS Safari (Vibration API is not exposed — Apple only permits haptics
 *     to native apps)
 *   - Feedback disabled
 *
 * Do NOT React-ify this. It's called from effects, event handlers, and
 * timers — the simplest possible API surface wins.
 */

export type HapticStrength = 'light' | 'medium' | 'heavy' | 'success' | 'error';

const PATTERNS: Record<HapticStrength, number | number[]> = {
  light: 15,
  medium: 40,
  heavy: 60,
  success: [10, 40, 20, 40, 50],
  error: [40, 60, 40],
};

export function hapticTap(strength: HapticStrength): void {
  if (typeof window === 'undefined') return;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;

  // Respect the shared feedback toggle. Read on every call — it's cheap and
  // avoids stale closures if the user toggles mid-match.
  try {
    if (localStorage.getItem('ma-sound') === 'off') return;
  } catch {
    /* storage may throw in private mode — fall through and vibrate */
  }

  try {
    navigator.vibrate(PATTERNS[strength]);
  } catch {
    /* some browsers throw if the tab is backgrounded */
  }
}
