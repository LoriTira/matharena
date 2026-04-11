export const GAME_CONFIG = {
  TARGET_SCORE: 5,
  PROBLEMS_BUFFER: 7,
  WRONG_ANSWER_PENALTY_MS: 3000,
  STARTING_ELO: 1200,
  ELO_FLOOR: 100,
  MATCHMAKING_TIMEOUT_MS: 120000,
  MATCHMAKING_ELO_RANGE_INITIAL: 150,
  MATCHMAKING_ELO_RANGE_MAX: 500,
  MATCHMAKING_WIDEN_INTERVAL_MS: 5000,
  MATCH_STALE_TIMEOUT_MINUTES: 10,
  K_FACTOR_NEW: 40,
  K_FACTOR_NORMAL: 20,
  K_FACTOR_HIGH: 10,
  K_FACTOR_GAMES_THRESHOLD: 30,
  K_FACTOR_RATING_THRESHOLD: 2400,

  // ─── Flow Sprint (warmup while searching) ───
  // Warmup problems are generated one tier easier than the player's current Elo
  // for maximum flow state. Pure dopamine — nothing persists.
  WARMUP_DIFFICULTY_OFFSET: -200,
  WARMUP_TIER_MILESTONES: [5, 10, 15, 25] as const,

  // ─── Match accept flow ───
  // Chess.com-style tap-to-accept after pairing.
  MATCH_ACCEPT_TIMEOUT_MS: 10_000,
  MATCH_DECLINE_COOLDOWN_MS: 30_000,
  MATCH_PENDING_STALE_MS: 30_000,
  // Buffer between "both accepted" and scheduled started_at so both clients
  // have time to render the 3-2-1 countdown even if one accepts last-second.
  MATCH_ACCEPT_START_BUFFER_MS: 3_000,
} as const;

export const TIER_RANGES = {
  beginner: {
    '+': { min: 1, max: 20 },
    '-': { min: 1, max: 20 },
    '*': { min: 1, max: 9 },
    '/': { maxProduct: 81, maxDivisor: 9 },
  },
  intermediate: {
    '+': { min: 10, max: 100 },
    '-': { min: 10, max: 100 },
    '*': { min: 2, max: 12, min2: 2, max2: 99 },
    '/': { maxProduct: 500, maxDivisor: 9 },
  },
  advanced: {
    '+': { min: 100, max: 999 },
    '-': { min: 100, max: 999 },
    '*': { min: 10, max: 99, min2: 10, max2: 99 },
    '/': { maxProduct: 5000, maxDivisor: 99 },
  },
  expert: {
    '+': { min: 100, max: 9999 },
    '-': { min: 100, max: 9999 },
    '*': { min: 10, max: 999, min2: 10, max2: 99 },
    '/': { maxProduct: 50000, maxDivisor: 99 },
  },
  master: {
    '+': { min: 1000, max: 99999 },
    '-': { min: 1000, max: 99999 },
    '*': { min: 100, max: 999, min2: 100, max2: 999 },
    '/': { maxProduct: 500000, maxDivisor: 999 },
  },
} as const;

export const OPERATIONS: ('+' | '-' | '*' | '/')[] = ['+', '-', '*', '/'];

// ─── Practice Mode ──────────────────────────────────

import type { PracticeDifficulty, OperationRange, Operation } from '@/types';

export const PRACTICE_DURATIONS = [60, 120, 300] as const;

export const PRACTICE_DIFFICULTY_RANGES: Record<PracticeDifficulty, Record<Operation, OperationRange>> = {
  beginner: {
    '+': { min1: 2, max1: 50, min2: 2, max2: 50 },
    '-': { min1: 2, max1: 50, min2: 2, max2: 50 },
    '*': { min1: 2, max1: 12, min2: 2, max2: 12 },
    '/': { min1: 2, max1: 12, min2: 2, max2: 12 },
  },
  standard: {
    '+': { min1: 2, max1: 100, min2: 2, max2: 100 },
    '-': { min1: 2, max1: 100, min2: 2, max2: 100 },
    '*': { min1: 2, max1: 12, min2: 2, max2: 100 },
    '/': { min1: 2, max1: 12, min2: 2, max2: 100 },
  },
  hard: {
    '+': { min1: 100, max1: 999, min2: 100, max2: 999 },
    '-': { min1: 100, max1: 999, min2: 100, max2: 999 },
    '*': { min1: 2, max1: 100, min2: 2, max2: 999 },
    '/': { min1: 2, max1: 100, min2: 2, max2: 500 },
  },
  expert: {
    '+': { min1: 100, max1: 9999, min2: 100, max2: 9999 },
    '-': { min1: 100, max1: 9999, min2: 100, max2: 9999 },
    '*': { min1: 10, max1: 999, min2: 10, max2: 99 },
    '/': { min1: 2, max1: 999, min2: 2, max2: 500 },
  },
};

export const PRACTICE_DIFFICULTY_LABELS: Record<PracticeDifficulty, string> = {
  beginner: 'Beginner',
  standard: 'Standard',
  hard: 'Hard',
  expert: 'Expert',
};
