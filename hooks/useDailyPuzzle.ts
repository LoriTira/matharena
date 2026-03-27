'use client';

import { useState, useCallback, useRef } from 'react';
import type { ClientProblem, Operation } from '@/types';

export type DailyPuzzleStatus =
  | 'loading'
  | 'countdown'
  | 'playing'
  | 'completed'
  | 'already_done';

interface SubmitResult {
  rank: number;
  totalPlayers: number;
  totalTimeMs: number;
}

interface LeaderboardEntry {
  username: string;
  total_time_ms: number;
  rank: number;
}

function computeAnswer(p: ClientProblem): number {
  switch (p.operation as Operation) {
    case '+':
      return p.operand1 + p.operand2;
    case '-':
      return p.operand1 - p.operand2;
    case '*':
      return p.operand1 * p.operand2;
    case '/':
      return p.operand1 / p.operand2;
    default:
      return 0;
  }
}

export function useDailyPuzzle() {
  const [status, setStatus] = useState<DailyPuzzleStatus>('loading');
  const [problems, setProblems] = useState<ClientProblem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [problemTimes, setProblemTimes] = useState<number[]>([]);
  const [totalTimeMs, setTotalTimeMs] = useState(0);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [streak, setStreak] = useState(0);
  const [completedToday, setCompletedToday] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);

  const problemStartTimeRef = useRef<number>(0);
  const puzzleStartTimeRef = useRef<number>(0);
  const answersRef = useRef<number[]>([]);
  const problemTimesRef = useRef<number[]>([]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch('/api/daily/leaderboard');
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard ?? []);
      }
    } catch {
      // Silently fail
    }
  }, []);

  const fetchStreak = useCallback(async () => {
    try {
      const res = await fetch('/api/daily/streak', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setStreak(data.streak ?? 0);
        setCompletedToday(data.completedToday ?? false);
      }
    } catch {
      // Silently fail
    }
  }, []);

  const initialize = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await fetch('/api/daily/puzzle', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Failed to fetch puzzle');
      }
      const data = await res.json();
      setProblems(data.problems ?? []);

      if (data.completed) {
        // User already completed today
        setCompletedToday(true);
        if (data.result) {
          setTotalTimeMs(data.result.total_time_ms);
          setProblemTimes(data.result.problem_times ?? []);
          if (data.result.rank != null) {
            setResult({
              rank: data.result.rank,
              totalPlayers: data.result.totalPlayers,
              totalTimeMs: data.result.total_time_ms,
            });
          }
        }
        setStatus('already_done');
        await Promise.all([fetchLeaderboard(), fetchStreak()]);
      } else {
        setStatus('countdown');
      }
    } catch {
      // On error, stay in loading — page can show an error state
    }
  }, [fetchLeaderboard, fetchStreak]);

  const startPlaying = useCallback(() => {
    const now = Date.now();
    problemStartTimeRef.current = now;
    puzzleStartTimeRef.current = now;
    answersRef.current = [];
    problemTimesRef.current = [];
    setCurrentIndex(0);
    setProblemTimes([]);
    setAnswers([]);
    setStatus('playing');
  }, []);

  const submitAnswer = useCallback(
    async (answer: number): Promise<boolean> => {
      const now = Date.now();
      const elapsed = now - problemStartTimeRef.current;
      const expected = computeAnswer(problems[currentIndex]);

      // Round to handle floating point for division
      const isCorrect =
        Math.abs(answer - expected) < 0.001;

      if (!isCorrect) {
        return false;
      }

      // Record time and answer
      const newTimes = [...problemTimesRef.current, elapsed];
      const newAnswers = [...answersRef.current, answer];
      problemTimesRef.current = newTimes;
      answersRef.current = newAnswers;
      setProblemTimes(newTimes);
      setAnswers(newAnswers);

      const nextIndex = currentIndex + 1;

      if (nextIndex >= problems.length) {
        // All problems done — submit
        const totalMs = now - puzzleStartTimeRef.current;
        setTotalTimeMs(totalMs);

        try {
          const res = await fetch('/api/daily/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              answers: newAnswers,
              problemTimes: newTimes,
              totalTimeMs: totalMs,
            }),
          });

          if (res.ok) {
            const submitData = await res.json();
            setResult({
              rank: submitData.rank,
              totalPlayers: submitData.totalPlayers,
              totalTimeMs: submitData.totalTimeMs,
            });
          }
        } catch {
          // Submission failed — still show completed locally
        }

        setStatus('completed');
        await Promise.all([fetchLeaderboard(), fetchStreak()]);
      } else {
        // Move to next problem
        setCurrentIndex(nextIndex);
        problemStartTimeRef.current = Date.now();
      }

      return true;
    },
    [problems, currentIndex, fetchLeaderboard, fetchStreak]
  );

  return {
    status,
    problems,
    currentIndex,
    problemTimes,
    totalTimeMs,
    result,
    streak,
    completedToday,
    leaderboard,
    answers,
    initialize,
    startPlaying,
    submitAnswer,
  };
}
