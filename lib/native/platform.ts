'use client';

import { Capacitor } from '@capacitor/core';
import { useEffect, useState } from 'react';

/**
 * Safe to call anywhere — returns false on SSR and on the web, true inside a
 * Capacitor shell (iOS/Android). Use `useIsNative()` in React components to
 * avoid hydration mismatches.
 */
export function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  return Capacitor.isNativePlatform();
}

export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return Capacitor.getPlatform() === 'ios';
}

/**
 * Hydration-safe hook. Server and first client render return false; a
 * subsequent effect flips to the real value. Prevents SSR mismatch flashes
 * when rendering native-only UI.
 */
export function useIsNative(): boolean {
  const [native, setNative] = useState(false);
  useEffect(() => {
    setNative(isNativePlatform());
  }, []);
  return native;
}
