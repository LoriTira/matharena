'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface CountdownOverlayProps {
  /** The value to display. `'GO!'` triggers the cyan finish state. Pass null/undefined to hide. */
  value: number | string | null | undefined;
  /**
   * When provided, the overlay is fixed over the full viewport (used for
   * game-start countdowns). When omitted, the caller positions it inline.
   */
  fixed?: boolean;
  className?: string;
  caption?: ReactNode;
}

/**
 * Shared countdown visual for every game-start moment: ranked match, daily
 * puzzle, practice drill. Single source of truth for font, size, color, and
 * animation so the experience feels identical across modes.
 */
export function Countdown({ value, fixed = true, className = '', caption }: CountdownOverlayProps) {
  if (value === null || value === undefined) return null;

  const isGo = value === 'GO!';
  return (
    <div
      className={`${fixed ? 'fixed inset-0 z-50 bg-page/90 backdrop-blur-sm' : 'relative'} flex flex-col items-center justify-center ${className}`}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={String(value)}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.5, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, duration: 0.4 }}
          className={`font-display font-extrabold text-[140px] md:text-[220px] leading-none tracking-[-10px] tabular-nums select-none ${
            isGo ? 'text-cyan' : 'text-ink'
          }`}
          style={{
            textShadow: isGo
              ? '0 0 60px rgba(54,228,255,0.6)'
              : '0 0 40px rgba(254,246,228,0.2)',
          }}
        >
          {value}
        </motion.div>
      </AnimatePresence>
      {caption && (
        <div className="mt-6 font-mono text-[11px] text-ink-tertiary uppercase tracking-[1.6px]">
          {caption}
        </div>
      )}
    </div>
  );
}
