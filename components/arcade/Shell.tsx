import { ReactNode } from 'react';

interface ShellProps {
  children: ReactNode;
  /** Fullscreen layout (duel/result screens that own their chrome). */
  fullBleed?: boolean;
  /** Adds the subtle scanline animation (drift). Default: true. */
  drift?: boolean;
  className?: string;
}

/**
 * ArcadeShell — the CRT backdrop wrapper. Fixed-positioned overlays (scanlines,
 * grid, glow blobs, vignette) on a `bg-page` base. Content layer sits at z-10.
 *
 * Use at the page root. The nav + content are children; the shell provides
 * backdrop only, not navigation.
 */
export function Shell({ children, fullBleed = false, drift = true, className = '' }: ShellProps) {
  return (
    <div
      className={`relative bg-page text-ink min-h-screen overflow-hidden arcade-scanlines arcade-vignette ${drift ? 'animate-scanline-drift' : ''} ${className}`}
    >
      {/* Grid texture */}
      <div className="absolute inset-0 pointer-events-none arcade-grid" />

      {/* Magenta glow (top-left) */}
      <div
        className="absolute pointer-events-none arcade-glow-magenta"
        style={{ top: '-8%', left: '-5%', width: 420, height: 420 }}
      />

      {/* Cyan glow (mid-right) */}
      <div
        className="absolute pointer-events-none arcade-glow-cyan"
        style={{ top: '30%', right: '-10%', width: 500, height: 500 }}
      />

      {/* Content */}
      <div className={`relative z-10 ${fullBleed ? '' : 'flex flex-col min-h-screen'}`}>
        {children}
      </div>
    </div>
  );
}
