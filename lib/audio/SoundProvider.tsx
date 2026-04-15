'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  playSound,
  preloadTone,
  getLoadedTone,
  type SoundKey,
} from './sounds';

type FeedbackMode = 'on' | 'off';

// External-store subscription for localStorage-backed mode. We use
// useSyncExternalStore so the initial value is read from localStorage before
// the first render (no effect-driven setState) — this is React 19's canonical
// pattern for reading external mutable sources and keeps lint happy.
const STORAGE_KEY = 'ma-sound';
const MODE_EVENT = 'ma-sound:change';

function readMode(): FeedbackMode {
  if (typeof window === 'undefined') return 'on';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'on' || stored === 'off') return stored;
  } catch { /* private mode */ }
  return 'on';
}

function subscribeMode(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  // Subscribe to cross-tab localStorage writes AND to our in-tab setMode
  // (localStorage's `storage` event only fires for other tabs).
  window.addEventListener('storage', listener);
  window.addEventListener(MODE_EVENT, listener);
  return () => {
    window.removeEventListener('storage', listener);
    window.removeEventListener(MODE_EVENT, listener);
  };
}

function writeMode(next: FeedbackMode): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch { /* private mode */ }
  window.dispatchEvent(new Event(MODE_EVENT));
}

// getServerSnapshot — always return the SSR default so hydration is stable.
// The client-side value will be read after mount via subscribe → listener fires
// → React re-renders with the real store value.
const getServerModeSnapshot = (): FeedbackMode => 'on';

interface SoundContextValue {
  /** Play a synthesized cue. No-op when muted or before unlock. */
  play: (key: SoundKey, extra?: number) => void;
  /** Current preference. Follows the shared `ma-sound` key (shared with haptics). */
  mode: FeedbackMode;
  /** Change the preference. Also unlocks audio if switching on from a gesture. */
  setMode: (mode: FeedbackMode) => void;
  /** True once Tone.js's AudioContext has been resumed by a user gesture. */
  unlocked: boolean;
  /**
   * Attempt to resume the AudioContext. Must be called from inside a real
   * user gesture handler (onClick, onTouchStart, etc.) or iOS Safari refuses.
   * Fire-and-forget — callers don't need to await.
   */
  unlock: () => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

/**
 * Singleton audio context for the app. Owns:
 *   1. The shared `ma-sound` preference (on/off — also gates haptics).
 *   2. The unlock state (iOS AudioContext gate).
 *   3. A stable `play()` callback that no-ops before unlock or when muted.
 */
export function SoundProvider({ children }: { children: React.ReactNode }) {
  // useSyncExternalStore is the canonical React 19 way to read a mutable
  // external source (localStorage) without triggering a setState-in-effect
  // lint error. SSR always renders 'on'; post-mount the first subscribe call
  // re-reads the actual stored value, so any hydration mismatch is one render
  // for one boolean with no visible DOM difference.
  const mode = useSyncExternalStore(subscribeMode, readMode, getServerModeSnapshot);

  const [unlocked, setUnlocked] = useState(false);
  const unlockedRef = useRef(false);
  const hasWarnedMissingUnlockRef = useRef(false);

  const setMode = useCallback((next: FeedbackMode) => {
    writeMode(next);
  }, []);

  // Kick off the Tone.js import as soon as the provider mounts. By the time
  // the user's first click lands, the module should be cached and unlock()
  // can call Tone.start() synchronously inside the gesture (iOS Safari
  // requirement).
  useEffect(() => {
    preloadTone().catch((err) => {
      console.warn('Tone.js preload failed:', err);
    });
  }, []);

  const unlock = useCallback(() => {
    if (unlockedRef.current) return;

    // Happy path: Tone is preloaded and we can call start() synchronously
    // from the current call stack. iOS Safari requires audioContext.resume()
    // to happen inside a user gesture; awaiting the dynamic import first
    // would yield the gesture context to the microtask queue.
    const Tone = getLoadedTone();
    if (Tone) {
      unlockedRef.current = true;
      Tone.start().then(
        () => setUnlocked(true),
        (err) => {
          unlockedRef.current = false;
          console.warn('Audio unlock failed (sync path):', err);
        },
      );
      return;
    }

    // Fallback: Tone hasn't finished loading yet. Best-effort unlock — this
    // path may silently fail on iOS Safari since the gesture context is
    // lost by the time Tone.start() runs. Desktop Chrome/Firefox tolerate it.
    preloadTone().then(
      (TonePromised) => {
        if (unlockedRef.current) return;
        unlockedRef.current = true;
        TonePromised.start().then(
          () => setUnlocked(true),
          (err) => {
            unlockedRef.current = false;
            console.warn('Audio unlock failed (deferred path):', err);
          },
        );
      },
      (err) => {
        console.warn('Tone.js import failed:', err);
      },
    );
  }, []);

  // Document-level one-shot unlock. Fires on the first pointerdown/keydown
  // ANYWHERE on the page. This catches flows that don't go through our
  // explicit unlock points — challenge lobbies, /practice, /daily, etc. —
  // where the user never taps the matchmaking ACCEPT button. Once unlocked,
  // the listeners detach themselves.
  useEffect(() => {
    const handler = () => {
      if (unlockedRef.current) return;
      unlock();
    };
    // Use capture so we fire before any stopPropagation in downstream handlers.
    window.addEventListener('pointerdown', handler, { capture: true });
    window.addEventListener('keydown', handler, { capture: true });
    return () => {
      window.removeEventListener('pointerdown', handler, { capture: true });
      window.removeEventListener('keydown', handler, { capture: true });
    };
  }, [unlock]);

  const play = useCallback((key: SoundKey, extra = 0) => {
    if (mode === 'off') return;
    if (!unlockedRef.current) {
      // Log once per session so future bugs surface in the console instead
      // of silently eating audio. This is dev-facing; users never see it.
      if (!hasWarnedMissingUnlockRef.current && typeof window !== 'undefined') {
        hasWarnedMissingUnlockRef.current = true;
        console.warn(
          '[SoundProvider] play(%s) suppressed — audio not yet unlocked. ' +
            'A user gesture should have already unlocked the AudioContext; ' +
            'if you see this after clicking, check that preloadTone() has ' +
            'resolved by the time the document-level listener fires.',
          key,
        );
      }
      return;
    }
    playSound(key, extra).catch(() => { /* swallow — audio must never crash gameplay */ });
  }, [mode]);

  return (
    <SoundContext.Provider value={{ play, mode, setMode, unlocked, unlock }}>
      {children}
    </SoundContext.Provider>
  );
}

/**
 * Access the audio context. Safe to call anywhere under <SoundProvider>.
 * Callers that want to bail out if the provider isn't mounted (e.g. for
 * shared components used outside the app shell) can check for null via
 * `useContext(SoundContext)` directly.
 */
export function useSoundContext(): SoundContextValue {
  const ctx = useContext(SoundContext);
  if (!ctx) {
    // Shouldn't happen — SoundProvider is mounted at the root layout. If it
    // does, return a silent no-op object so we never crash a call site.
    return {
      play: () => {},
      mode: 'on',
      setMode: () => {},
      unlocked: false,
      unlock: () => {},
    };
  }
  return ctx;
}
