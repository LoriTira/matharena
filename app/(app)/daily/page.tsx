'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { useToast } from '@/hooks/useToast';
import { ProblemDisplay } from '@/components/match/ProblemDisplay';
import { AnswerInput } from '@/components/match/AnswerInput';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Countdown } from '@/components/game/Countdown';
import { GameTimer } from '@/components/game/GameTimer';
import { NextPuzzleCountdown } from '@/components/daily/NextPuzzleCountdown';
import { formatLeaderboardTime } from '@/lib/daily/formatTime';
import { formatElapsedWithTenths } from '@/lib/format/time';

function formatProblemTime(ms: number): string {
  return (ms / 1000).toFixed(1) + 's';
}

function TimerDisplay({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 100);
    return () => clearInterval(interval);
  }, [startTime]);

  return <GameTimer elapsedMs={elapsed} variant="prominent" />;
}

// --- Leaderboard Table ---

function LeaderboardTable({
  leaderboard,
}: {
  leaderboard: { username: string; total_time_ms: number; rank: number }[];
}) {
  const top10 = leaderboard.slice(0, 10);

  if (top10.length === 0) {
    return (
      <div className="text-[12px] text-ink-faint py-4 text-center">
        No entries yet. Be the first!
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-2.5 border-b-2 border-edge-strong">
        <div className="flex items-center gap-3">
          <span className="text-[11px] tracking-[2px] font-black text-ink-tertiary w-6 text-center">#</span>
          <span className="text-[11px] tracking-[2px] font-black text-ink-tertiary">PLAYER</span>
        </div>
        <span className="text-[11px] tracking-[2px] font-black text-ink-tertiary">TIME</span>
      </div>
      {/* Rows */}
      {top10.map((entry) => (
        <div
          key={`${entry.rank}-${entry.username}`}
          className="flex items-center justify-between px-2 py-3 border-b border-edge-faint last:border-b-0"
        >
          <div className="flex items-center gap-3">
            <span className="font-mono text-[12px] font-black text-ink-tertiary w-6 text-center tabular-nums">
              {entry.rank}
            </span>
            <span className="text-[13px] font-semibold text-ink-secondary">{entry.username}</span>
          </div>
          <span className="font-mono text-[12px] font-bold text-ink tabular-nums">
            {formatLeaderboardTime(entry.total_time_ms)}
          </span>
        </div>
      ))}
    </div>
  );
}

// --- Results View ---

function ResultsView({
  totalTimeMs,
  problemTimes,
  result,
  streak,
  leaderboard,
  isCelebration,
}: {
  totalTimeMs: number;
  problemTimes: number[];
  result: { rank: number; totalPlayers: number; totalTimeMs: number } | null;
  streak: number;
  leaderboard: { username: string; total_time_ms: number; rank: number }[];
  isCelebration: boolean;
}) {
  return (
    <div className="space-y-7">
      {/* Heading */}
      {isCelebration ? (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="text-center"
        >
          <div className="text-[12px] tracking-[5px] font-black text-accent mb-3">▸ DAILY PUZZLE</div>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-black text-accent leading-none tracking-tight">
            Puzzle complete!
          </h1>
        </motion.div>
      ) : (
        <div className="text-center">
          <div className="text-[12px] tracking-[5px] font-black text-accent mb-3">▸ DAILY PUZZLE</div>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-black text-ink leading-none tracking-tight">
            Today&apos;s puzzle.
          </h1>
          <p className="text-[13px] font-medium text-ink-tertiary mt-3">Already done today.</p>
        </div>
      )}

      {/* Next puzzle countdown */}
      <NextPuzzleCountdown />

      {/* Total Time */}
      <div className="text-center">
        <div className="text-[11px] tracking-[3px] font-black text-ink-tertiary mb-2">TOTAL TIME</div>
        <div className="font-mono text-[44px] sm:text-[56px] md:text-[64px] font-black text-ink tabular-nums leading-none tracking-tight">
          {formatElapsedWithTenths(totalTimeMs)}
        </div>
      </div>

      {/* Per-problem times */}
      {problemTimes.length > 0 && (
        <Card variant="default" className="p-5 rounded-xl border-2 border-edge-strong">
          <div className="text-[11px] tracking-[3px] font-black text-ink-tertiary mb-4">▸ PROBLEM TIMES</div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {problemTimes.map((time, i) => (
              <div key={i} className="text-center bg-shade rounded-md py-2.5 px-1">
                <div className="text-[11px] font-black text-ink-tertiary mb-1">#{i + 1}</div>
                <div className="font-mono text-[15px] font-black text-ink tabular-nums">
                  {formatProblemTime(time)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Rank + Streak row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {result && (
          <Card variant="highlight" className="p-5 text-center rounded-xl border-2 border-accent bg-accent-glow shadow-[0_0_30px_var(--accent-glow)]">
            <div className="text-[11px] tracking-[3px] font-black text-accent mb-2">▸ YOUR RANK</div>
            <div className="font-mono text-4xl font-black text-accent tabular-nums leading-none">
              #{result.rank}
            </div>
            <div className="text-[12px] font-semibold text-ink-tertiary mt-2">
              out of {result.totalPlayers} player{result.totalPlayers !== 1 ? 's' : ''}
            </div>
          </Card>
        )}
        <Card variant="default" className="p-5 text-center rounded-xl border-2 border-edge-strong">
          <div className="text-[11px] tracking-[3px] font-black text-ink-tertiary mb-2">▸ STREAK</div>
          <div className="font-mono text-4xl font-black text-ink tabular-nums leading-none flex items-center justify-center gap-2">
            <span className="text-2xl">🔥</span>
            {streak}
          </div>
          <div className="text-[12px] font-semibold text-ink-tertiary mt-2">
            day{streak !== 1 ? 's' : ''} in a row
          </div>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card variant="default" className="p-5 rounded-xl border-2 border-edge-strong">
        <div className="text-[11px] tracking-[3px] font-black text-ink-tertiary mb-4">▸ TODAY&apos;S LEADERBOARD</div>
        <LeaderboardTable leaderboard={leaderboard} />
      </Card>

      {/* Back button */}
      <div className="text-center pt-2">
        <Link
          href="/"
          className="inline-block px-8 py-4 bg-accent text-on-accent text-[12px] tracking-[2.5px] font-black rounded-md hover:scale-[1.02] transition-all shadow-[0_4px_24px_var(--accent-glow)]"
        >
          ▸ BACK TO DASHBOARD
        </Link>
      </div>
    </div>
  );
}

// --- Main Page ---

export default function DailyPuzzlePage() {
  const {
    status,
    problems,
    currentIndex,
    problemTimes,
    totalTimeMs,
    result,
    streak,
    leaderboard,
    initialize,
    startPlaying,
    submitAnswer,
  } = useDailyPuzzle();
  const { addToast } = useToast();

  const [puzzleStartTime, setPuzzleStartTime] = useState(0);

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Show toast on puzzle completion
  useEffect(() => {
    if (status === 'completed' && totalTimeMs > 0) {
      const totalSeconds = totalTimeMs / 1000;
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const timeStr = minutes > 0
        ? `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`
        : `${seconds.toFixed(1)}s`;
      addToast(`Puzzle complete in ${timeStr}!`, 'success');
    }
  }, [status]);

  const handleCountdownComplete = useCallback(() => {
    startPlaying();
    setPuzzleStartTime(Date.now());
  }, [startPlaying]);

  const handleSubmit = useCallback(
    async (answer: number) => {
      const feedbackFn = (window as unknown as Record<string, unknown>)
        .__answerInputFeedback as ((correct: boolean) => void) | undefined;

      const correct = await submitAnswer(answer);

      if (correct) {
        feedbackFn?.(true);
      } else {
        feedbackFn?.(false);
      }
    },
    [submitAnswer]
  );

  // --- Loading ---
  if (status === 'loading') {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-8">
        <Skeleton className="h-10 w-48 mx-auto" />
        <Skeleton className="h-40" />
        <Skeleton className="h-24" />
        <Skeleton className="h-12 w-64 mx-auto" />
      </div>
    );
  }

  // --- Countdown ---
  if (status === 'countdown') {
    return (
      <div className="max-w-2xl mx-auto">
        <Countdown onComplete={handleCountdownComplete} stepMs={1000} />
        {/* Underlying content so the page isn't blank after overlay fades */}
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 opacity-0">
          <h1 className="font-serif text-4xl font-black text-ink">DAILY PUZZLE</h1>
        </div>
      </div>
    );
  }

  // --- Playing ---
  if (status === 'playing') {
    const currentProblem = problems[currentIndex];

    return (
      <div className="max-w-2xl mx-auto py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="text-[10px] tracking-[3px] font-black text-accent mb-1">▸ DAILY</div>
            <h1 className="font-serif text-xl sm:text-2xl font-black text-ink leading-none tracking-tight">Today&apos;s puzzle</h1>
          </div>
          <div className="text-right">
            <div className="text-[10px] tracking-[3px] font-black text-ink-tertiary mb-1">
              PROBLEM <span className="text-accent">{currentIndex + 1}</span>/5
            </div>
            <TimerDisplay startTime={puzzleStartTime} />
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          {problems.map((_, i) => (
            <div
              key={i}
              className={`h-3 rounded-full transition-all border-2 ${
                i < currentIndex
                  ? 'w-3 bg-accent border-accent shadow-[0_0_8px_var(--accent-glow)]'
                  : i === currentIndex
                    ? 'w-8 bg-ink border-ink'
                    : 'w-3 bg-transparent border-edge-strong'
              }`}
            />
          ))}
        </div>

        {/* Problem */}
        {currentProblem && (
          <div>
            <ProblemDisplay
              operand1={currentProblem.operand1}
              operand2={currentProblem.operand2}
              operation={currentProblem.operation}
            />
            <div className="mt-6">
              <AnswerInput onSubmit={handleSubmit} />
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- Completed (just finished) ---
  if (status === 'completed') {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <ResultsView
          totalTimeMs={totalTimeMs}
          problemTimes={problemTimes}
          result={result}
          streak={streak}
          leaderboard={leaderboard}
          isCelebration={true}
        />
      </div>
    );
  }

  // --- Already Done ---
  if (status === 'already_done') {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <ResultsView
          totalTimeMs={totalTimeMs}
          problemTimes={problemTimes}
          result={result}
          streak={streak}
          leaderboard={leaderboard}
          isCelebration={false}
        />
      </div>
    );
  }

  return null;
}
