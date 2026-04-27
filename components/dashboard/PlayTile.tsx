'use client';

import type { ReactNode } from 'react';

interface PlayTileProps {
  icon: ReactNode;
  title: string;
  blurb: string;
  stat?: ReactNode;
  ctaLabel?: string;
  onActivate: () => void;
  bodySlot?: ReactNode;
  ariaLabel?: string;
  locked?: boolean;
  /** Visual treatment hint — 'sp' uses neutral edges, 'mp' uses accent edges. */
  variant?: 'sp' | 'mp';
}

export function PlayTile({
  icon,
  title,
  blurb,
  stat,
  ctaLabel,
  onActivate,
  bodySlot,
  ariaLabel,
  locked = false,
  variant = 'mp',
}: PlayTileProps) {
  const isAccent = variant === 'mp';

  return (
    <button
      type="button"
      onClick={onActivate}
      aria-label={ariaLabel ?? `${title}. ${blurb}`}
      data-locked={locked || undefined}
      className={`group relative w-full text-left rounded-sm border p-5 transition-all motion-safe:hover:scale-[1.005] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 flex flex-col gap-4 min-h-[180px] ${
        locked
          ? 'border-edge-faint bg-card/40 opacity-60 hover:opacity-80 hover:border-edge'
          : isAccent
          ? 'border-edge bg-card hover:border-accent/50'
          : 'border-edge bg-card hover:border-edge-strong'
      }`}
    >
      {!locked && (
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-0 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
            isAccent ? 'bg-accent-glow' : 'bg-shade'
          }`}
        />
      )}

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-serif text-lg text-ink mb-1 leading-tight flex items-center gap-2">
            {locked && (
              <svg
                aria-hidden
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-ink-muted"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            )}
            {title}
          </div>
          <div className="text-[12px] text-ink-muted leading-relaxed">{blurb}</div>
        </div>
        <div
          className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-full border ${
            locked
              ? 'border-edge-faint bg-shade text-ink-faint'
              : isAccent
              ? 'border-accent/30 bg-accent-glow text-accent'
              : 'border-edge text-ink-secondary'
          }`}
        >
          {icon}
        </div>
      </div>

      {bodySlot ? (
        <div className="relative flex-1 flex flex-col justify-end">{bodySlot}</div>
      ) : (
        <div className="relative flex-1 flex flex-col justify-end gap-3">
          {stat && <div className="text-[12px]">{stat}</div>}
          {ctaLabel && !locked && (
            <span
              className={`inline-block self-start px-5 py-2 border text-[11px] tracking-[2px] font-bold rounded-sm transition-colors ${
                isAccent
                  ? 'border-accent/40 text-accent group-hover:bg-accent-glow'
                  : 'border-edge-strong text-ink-secondary group-hover:bg-shade'
              }`}
            >
              {ctaLabel}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
