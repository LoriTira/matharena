'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Operation, Problem, PracticeConfig, PracticeSessionRecord, OperationRange } from '@/types';
import { PRACTICE_DIFFICULTY_RANGES } from '@/lib/constants';
import { generateMixedPracticeProblem } from '@/lib/problems/generator';

export type PracticePhase = 'idle' | 'countdown' | 'playing' | 'finished';

interface PracticeStats {
  correct: number;
  wrong: number;
  streak: number;
  bestStreak: number;
  operationBreakdown: Partial<Record<Operation, { correct: number; wrong: number }>>;
}

interface PracticeSession {
  phase: PracticePhase;
  config: PracticeConfig;
  currentProblem: Problem | null;
  problemCount: number;
  stats: PracticeStats;
  timeRemaining: number;
  totalDuration: number;
  sessionHistory: PracticeSessionRecord[];
  personalBest: number | null;
  isNewPersonalBest: boolean;
  previousBest: number | null;
  setConfig: (config: Partial<PracticeConfig>) => void;
  startSession: () => void;
  submitAnswer: (answer: number) => boolean;
  resetToSetup: () => void;
  replaySession: () => void;
  getRangesForConfig: () => Record<Operation, OperationRange>;
}

const DEFAULT_CONFIG: PracticeConfig = {
  operations: ['+', '-', '*', '/'],
  duration: 120,
  difficulty: 'standard',
};

export function usePracticeSession(initialConfig?: Partial<PracticeConfig>): PracticeSession {
  const [phase, setPhase] = useState<PracticePhase>('idle');
  const [config, setConfigState] = useState<PracticeConfig>({ ...DEFAULT_CONFIG, ...initialConfig });
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [problemCount, setProblemCount] = useState(0);
  const [stats, setStats] = useState<PracticeStats>({
    correct: 0,
    wrong: 0,
    streak: 0,
    bestStreak: 0,
    operationBreakdown: {},
  });
  const [timeRemaining, setTimeRemaining] = useState(120);
  const [sessionHistory, setSessionHistory] = useState<PracticeSessionRecord[]>([]);
  const [personalBest, setPersonalBest] = useState<number | null>(null);
  const [isNewPersonalBest, setIsNewPersonalBest] = useState(false);
  const [previousBest, setPreviousBest] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const configRef = useRef(config);
  const statsRef = useRef(stats);

  configRef.current = config;
  statsRef.current = stats;

  // Load session history on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/practice/session?limit=10');
      if (res.ok) {
        const data = await res.json();
        setSessionHistory(data.sessions || []);
        setPersonalBest(data.personalBest);
      }
    } catch {
      // silently fail — history is non-critical
    }
  };

  const getRangesForConfig = useCallback((): Record<Operation, OperationRange> => {
    const baseRanges = PRACTICE_DIFFICULTY_RANGES[config.difficulty];
    if (config.customRanges) {
      return {
        ...baseRanges,
        ...config.customRanges,
      } as Record<Operation, OperationRange>;
    }
    return baseRanges;
  }, [config.difficulty, config.customRanges]);

  const generateNext = useCallback(() => {
    const ranges = getRangesForConfig();
    const problem = generateMixedPracticeProblem(configRef.current.operations, ranges);
    setCurrentProblem(problem);
    setProblemCount((c) => c + 1);
  }, [getRangesForConfig]);

  const setConfig = useCallback((partial: Partial<PracticeConfig>) => {
    setConfigState((prev) => ({ ...prev, ...partial }));
  }, []);

  const finishSession = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const currentStats = statsRef.current;
    const currentConfig = configRef.current;

    const prevBest = personalBest;
    setPreviousBest(prevBest);
    const score = currentStats.correct;
    const isNewPB = prevBest === null || score > prevBest;
    setIsNewPersonalBest(isNewPB);
    if (isNewPB) setPersonalBest(score);

    setPhase('finished');

    // Save to DB
    try {
      const res = await fetch('/api/practice/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration: currentConfig.duration,
          operations: currentConfig.operations,
          config: currentConfig,
          score,
          correctCount: currentStats.correct,
          wrongCount: currentStats.wrong,
          bestStreak: currentStats.bestStreak,
          operationBreakdown: currentStats.operationBreakdown,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          setSessionHistory((prev) => [data.session, ...prev].slice(0, 10));
        }
        if (data.personalBest !== undefined) {
          setPersonalBest(data.personalBest);
        }
      }
    } catch {
      // silently fail
    }
  }, [personalBest]);

  const startSession = useCallback(() => {
    setStats({ correct: 0, wrong: 0, streak: 0, bestStreak: 0, operationBreakdown: {} });
    setTimeRemaining(configRef.current.duration);
    setProblemCount(0);
    setIsNewPersonalBest(false);
    setPreviousBest(null);
    setPhase('countdown');

    // After 3-second countdown, start playing
    setTimeout(() => {
      setPhase('playing');
      startTimeRef.current = Date.now();

      // Generate first problem
      const ranges = getRangesForConfig();
      const problem = generateMixedPracticeProblem(configRef.current.operations, ranges);
      setCurrentProblem(problem);
      setProblemCount(1);

      // Start timer
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const remaining = Math.max(0, configRef.current.duration - elapsed);
        setTimeRemaining(remaining);

        if (remaining <= 0) {
          finishSession();
        }
      }, 100);
    }, 3000);
  }, [getRangesForConfig, finishSession]);

  const submitAnswer = useCallback((answer: number): boolean => {
    if (!currentProblem || phase !== 'playing') return false;

    const isCorrect = answer === currentProblem.answer;
    const op = currentProblem.operation;

    setStats((prev) => {
      const opBreakdown = { ...prev.operationBreakdown };
      if (!opBreakdown[op]) opBreakdown[op] = { correct: 0, wrong: 0 };
      const entry = { ...opBreakdown[op]! };

      if (isCorrect) {
        entry.correct += 1;
        const newStreak = prev.streak + 1;
        return {
          correct: prev.correct + 1,
          wrong: prev.wrong,
          streak: newStreak,
          bestStreak: Math.max(prev.bestStreak, newStreak),
          operationBreakdown: { ...opBreakdown, [op]: entry },
        };
      } else {
        entry.wrong += 1;
        return {
          correct: prev.correct,
          wrong: prev.wrong + 1,
          streak: 0,
          bestStreak: prev.bestStreak,
          operationBreakdown: { ...opBreakdown, [op]: entry },
        };
      }
    });

    if (isCorrect) {
      generateNext();
    }

    return isCorrect;
  }, [currentProblem, phase, generateNext]);

  const resetToSetup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setPhase('idle');
    setCurrentProblem(null);
    setProblemCount(0);
  }, []);

  const replaySession = useCallback(() => {
    startSession();
  }, [startSession]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return {
    phase,
    config,
    currentProblem,
    problemCount,
    stats,
    timeRemaining,
    totalDuration: config.duration,
    sessionHistory,
    personalBest,
    isNewPersonalBest,
    previousBest,
    setConfig,
    startSession,
    submitAnswer,
    resetToSetup,
    replaySession,
    getRangesForConfig,
  };
}
