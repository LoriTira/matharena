'use client';

import type { ReactNode } from 'react';

interface PlayPanelProps {
  variant: 'sp' | 'mp';
  eyebrow: string;
  title: string;
  stats?: ReactNode;
  children: ReactNode;
  lockedOverlay?: ReactNode;
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
      className={`relative rounded-xl p-6 sm:p-7 flex flex-col gap-6 overflow-hidden ${
        isMp
          ? 'border-[3px] border-accent bg-gradient-to-br from-accent-glow via-bg-raised to-bg-raised shadow-[0_0_60px_var(--accent-glow)]'
          : 'border-[3px] border-edge-strong bg-panel'
      } ${className ?? ''}`}
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 rounded-xl ${
          isMp
            ? 'bg-gradient-to-br from-accent/15 via-transparent to-transparent'
            : 'bg-gradient-to-br from-shade via-transparent to-transparent'
        }`}
      />

      <div className="relative flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div>
          <div
            className={`text-[11px] tracking-[4px] font-black uppercase mb-2 ${
              isMp ? 'text-accent' : 'text-ink-tertiary'
            }`}
          >
            {eyebrow}
          </div>
          <h3 className="font-serif text-3xl sm:text-4xl font-black text-ink leading-none tracking-tight">
            {title}
          </h3>
        </div>
        {stats && <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">{stats}</div>}
      </div>

      <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">{children}</div>

      {lockedOverlay && (
        <div className="relative">
          <div
            className={`relative rounded-lg p-5 ${
              isMp
                ? 'border-2 border-accent/60 bg-panel/90 backdrop-blur-sm shadow-[0_0_30px_var(--accent-glow)]'
                : 'border-2 border-edge-strong bg-panel'
            }`}
          >
            {lockedOverlay}
          </div>
        </div>
      )}
    </div>
  );
}
