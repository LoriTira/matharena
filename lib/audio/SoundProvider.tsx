'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { playSound, unlockAudio, type SoundKey } from './sounds';

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

  const setMode = useCallback((next: FeedbackMode) => {
    writeMode(next);
  }, []);

  const unlock = useCallback(() => {
    if (unlockedRef.current) return;
    unlockedRef.current = true;
    unlockAudio().then(
      () => setUnlocked(true),
      (err) => {
        // Unlock failed (rare — usually means we weren't inside a gesture).
        // Reset the flag so a subsequent gesture can try again.
        unlockedRef.current = false;
        console.warn('Audio unlock failed:', err);
      },
    );
  }, []);

  const play = useCallback((key: SoundKey, extra = 0) => {
    if (mode === 'off') return;
    if (!unlockedRef.current) return;
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
