'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { generateProblems, eloToTier } from '@/lib/problems/generator';
import { GAME_CONFIG } from '@/lib/constants';
import type { Problem } from '@/types';

/**
 * Flow Sprint — client-only warmup state machine.
 *
 * Drives the dopamine loop shown in the waiting state of /play:
 *   - instant infinite problem stream
 *   - streak counter with tier escalation at 5 / 10 / 15 / 25
 *   - wrong answer resets streak, SAME problem stays (flow-state behavior)
 *   - no persistence, no Elo, no PB — pure ephemeral fun
 *
 * Deliberately separate from `usePracticeSession` so nothing leaks into the
 * persisted practice stats. If you find yourself importing `/api/practice/*`
 * from here, stop — that breaks the "pure dopamine, zero stakes" invariant.
 */

export interface WarmupState {
  /** Whether the warmup loop is currently running. */
  active: boolean;
  /** Current problem on screen (null before start). */
  problem: Problem | null;
  /** Current streak (resets to 0 on wrong answer). */
  streak: number;
  /** Total correct answers this session (decorative, never persisted). */
  solvedThisSession: number;
  /** Current tier index into GAME_CONFIG.WARMUP_TIER_MILESTONES (0 = pre-first-tier, 4 = legendary). */
  tierIndex: number;
  /** Progress (0..1) toward the NEXT tier milestone. */
  nextTierProgress: number;
  /** Last answer result — consumed by feedback UI. Cleared after consumption. */
  lastFeedback: 'correct' | 'wrong' | null;
  /** Whether input is temporarily paused (e.g. during accept modal). */
  paused: boolean;
}

export interface UseWarmupResult extends WarmupState {
  /** Start the warmup loop. Safe to call repeatedly. */
  start: () => void;
  /** Submit an answer. Returns true on correct. */
  submit: (answer: number) => boolean;
  /** Reset the loop back to its initial state (streak 0, new problem). */
  reset: () => void;
  /** Clear the feedback state (call after rendering). */
  clearFeedback: () => void;
}

/**
 * Compute tier index from streak. Tier 0 = below first milestone.
 * E.g. milestones [5, 10, 15, 25], streak 12 → tierIndex 2 (passed 5 and 10).
 */
function computeTierIndex(streak: number, milestones: readonly number[]): number {
  let idx = 0;
  for (const m of milestones) {
    if (streak >= m) idx++;
    else break;
  }
  return idx;
}

/**
 * Compute progress (0..1) toward the NEXT milestone.
 * After the highest tier, returns 1 (maxed out).
 */
function computeNextTierProgress(streak: number, milestones: readonly number[]): number {
  if (streak === 0) return 0;
  // Find the bracket [prev, next) that contains streak
  let prev = 0;
  for (const m of milestones) {
    if (streak < m) {
      const span = m - prev;
      return span === 0 ? 1 : (streak - prev) / span;
    }
    prev = m;
  }
  return 1; // past the last milestone
}

interface UseWarmupOptions {
  /**
   * Player's current Elo rating. Used to pick warmup difficulty tier
   * (one tier easier than ranked for flow state).
   * Falls back to STARTING_ELO if unknown.
   */
  playerElo: number | null;
  /**
   * External pause flag. When true, submit() becomes a no-op and the hook's
   * consumers should visually indicate paused state. Avoids a bidirectional
   * sync between internal pause state and external (caller-owned) pause state.
   */
  paused?: boolean;
}

export function useWarmup({ playerElo, paused = false }: UseWarmupOptions): UseWarmupResult {
  const milestones = GAME_CONFIG.WARMUP_TIER_MILESTONES;
  const [active, setActive] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [streak, setStreak] = useState(0);
  const [solvedThisSession, setSolvedThisSession] = useState(0);
  const [lastFeedback, setLastFeedback] = useState<'correct' | 'wrong' | null>(null);

  // Keep the current problem's answer in a ref so `submit` is stable
  // (doesn't need to be recreated every render).
  const problemRef = useRef<Problem | null>(null);
  useEffect(() => {
    problemRef.current = problem;
  }, [problem]);

  // Build the effective difficulty tier once per Elo change.
  // Using eloToTier indirectly via generateProblems — we just pass
  // (playerElo + offset) and let the generator pick the tier.
  const warmupElo =
    (playerElo ?? GAME_CONFIG.STARTING_ELO) + GAME_CONFIG.WARMUP_DIFFICULTY_OFFSET;

  const genOne = useCallback((): Problem => {
    // generateProblems always returns at least one element for count>=1.
    return generateProblems(warmupElo, 1)[0];
  }, [warmupElo]);

  const start = useCallback(() => {
    setActive(true);
    setStreak(0);
    setSolvedThisSession(0);
    setLastFeedback(null);
    setProblem(genOne());
  }, [genOne]);

  const reset = useCallback(() => {
    setStreak(0);
    setSolvedThisSession(0);
    setLastFeedback(null);
    setProblem(genOne());
  }, [genOne]);

  const submit = useCallback(
    (answer: number): boolean => {
      const current = problemRef.current;
      if (!current || !active || paused) return false;

      if (answer === current.answer) {
        // Correct — streak++, new problem, increment session counter.
        setStreak((s) => s + 1);
        setSolvedThisSession((n) => n + 1);
        setLastFeedback('correct');
        setProblem(genOne());
        return true;
      }

      // Wrong — streak resets, SAME problem stays (flow-state choice).
      setStreak(0);
      setLastFeedback('wrong');
      return false;
    },
    [active, paused, genOne]
  );

  const clearFeedback = useCallback(() => setLastFeedback(null), []);

  // Silence unused-import lint on eloToTier (kept for future use).
  void eloToTier;

  return {
    active,
    problem,
    streak,
    solvedThisSession,
    tierIndex: computeTierIndex(streak, milestones),
    nextTierProgress: computeNextTierProgress(streak, milestones),
    lastFeedback,
    paused,
    start,
    submit,
    reset,
    clearFeedback,
  };
}

// Export helpers for tests or other consumers (keep internal to this module
// for now — plan says useWarmup is the single source of truth).
export { computeTierIndex, computeNextTierProgress };
