import type { Problem, Operation } from '@/types';
import { OPERATIONS } from '@/lib/constants';

/**
 * Mulberry32 PRNG — takes a 32-bit seed and returns a function
 * that produces pseudo-random numbers in [0, 1).
 */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Returns a random integer in [min, max] using the provided PRNG.
 */
function seededRandomInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/**
 * Hash a date string into a numeric seed.
 */
function hashDateString(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const ch = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return hash;
}

// Intermediate-tier operand ranges (matches generator.ts)
const INTERMEDIATE_RANGES: Record<Operation, { min1: number; max1: number; min2: number; max2: number }> = {
  '+': { min1: 10, max1: 100, min2: 10, max2: 100 },
  '-': { min1: 10, max1: 100, min2: 10, max2: 100 },
  '*': { min1: 2, max1: 12, min2: 2, max2: 99 },
  '/': { min1: 2, max1: 9, min2: 2, max2: 50 },
};

/**
 * Generate a single problem deterministically using the provided PRNG.
 */
function generateSeededProblem(rng: () => number, operation: Operation): Problem {
  const range = INTERMEDIATE_RANGES[operation];

  if (operation === '/') {
    // Division with integer answer: (divisor * quotient) / divisor = quotient
    const divisor = seededRandomInt(rng, range.min1, range.max1);
    const quotient = seededRandomInt(rng, range.min2, range.max2);
    const dividend = divisor * quotient;
    return { operand1: dividend, operand2: divisor, operation: '/', answer: quotient };
  }

  const a = seededRandomInt(rng, range.min1, range.max1);
  const b = seededRandomInt(rng, range.min2, range.max2);

  if (operation === '-') {
    const op1 = Math.max(a, b);
    const op2 = Math.min(a, b);
    return { operand1: op1, operand2: op2, operation: '-', answer: op1 - op2 };
  }

  if (operation === '+') {
    return { operand1: a, operand2: b, operation: '+', answer: a + b };
  }

  // multiplication
  return { operand1: a, operand2: b, operation: '*', answer: a * b };
}

/**
 * Generate 5 daily problems deterministically from a date string (YYYY-MM-DD).
 * Same date always produces the same problems.
 */
export function generateDailyProblems(dateStr: string): Problem[] {
  const seed = hashDateString(dateStr);
  const rng = mulberry32(seed);

  const problems: Problem[] = [];

  for (let i = 0; i < 5; i++) {
    // Pick operation using PRNG — distributes evenly across all 4 operations
    const opIndex = seededRandomInt(rng, 0, OPERATIONS.length - 1);
    const operation = OPERATIONS[opIndex];
    problems.push(generateSeededProblem(rng, operation));
  }

  return problems;
}
