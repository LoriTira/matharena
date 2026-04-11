'use client';

import { useEffect, useRef, useState } from 'react';
import { ProblemDisplay } from './ProblemDisplay';
import { useWarmup } from '@/hooks/useWarmup';
import { GAME_CONFIG } from '@/lib/constants';

interface WarmupPanelProps {
  /** Player's current Elo — used to calibrate warmup difficulty. */
  playerElo: number | null;
  /** When true, input and loop are paused (e.g. match found modal is open). */
  paused: boolean;
}

const TIER_LABELS = ['', '🔥', '🔥🔥', '🔥🔥🔥', 'LEGENDARY'];
const TIER_COLORS = [
  'text-ink-muted',       // 0: below first milestone
  'text-ink-secondary',   // 1: ≥5
  'text-ink-secondary',   // 2: ≥10
  'text-ink',             // 3: ≥15
  'text-ink',             // 4: ≥25 — LEGENDARY
];


/**
 * The primary warmup experience — infinite streak loop.
 *
 * HARD DESIGN INVARIANTS (must hold):
 *   1. Persistent ⊙ WARMUP chip always visible
 *   2. Muted palette only — no --color-accent (reserved for ranked)
 *   3. No opponent avatar, no "vs", no opponent name
 *   4. No "First to 5", no target score, no Elo number
 *   5. Label says "STREAK", not "SCORE"
 *   6. Wrong answers have no lockout — just red pulse + streak reset
 *   7. Uses its own card styling, not MatchBoard's
 */
export function WarmupPanel({ playerElo, paused }: WarmupPanelProps) {
  const warmup = useWarmup({ playerElo, paused });
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [tierCrossed, setTierCrossed] = useState(false);
  const prevTierIndexRef = useRef(warmup.tierIndex);

  // Start the loop on mount. warmup.start is a useCallback — stable when
  // playerElo doesn't change, which is typical after the first paint.
  useEffect(() => {
    warmup.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autofocus the input whenever it becomes available.
  useEffect(() => {
    if (!paused && warmup.active) {
      inputRef.current?.focus();
    }
  }, [paused, warmup.active, warmup.problem]);

  // Detect tier crossings for the sweep effect.
  useEffect(() => {
    if (warmup.tierIndex > prevTierIndexRef.current) {
      setTierCrossed(true);
      const t = setTimeout(() => setTierCrossed(false), 800);
      prevTierIndexRef.current = warmup.tierIndex;
      return () => clearTimeout(t);
    }
    prevTierIndexRef.current = warmup.tierIndex;
  }, [warmup.tierIndex]);

  // Auto-clear feedback 500ms after the last correct/wrong answer.
  // Uses a ref to clearFeedback (updated via a sync effect) so this effect
  // only depends on lastFeedback, not on the whole warmup object.
  const clearFeedbackRef = useRef(warmup.clearFeedback);
  useEffect(() => {
    clearFeedbackRef.current = warmup.clearFeedback;
  }, [warmup.clearFeedback]);
  useEffect(() => {
    if (!warmup.lastFeedback) return;
    const t = setTimeout(() => clearFeedbackRef.current(), 500);
    return () => clearTimeout(t);
  }, [warmup.lastFeedback]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (paused || !warmup.problem) return;
    const parsed = parseFloat(value);
    if (Number.isNaN(parsed)) return;
    warmup.submit(parsed);
    setValue('');
  };

  const tierLabel = TIER_LABELS[Math.min(warmup.tierIndex, TIER_LABELS.length - 1)];
  const tierColor = TIER_COLORS[Math.min(warmup.tierIndex, TIER_COLORS.length - 1)];
  const isLegendary = warmup.tierIndex >= GAME_CONFIG.WARMUP_TIER_MILESTONES.length;

  return (
    <div
      className={`warmup-panel relative flex flex-col border-2 border-dashed border-edge rounded-sm bg-inset overflow-hidden ${
        isLegendary ? 'animate-gold-pulse' : ''
      }`}
      aria-label="Warmup — no stakes"
    >
      {/* Tier sweep overlay — ephemeral effect on crossing a milestone */}
      {tierCrossed && (
        <div className="absolute inset-0 pointer-events-none animate-warmup-sweep" />
      )}

      {/* Prominent header — bold, big, unmistakable. On mobile the search
          panel collapses to a slim bar, so this header is the ONLY visual
          anchor distinguishing warmup from a real match. */}
      <div className="relative flex flex-col items-center justify-center gap-1 px-5 py-5 border-b-2 border-dashed border-edge bg-shade">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-ink-muted animate-pulse" />
          <span className="text-[11px] tracking-[3px] text-ink-muted font-mono font-semibold">
            WARMUP MODE
          </span>
          <span className="inline-block w-2 h-2 rounded-full bg-ink-muted animate-pulse" />
        </div>
        <div className="text-xl md:text-2xl font-serif text-ink-secondary text-center leading-tight">
          This is not a real match
        </div>
        <div className="text-[11px] md:text-[12px] text-ink-faint text-center max-w-xs leading-snug">
          Just passing the time while we look for an opponent.
          Nothing here is saved — no Elo, no stats, no streak.
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-col items-center justify-center gap-6 px-6 py-8 md:py-12 min-h-[360px]">
        {/* Streak display — the dopamine centerpiece */}
        <div className="flex flex-col items-center gap-1">
          <div className="text-[10px] tracking-[2px] text-ink-faint font-mono">
            STREAK
          </div>
          <div
            key={warmup.streak}
            className={
              'flex items-center gap-2 font-mono tabular-nums ' +
              tierColor +
              (warmup.streak > 0 ? ' animate-score-bounce' : '')
            }
          >
            {tierLabel && (
              <span className="text-lg md:text-xl">{tierLabel}</span>
            )}
            <span className="text-3xl md:text-4xl font-semibold">
              {warmup.streak}
            </span>
          </div>
        </div>

        {/* Problem display with slide-in animation. Uses a pure CSS keyframe
            rather than framer-motion because motion.div's `animate` prop kept
            getting reset to its `initial` state by parent re-renders, leaving
            the animation stuck at ~5% progress. CSS animations run in the
            browser's compositor and are immune to React re-renders. */}
        {warmup.problem && (
          <div
            key={warmup.solvedThisSession}
            className="w-full max-w-md animate-warmup-problem-enter"
          >
            <ProblemDisplay
              operand1={warmup.problem.operand1}
              operand2={warmup.problem.operand2}
              operation={warmup.problem.operation}
            />
          </div>
        )}

        {/* Input — slim warmup version (no penalty lockout) */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-3 w-full max-w-md"
        >
          <input
            ref={inputRef}
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={paused}
            autoComplete="off"
            aria-label="Your answer"
            className={`flex-1 px-6 py-4 text-2xl font-mono text-center rounded-sm border bg-card text-ink focus:outline-none transition-colors
              ${warmup.lastFeedback === 'correct' ? 'border-green-500/50 bg-green-500/5' : ''}
              ${warmup.lastFeedback === 'wrong' ? 'border-red-400/50 bg-red-400/5 animate-shake' : ''}
              ${!warmup.lastFeedback ? 'border-edge focus:border-edge-strong' : ''}
              ${paused ? 'opacity-40' : ''}
            `}
            placeholder={paused ? '' : 'Your answer'}
          />
          <button
            type="submit"
            disabled={paused || !value}
            className="px-6 py-4 bg-ink-muted/10 text-ink-secondary border border-edge rounded-sm font-semibold text-xl hover:bg-ink-muted/15 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Submit answer"
          >
            →
          </button>
        </form>

        {/* Tier progress bar — CSS transition on width */}
        <div className="w-full max-w-md">
          <div className="h-0.5 bg-edge-faint rounded-full overflow-hidden">
            <div
              className="h-full bg-ink-muted transition-[width] duration-300 ease-out"
              style={{ width: `${warmup.nextTierProgress * 100}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] tracking-[1px] text-ink-faint font-mono">
            <span>
              {warmup.solvedThisSession} solved
            </span>
            <span>
              {isLegendary
                ? 'MAXED'
                : `next: ${GAME_CONFIG.WARMUP_TIER_MILESTONES[warmup.tierIndex]}`}
            </span>
          </div>
        </div>

        {/* Gentle reminder of no-stakes nature */}
        <div className="text-[10px] text-ink-faint tracking-[1px] text-center max-w-xs">
          Wrong answers just reset the streak. No penalty.
        </div>
      </div>
    </div>
  );
}
