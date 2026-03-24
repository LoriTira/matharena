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

function formatProblemTime(ms: number): string {
  return (ms / 1000).toFixed(1) + 's';
}

function formatTotalTime(ms: number): string {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`;
  }
  return seconds.toFixed(1) + 's';
}

function formatLeaderboardTime(ms: number): string {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`;
  }
  return seconds.toFixed(1) + 's';
}

// --- Countdown Overlay ---

function CountdownOverlay({ onComplete }: { onComplete: () => void }) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count > 0) {
      const timer = setTimeout(() => setCount(count - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Show "GO!" for 600ms, then transition
      const timer = setTimeout(onComplete, 600);
      return () => clearTimeout(timer);
    }
  }, [count, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-page/95">
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="font-mono text-[120px] md:text-[180px] font-bold tabular-nums"
          style={{ color: count > 0 ? 'rgba(255,255,255,0.9)' : '#F59E0B' }}
        >
          {count > 0 ? count : 'GO!'}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// --- Timer Display ---

function TimerDisplay({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 100);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <span className="font-mono text-2xl text-ink-secondary tabular-nums">
      {formatTotalTime(elapsed)}
    </span>
  );
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
      <div className="flex items-center justify-between px-2 py-2 border-b border-edge">
        <div className="flex items-center gap-3">
          <span className="text-[9px] tracking-[1px] text-ink-faint w-6 text-center">#</span>
          <span className="text-[9px] tracking-[1px] text-ink-faint">PLAYER</span>
        </div>
        <span className="text-[9px] tracking-[1px] text-ink-faint">TIME</span>
      </div>
      {/* Rows */}
      {top10.map((entry) => (
        <div
          key={`${entry.rank}-${entry.username}`}
          className="flex items-center justify-between px-2 py-2.5 border-b border-edge-faint last:border-b-0"
        >
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-ink-muted w-6 text-center tabular-nums">
              {entry.rank}
            </span>
            <span className="text-[12px] text-ink-secondary">{entry.username}</span>
          </div>
          <span className="font-mono text-[11px] text-ink-tertiary tabular-nums">
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
    <div className="space-y-6">
      {/* Heading */}
      {isCelebration ? (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="text-center"
        >
          <h1 className="font-serif text-3xl md:text-4xl font-light text-accent">
            PUZZLE COMPLETE!
          </h1>
        </motion.div>
      ) : (
        <div className="text-center">
          <h1 className="font-serif text-2xl font-light text-ink-secondary">
            Today&apos;s Puzzle
          </h1>
          <p className="text-[11px] text-ink-muted mt-1">You already completed today&apos;s puzzle</p>
        </div>
      )}

      {/* Total Time */}
      <div className="text-center">
        <div className="text-[9px] tracking-[2px] text-ink-faint mb-2">TOTAL TIME</div>
        <div className="font-mono text-[48px] md:text-[56px] font-normal text-ink tabular-nums leading-none">
          {formatTotalTime(totalTimeMs)}
        </div>
      </div>

      {/* Per-problem times */}
      {problemTimes.length > 0 && (
        <Card variant="default" className="p-4">
          <div className="text-[9px] tracking-[2px] text-ink-faint mb-3">PROBLEM TIMES</div>
          <div className="grid grid-cols-5 gap-2">
            {problemTimes.map((time, i) => (
              <div key={i} className="text-center">
                <div className="text-[10px] text-ink-muted mb-1">#{i + 1}</div>
                <div className="font-mono text-[14px] text-ink-secondary tabular-nums">
                  {formatProblemTime(time)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Rank + Streak row */}
      <div className="grid grid-cols-2 gap-4">
        {result && (
          <Card variant="highlight" className="p-4 text-center">
            <div className="text-[9px] tracking-[2px] text-ink-faint mb-2">YOUR RANK</div>
            <div className="font-mono text-[28px] text-accent tabular-nums leading-none">
              #{result.rank}
            </div>
            <div className="text-[10px] text-ink-muted mt-1.5">
              out of {result.totalPlayers} player{result.totalPlayers !== 1 ? 's' : ''}
            </div>
          </Card>
        )}
        <Card variant="default" className="p-4 text-center">
          <div className="text-[9px] tracking-[2px] text-ink-faint mb-2">STREAK</div>
          <div className="font-mono text-[28px] text-ink-secondary tabular-nums leading-none flex items-center justify-center gap-1.5">
            <span className="text-xl">🔥</span>
            {streak}
          </div>
          <div className="text-[10px] text-ink-muted mt-1.5">
            day{streak !== 1 ? 's' : ''} in a row
          </div>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card variant="default" className="p-4">
        <div className="text-[9px] tracking-[2px] text-ink-faint mb-3">TODAY&apos;S LEADERBOARD</div>
        <LeaderboardTable leaderboard={leaderboard} />
      </Card>

      {/* Back button */}
      <div className="text-center pt-2">
        <Link
          href="/dashboard"
          className="inline-block px-8 py-3 border border-edge text-ink-tertiary text-[10px] tracking-[2px] font-semibold rounded-sm hover:border-edge-strong hover:text-ink-secondary transition-colors"
        >
          BACK TO DASHBOARD
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
        <CountdownOverlay onComplete={handleCountdownComplete} />
        {/* Underlying content so the page isn't blank after overlay fades */}
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 opacity-0">
          <h1 className="font-serif text-3xl font-light text-ink">DAILY PUZZLE</h1>
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
            <h1 className="font-serif text-xl font-light text-ink">DAILY PUZZLE</h1>
          </div>
          <div className="text-right">
            <div className="text-[9px] tracking-[2px] text-ink-faint mb-1">
              PROBLEM {currentIndex + 1}/5
            </div>
            <TimerDisplay startTime={puzzleStartTime} />
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {problems.map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i < currentIndex
                  ? 'bg-accent'
                  : i === currentIndex
                    ? 'bg-ink-secondary'
                    : 'bg-shade'
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
