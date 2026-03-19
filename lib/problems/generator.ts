import type { Problem, Operation, DifficultyTier } from '@/types';
import { OPERATIONS } from '@/lib/constants';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function eloToTier(avgElo: number): DifficultyTier {
  if (avgElo < 800) return 'beginner';
  if (avgElo < 1200) return 'intermediate';
  if (avgElo < 1600) return 'advanced';
  if (avgElo < 2000) return 'expert';
  return 'master';
}

export function difficultyToTier(difficulty: number): DifficultyTier {
  const tiers: DifficultyTier[] = ['beginner', 'intermediate', 'advanced', 'expert', 'master'];
  return tiers[Math.min(difficulty - 1, tiers.length - 1)];
}

function getOperandRange(tier: DifficultyTier, operation: Operation) {
  const ranges: Record<DifficultyTier, Record<Operation, { min1: number; max1: number; min2: number; max2: number }>> = {
    beginner: {
      '+': { min1: 1, max1: 20, min2: 1, max2: 20 },
      '-': { min1: 1, max1: 20, min2: 1, max2: 20 },
      '*': { min1: 1, max1: 9, min2: 1, max2: 9 },
      '/': { min1: 1, max1: 9, min2: 1, max2: 9 },
    },
    intermediate: {
      '+': { min1: 10, max1: 100, min2: 10, max2: 100 },
      '-': { min1: 10, max1: 100, min2: 10, max2: 100 },
      '*': { min1: 2, max1: 12, min2: 2, max2: 99 },
      '/': { min1: 2, max1: 9, min2: 2, max2: 50 },
    },
    advanced: {
      '+': { min1: 100, max1: 999, min2: 100, max2: 999 },
      '-': { min1: 100, max1: 999, min2: 100, max2: 999 },
      '*': { min1: 10, max1: 99, min2: 10, max2: 99 },
      '/': { min1: 2, max1: 99, min2: 2, max2: 50 },
    },
    expert: {
      '+': { min1: 100, max1: 9999, min2: 100, max2: 9999 },
      '-': { min1: 100, max1: 9999, min2: 100, max2: 9999 },
      '*': { min1: 10, max1: 999, min2: 10, max2: 99 },
      '/': { min1: 2, max1: 99, min2: 2, max2: 500 },
    },
    master: {
      '+': { min1: 1000, max1: 99999, min2: 1000, max2: 99999 },
      '-': { min1: 1000, max1: 99999, min2: 1000, max2: 99999 },
      '*': { min1: 100, max1: 999, min2: 100, max2: 999 },
      '/': { min1: 2, max1: 999, min2: 2, max2: 500 },
    },
  };
  return ranges[tier][operation];
}

export function generateProblem(operation: Operation, tier: DifficultyTier): Problem {
  const range = getOperandRange(tier, operation);

  if (operation === '/') {
    // Generate division with integer answer: (a * b) / a = b
    const divisor = randomInt(range.min1, range.max1);
    const quotient = randomInt(range.min2, range.max2);
    const dividend = divisor * quotient;
    return { operand1: dividend, operand2: divisor, operation: '/', answer: quotient };
  }

  const a = randomInt(range.min1, range.max1);
  const b = randomInt(range.min2, range.max2);

  if (operation === '-') {
    // Ensure non-negative result
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

function pickRandomOperation(tier: DifficultyTier): Operation {
  if (tier === 'beginner') {
    // Beginners: mostly addition and subtraction
    const ops: Operation[] = ['+', '+', '-', '-', '*'];
    return ops[Math.floor(Math.random() * ops.length)];
  }
  // All tiers above beginner: all four operations
  return OPERATIONS[Math.floor(Math.random() * OPERATIONS.length)];
}

export function generateProblems(avgElo: number, count: number): Problem[] {
  const tier = eloToTier(avgElo);
  return Array.from({ length: count }, () => {
    const op = pickRandomOperation(tier);
    return generateProblem(op, tier);
  });
}

export function generatePracticeProblems(
  operation: Operation,
  difficulty: number,
  count: number
): Problem[] {
  const tier = difficultyToTier(difficulty);
  return Array.from({ length: count }, () => generateProblem(operation, tier));
}
