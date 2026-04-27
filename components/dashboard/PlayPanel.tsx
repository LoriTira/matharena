'use client';

import type { ReactNode } from 'react';

interface PlayPanelProps {
  variant: 'sp' | 'mp';
  eyebrow: string;
  title: string;
  /** Stat strip rendered on the right of the header. */
  stats?: ReactNode;
  /** Two PlayTile children. */
  children: ReactNode;
  /** Lock-overlay content (eyebrow / line / button). When provided, panel renders the overlay over the bottom of the tile area. */
  lockedOverlay?: ReactNode;
  /** Sets `flex` value at desktop breakpoints. SP defaults to 3, MP to 2 — SP slightly wider. */
  className?: string;
}

export function PlayPanel({
  variant,
  eyebrow,
  title,
  stats,
  children,
  lockedOverlay,
  className,
}: PlayPanelProps) {
  const isMp = variant === 'mp';

  return (
    <div
      className={`relative rounded-md p-5 sm:p-6 flex flex-col gap-5 overflow-hidden ${
        isMp
          ? 'border-2 border-accent/60 bg-accent-glow shadow-[0_0_40px_rgba(124,58,237,0.08)]'
          : 'border-2 border-edge-strong bg-card'
      } ${className ?? ''}`}
    >
      {/* Soft inner gradient, decorative */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 rounded-md opacity-50 ${
          isMp
            ? 'bg-gradient-to-br from-accent/10 via-transparent to-transparent'
            : 'bg-gradient-to-br from-shade via-transparent to-transparent'
        }`}
      />

      <div className="relative flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <div
            className={`text-[10px] tracking-[3px] uppercase mb-1 ${
              isMp ? 'text-accent/80' : 'text-ink-faint'
            }`}
          >
            {eyebrow}
          </div>
          <h3 className="font-serif text-2xl text-ink leading-tight">{title}</h3>
        </div>
        {stats && <div className="flex items-baseline gap-4">{stats}</div>}
      </div>

      <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>

      {lockedOverlay && (
        <div className="relative pt-2">
          <div
            className={`relative rounded-sm p-4 ${
              isMp
                ? 'border border-accent/40 bg-panel/80 backdrop-blur-sm'
                : 'border border-edge-strong bg-panel'
            }`}
          >
            {lockedOverlay}
          </div>
        </div>
      )}
    </div>
  );
}
