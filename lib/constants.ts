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
