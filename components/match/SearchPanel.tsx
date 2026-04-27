'use client';

import { useEffect, useState } from 'react';
import { GAME_CONFIG } from '@/lib/constants';

interface SearchPanelProps {
  /** Elo range the server is currently searching within. */
  eloRange: number;
  /** Whether the matchmaking loop is actively searching. */
  isSearching: boolean;
  /** Approximate number of players currently online. Null means unknown/loading. */
  onlineCount: number | null;
  /** Cooldown remaining in ms, or 0 if no active cooldown. */
  cooldownRemainingMs: number;
  /** Last error message from the matchmaking backend, if any. */
  error: string | null;
  /** User clicked cancel — stop searching, abandon warmup. */
  onCancel: () => void;
}

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Glanceable matchmaking status sidebar. Deliberately compact — the warmup
 * panel is the focus; this panel is for situational awareness only.
 *
 * Visual distinction from the warmup panel: uses a live green dot + SEARCHING
 * header so players can always see at a glance that this is the queue status,
 * not game content.
 */
export function SearchPanel({
  eloRange,
  isSearching,
  onlineCount,
  cooldownRemainingMs,
  error,
  onCancel,
}: SearchPanelProps) {
  // State-only tickers. React 19 forbids both `setState` synchronously in an
  // effect body (`react-hooks/set-state-in-effect`) and reading `ref.current`
  // during render (`react-hooks/refs`). The workaround is to store the
  // starting timestamp IN STATE, and set it from inside a `setTimeout(0)`
  // (which is a callback, not the effect body). Initial tick fires on the
  // next microtask; the interval handles subsequent updates.
  const [elapsed, setElapsed] = useState<{ startedAt: number; nowMs: number } | null>(
    null
  );
  const [cooldown, setCooldown] = useState<{ startedAt: number; ms: number; nowMs: number } | null>(
    null
  );

  // Elapsed ticker — active while searching.
  useEffect(() => {
    if (!isSearching) return;

    const startedAt = Date.now();
    const initialTick = setTimeout(() => {
      setElapsed({ startedAt, nowMs: Date.now() });
    }, 0);
    const interval = setInterval(() => {
      setElapsed({ startedAt, nowMs: Date.now() });
    }, 500);
    return () => {
      clearTimeout(initialTick);
      clearInterval(interval);
    };
  }, [isSearching]);

  // Cooldown ticker — active while cooldownRemainingMs > 0.
  useEffect(() => {
    if (cooldownRemainingMs <= 0) return;

    const startedAt = Date.now();
    const ms = cooldownRemainingMs;
    const initialTick = setTimeout(() => {
      setCooldown({ startedAt, ms, nowMs: Date.now() });
    }, 0);
    const interval = setInterval(() => {
      const nowMs = Date.now();
      setCooldown({ startedAt, ms, nowMs });
      if (nowMs - startedAt >= ms) clearInterval(interval);
    }, 100);
    return () => {
      clearTimeout(initialTick);
      clearInterval(interval);
    };
  }, [cooldownRemainingMs]);

  // Derive display values. No refs read in render, no Date.now() in render.
  const elapsedMs = isSearching && elapsed ? elapsed.nowMs - elapsed.startedAt : 0;
  const cooldownTick =
    cooldownRemainingMs > 0 && cooldown
      ? Math.max(0, cooldown.ms - (cooldown.nowMs - cooldown.startedAt))
      : cooldownRemainingMs; // fallback to prop value before first tick

  const isCooldown = cooldownTick > 0;
  const cooldownSec = Math.ceil(cooldownTick / 1000);
  const isWidened = eloRange > GAME_CONFIG.MATCHMAKING_ELO_RANGE_INITIAL;

  return (
    <aside
      className="flex flex-col border-2 border-accent/60 rounded-xl bg-panel shadow-[0_0_30px_var(--accent-glow)] overflow-hidden"
      aria-label="Matchmaking status"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b-2 border-accent/40 bg-accent-glow">
        <div className="flex items-center gap-2.5">
          {isSearching && !isCooldown ? (
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
          ) : (
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-ink-muted" />
          )}
          <span className="text-[11px] tracking-[3px] text-accent font-black">
            {isCooldown
              ? '▸ COOLDOWN'
              : isSearching
                ? '▸ RANKED MATCHMAKING'
                : '▸ IDLE'}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-5 px-5 py-5">
        {isCooldown ? (
          <div className="flex flex-col gap-2">
            <div className="text-[11px] tracking-[2px] font-black text-ink-tertiary uppercase">Match cooldown</div>
            <div className="font-mono text-3xl font-black tabular-nums text-ink">
              {cooldownSec}s
            </div>
            <div className="text-[12px] font-medium text-ink-tertiary leading-relaxed">
              You declined or missed a match. Searching will resume automatically.
            </div>
          </div>
        ) : isSearching ? (
          <>
            <div className="flex flex-col gap-1">
              <div className="text-[10px] tracking-[2.5px] font-black text-ink-tertiary uppercase">
                Elapsed
              </div>
              <div className="font-mono text-3xl font-black tabular-nums text-ink">
                {formatElapsed(elapsedMs)}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="text-[10px] tracking-[2.5px] font-black text-ink-tertiary uppercase">
                Range
              </div>
              <div className="font-mono text-base font-bold text-ink-secondary tabular-nums">
                &plusmn;{eloRange} Elo{' '}
                {isWidened && (
                  <span className="text-accent text-[12px] font-black uppercase tracking-wider">(widening)</span>
                )}
              </div>
            </div>

            {onlineCount !== null && (
              <div className="flex flex-col gap-1">
                <div className="text-[10px] tracking-[2.5px] font-black text-ink-tertiary uppercase">
                  Activity
                </div>
                <div className="text-[13px] font-semibold text-ink-secondary">
                  ~<span className="font-mono font-black text-ink">{onlineCount}</span> in a match or searching
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-[13px] font-medium text-ink-tertiary">Not searching.</div>
        )}

        {error && (
          <div className="text-[12px] font-semibold text-feedback-wrong bg-feedback-wrong/10 border-2 border-feedback-wrong/30 rounded-md px-3 py-2.5 leading-relaxed">
            {error}
          </div>
        )}
      </div>

      {/* Footer — cancel button */}
      <div className="border-t-2 border-edge-strong px-5 py-4">
        <button
          onClick={onCancel}
          disabled={!isSearching && !isCooldown}
          className="w-full px-4 py-3 text-[11px] tracking-[2.5px] font-black text-ink-tertiary border-2 border-edge-strong hover:border-edge-bold hover:text-ink rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          CANCEL
        </button>
      </div>
    </aside>
  );
}
