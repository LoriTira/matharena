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
      className={`group relative w-full text-left rounded-lg border-2 p-5 transition-all motion-safe:hover:scale-[1.015] motion-safe:hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 flex flex-col gap-4 min-h-[200px] ${
        locked
          ? 'border-edge bg-card/30 opacity-60 hover:opacity-90 hover:border-edge-strong'
          : isAccent
          ? 'border-edge-strong bg-panel hover:border-accent hover:shadow-[0_8px_32px_var(--accent-glow)]'
          : 'border-edge-strong bg-panel hover:border-edge-bold hover:shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
      }`}
    >
      {!locked && (
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
            isAccent ? 'bg-accent-glow' : 'bg-shade'
          }`}
        />
      )}

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-serif text-2xl font-black text-ink leading-tight tracking-tight flex items-center gap-2">
            {locked && (
              <svg
                aria-hidden
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-ink-tertiary"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            )}
            {title}
          </div>
          <div className="text-[13px] font-medium text-ink-tertiary leading-relaxed mt-1.5">
            {blurb}
          </div>
        </div>
        <div
          className={`shrink-0 flex items-center justify-center w-12 h-12 rounded-full border-2 ${
            locked
              ? 'border-edge bg-shade text-ink-faint'
              : isAccent
              ? 'border-accent bg-accent-glow text-accent'
              : 'border-edge-strong text-ink-secondary bg-shade'
          }`}
        >
          {icon}
        </div>
      </div>

      {bodySlot ? (
        <div className="relative flex-1 flex flex-col justify-end">{bodySlot}</div>
      ) : (
        <div className="relative flex-1 flex flex-col justify-end gap-3">
          {stat && <div className="text-[13px] font-semibold">{stat}</div>}
          {ctaLabel && !locked && (
            <span
              className={`inline-block self-start px-6 py-2.5 border-2 text-[12px] tracking-[2.5px] font-black rounded-md transition-colors ${
                isAccent
                  ? 'border-accent text-accent group-hover:bg-accent group-hover:text-on-accent'
                  : 'border-edge-bold text-ink group-hover:bg-ink group-hover:text-panel'
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
