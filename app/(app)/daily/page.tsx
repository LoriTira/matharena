'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { ProblemDisplay } from '@/components/match/ProblemDisplay';
import { AnswerInput } from '@/components/match/AnswerInput';
import { Panel } from '@/components/arcade/Panel';
import { Btn } from '@/components/arcade/Btn';
import { BigNum } from '@/components/arcade/BigNum';
import { Tag } from '@/components/arcade/Tag';
import { SectionHead } from '@/components/arcade/SectionHead';
import { Skeleton } from '@/components/ui/Skeleton';
import { NextPuzzleCountdown } from '@/components/daily/NextPuzzleCountdown';
import { formatLeaderboardTime } from '@/lib/daily/formatTime';
import { createClient } from '@/lib/supabase/client';
import { getTodayPuzzleDate } from '@/lib/problems/dateUtils';

function formatProblemTime(ms: number): string {
  return (ms / 1000).toFixed(1) + 's';
}

function formatTotalTime(ms: number): string {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) return `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`;
  return seconds.toFixed(1) + 's';
}

// ─────────────────────────────────────────────
// Countdown overlay
// ─────────────────────────────────────────────
function CountdownOverlay({ onComplete }: { onComplete: () => void }) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count > 0) {
      const timer = setTimeout(() => setCount(count - 1), 1000);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(onComplete, 600);
    return () => clearTimeout(timer);
  }, [count, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-page/95 backdrop-blur-sm">
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="font-display font-extrabold text-[140px] md:text-[220px] tabular-nums leading-none tracking-[-10px]"
          style={{
            color: count > 0 ? 'var(--text-primary)' : 'var(--neon-cyan)',
            textShadow: count === 0 ? '0 0 60px rgba(54,228,255,0.6)' : '0 0 40px rgba(254,246,228,0.2)',
          }}
        >
          {count > 0 ? count : 'GO!'}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────
// Timer
// ─────────────────────────────────────────────
function TimerDisplay({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setElapsed(Date.now() - startTime), 100);
    return () => clearInterval(interval);
  }, [startTime]);
  return (
    <span className="font-mono font-bold text-[22px] md:text-[28px] text-gold tabular-nums">
      {formatTotalTime(elapsed)}
    </span>
  );
}

// ─────────────────────────────────────────────
// Streak calendar (last 21 days)
// ─────────────────────────────────────────────
interface StreakCalendarProps {
  completedDates: Set<string>;
  currentDate: string;
  freezes?: number;
}

function StreakCalendar({ completedDates, currentDate, freezes = 0 }: StreakCalendarProps) {
  const days: { date: string; completed: boolean; today: boolean }[] = [];
  const todayUtc = new Date(currentDate + 'T00:00:00Z');
  for (let i = 20; i >= 0; i--) {
    const d = new Date(todayUtc);
    d.setUTCDate(todayUtc.getUTCDate() - i);
    const iso = d.toISOString().split('T')[0];
    days.push({ date: iso, completed: completedDates.has(iso), today: iso === currentDate });
  }
  const completedCount = days.filter((d) => d.completed).length;

  return (
    <Panel padding={20} className="md:p-[26px]">
      <div className="flex justify-between items-center mb-[14px]">
        <span className="font-mono text-[10px] text-ink-faint uppercase tracking-[1.6px]">Last 21 days</span>
        <span className="font-mono text-[11px] text-coral">
          🔥 {completedCount}{freezes > 0 ? ` / ◆ ${freezes} freezes` : ''}
        </span>
      </div>
      <div className="grid grid-cols-[repeat(21,1fr)] gap-[4px]">
        {days.map((d, i) => {
          const opacity = d.completed ? 0.5 + (i / days.length) * 0.5 : 1;
          return (
            <div
              key={d.date}
              className="aspect-square grid place-items-center font-mono text-[9px] font-bold"
              style={{
                background: d.today
                  ? 'var(--neon-gold)'
                  : d.completed
                    ? `rgba(255, 139, 61, ${opacity})`
                    : 'var(--bg-raised)',
                border: d.today
                  ? '2px solid var(--neon-gold)'
                  : d.completed
                    ? '1px solid var(--neon-coral)'
                    : '1px solid var(--border-default)',
                color: d.today || d.completed ? '#0a0612' : 'var(--text-faint)',
                boxShadow: d.today ? '0 0 12px var(--neon-gold)' : 'none',
              }}
              title={d.date}
            >
              {d.today ? '◆' : d.completed ? '' : '◇'}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ─────────────────────────────────────────────
// Leaderboard
// ─────────────────────────────────────────────
function LeaderboardTable({
  leaderboard,
  currentUsername,
}: {
  leaderboard: { username: string; total_time_ms: number; rank: number }[];
  currentUsername?: string | null;
}) {
  const top10 = leaderboard.slice(0, 10);
  if (top10.length === 0) {
    return (
      <div className="font-mono text-[12px] text-ink-faint py-4 text-center uppercase tracking-[1.4px]">
        No entries yet. Be the first.
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between px-2 py-2 border-b border-edge font-mono text-[10px] text-ink-faint uppercase tracking-[1.4px]">
        <div className="flex items-center gap-3">
          <span className="w-6 text-center">#</span>
          <span>Player</span>
        </div>
        <span>Time</span>
      </div>
      {top10.map((entry) => {
        const isMe = currentUsername === entry.username;
        return (
          <div
            key={`${entry.rank}-${entry.username}`}
            className={`flex items-center justify-between px-2 py-[10px] border-b border-edge last:border-b-0 ${
              isMe ? 'bg-accent-glow' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`font-mono text-[11px] w-6 text-center tabular-nums ${isMe ? 'text-cyan' : 'text-ink-tertiary'}`}>
                {entry.rank}
              </span>
              <span className={`font-mono text-[12px] ${isMe ? 'text-cyan font-semibold' : 'text-ink'}`}>
                {isMe ? 'YOU' : entry.username}
              </span>
            </div>
            <span className={`font-mono text-[11px] tabular-nums ${isMe ? 'text-cyan' : 'text-ink-tertiary'}`}>
              {formatLeaderboardTime(entry.total_time_ms)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// Results view
// ─────────────────────────────────────────────
function ResultsView({
  totalTimeMs,
  problemTimes,
  result,
  streak,
  leaderboard,
  isCelebration,
  currentUsername,
  completedDates,
}: {
  totalTimeMs: number;
  problemTimes: number[];
  result: { rank: number; totalPlayers: number; totalTimeMs: number } | null;
  streak: number;
  leaderboard: { username: string; total_time_ms: number; rank: number }[];
  isCelebration: boolean;
  currentUsername?: string | null;
  completedDates: Set<string>;
}) {
  const pct =
    result && result.totalPlayers > 0
      ? Math.round(((result.totalPlayers - result.rank + 1) / result.totalPlayers) * 100)
      : null;

  return (
    <div className="space-y-[14px]">
      <div className="text-center mb-2">
        <div className="font-mono text-[10px] text-gold uppercase tracking-[2.4px] mb-[10px]">
          ☼ Daily puzzle · {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
        </div>
        {isCelebration ? (
          <motion.h1
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: 'spring' }}
            className="font-display font-extrabold text-[36px] md:text-[58px] tracking-[-1.4px] leading-[1]"
          >
            <span className="text-gold italic">{streak}</span>-day streak.
          </motion.h1>
        ) : (
          <h1 className="font-display font-extrabold text-[32px] md:text-[48px] tracking-[-1.2px] leading-[1]">
            You crushed <span className="text-gold italic">today&rsquo;s</span>.
          </h1>
        )}
        <div className="mt-[10px] font-mono text-[11px] text-ink-tertiary tracking-[1px] uppercase">
          {isCelebration ? `Resets in · ` : 'Come back tomorrow · '}
          <NextPuzzleCountdown className="inline" />
        </div>
      </div>

      <StreakCalendar completedDates={completedDates} currentDate={getTodayPuzzleDate()} />

      <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-[14px]">
        <Panel padding={24}>
          <SectionHead no="01" title="Your run" color="cyan" />
          <div className="text-center mb-4">
            <div className="font-mono text-[10px] text-ink-faint uppercase tracking-[2px] mb-[4px]">Total time</div>
            <BigNum n={formatTotalTime(totalTimeMs)} color="cyan" size={56} />
          </div>

          {problemTimes.length > 0 && (
            <div className="grid grid-cols-5 gap-[8px] mt-4">
              {problemTimes.map((time, i) => (
                <div
                  key={i}
                  className="border border-edge bg-page px-2 py-3 text-center"
                >
                  <div className="font-mono text-[9px] text-ink-faint uppercase tracking-[1.2px]">#{i + 1}</div>
                  <div className="font-display font-bold text-[14px] md:text-[16px] text-ink tabular-nums mt-[2px]">
                    {formatProblemTime(time)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {result && (
            <div className="mt-5 grid grid-cols-3 gap-[1px] bg-edge">
              <div className="bg-panel p-3 text-center">
                <div className="font-mono text-[10px] text-ink-faint uppercase tracking-[1.4px]">Solved today</div>
                <div className="font-display font-bold text-[18px] text-cyan">{result.totalPlayers}</div>
              </div>
              <div className="bg-panel p-3 text-center">
                <div className="font-mono text-[10px] text-ink-faint uppercase tracking-[1.4px]">Rank</div>
                <div className="font-display font-bold text-[18px] text-gold">#{result.rank}</div>
              </div>
              <div className="bg-panel p-3 text-center">
                <div className="font-mono text-[10px] text-ink-faint uppercase tracking-[1.4px]">Percentile</div>
                <div className="font-display font-bold text-[18px] text-lime">{pct !== null ? `Top ${100 - pct + 1}%` : '—'}</div>
              </div>
            </div>
          )}
        </Panel>

        <Panel padding={24}>
          <SectionHead no="02" title="Today's leaderboard" color="gold" />
          <LeaderboardTable leaderboard={leaderboard} currentUsername={currentUsername} />
        </Panel>
      </div>

      <div className="flex gap-[10px] justify-center flex-wrap pt-2">
        <Link href="/dashboard"><Btn size="lg" variant="ghost">Dashboard</Btn></Link>
        <Link href="/play"><Btn size="lg" variant="primary">▶ Play ranked</Btn></Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────
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
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [puzzleStartTime, setPuzzleStartTime] = useState(0);
  const [username, setUsername] = useState<string | null>(null);
  const [completedDates, setCompletedDates] = useState<Set<string>>(new Set());

  useEffect(() => { initialize(); }, [initialize]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [profileRes, historyRes] = await Promise.all([
        supabase.from('profiles').select('username, display_name').eq('id', user.id).single(),
        supabase
          .from('daily_puzzle_results')
          .select('puzzle_date')
          .eq('user_id', user.id)
          .order('puzzle_date', { ascending: false })
          .limit(30),
      ]);
      if (profileRes.data) setUsername(profileRes.data.username as string);
      if (historyRes.data) {
        setCompletedDates(new Set(historyRes.data.map((r: { puzzle_date: string }) => r.puzzle_date)));
      }
    })();
  }, [user, supabase, status]);

  useEffect(() => {
    if (status === 'completed' && totalTimeMs > 0) {
      addToast(`Puzzle complete in ${formatTotalTime(totalTimeMs)}`, 'success');
    }
  }, [status, totalTimeMs, addToast]);

  const handleCountdownComplete = useCallback(() => {
    startPlaying();
    setPuzzleStartTime(Date.now());
  }, [startPlaying]);

  const handleSubmit = useCallback(
    async (answer: number) => {
      const feedbackFn = (window as unknown as Record<string, unknown>)
        .__answerInputFeedback as ((correct: boolean) => void) | undefined;
      const correct = await submitAnswer(answer);
      feedbackFn?.(correct);
    },
    [submitAnswer]
  );

  if (status === 'loading') {
    return (
      <div className="max-w-3xl mx-auto space-y-6 py-8">
        <Skeleton className="h-14 w-80 mx-auto" />
        <Skeleton className="h-32" />
        <Skeleton className="h-40" />
        <Skeleton className="h-16 w-64 mx-auto" />
      </div>
    );
  }

  if (status === 'countdown') {
    return (
      <div className="max-w-3xl mx-auto">
        <CountdownOverlay onComplete={handleCountdownComplete} />
      </div>
    );
  }

  if (status === 'playing') {
    const currentProblem = problems[currentIndex];
    return (
      <div className="max-w-3xl mx-auto py-4">
        <div className="text-center mb-4">
          <Tag color="gold">Daily puzzle · Problem {currentIndex + 1} / {problems.length}</Tag>
        </div>

        {/* Progress gates */}
        <div className="flex items-center justify-center gap-[6px] mb-6">
          {problems.map((_, i) => (
            <div
              key={i}
              className="h-[4px] flex-1 max-w-[48px]"
              style={{
                background:
                  i < currentIndex ? 'var(--neon-cyan)'
                  : i === currentIndex ? 'var(--neon-gold)'
                  : 'var(--border-default)',
                boxShadow:
                  i < currentIndex ? '0 0 8px var(--neon-cyan)'
                  : i === currentIndex ? '0 0 8px var(--neon-gold)'
                  : 'none',
              }}
            />
          ))}
        </div>

        <div
          className="relative border border-edge-strong px-5 py-8 md:px-8 md:py-10"
          style={{ background: 'linear-gradient(180deg, var(--bg-raised), var(--bg-base))' }}
        >
          <div className="absolute top-4 left-4 font-mono text-[10px] text-ink-faint uppercase tracking-[2px]">
            Problem {currentIndex + 1}
          </div>
          <div className="absolute top-4 right-4">
            <TimerDisplay startTime={puzzleStartTime} />
          </div>

          {currentProblem && (
            <>
              <ProblemDisplay
                operand1={currentProblem.operand1}
                operand2={currentProblem.operand2}
                operation={currentProblem.operation}
              />
              <AnswerInput onSubmit={handleSubmit} />
            </>
          )}
        </div>
      </div>
    );
  }

  if (status === 'completed' || status === 'already_done') {
    return (
      <div className="max-w-5xl mx-auto py-2">
        <ResultsView
          totalTimeMs={totalTimeMs}
          problemTimes={problemTimes}
          result={result}
          streak={streak}
          leaderboard={leaderboard}
          isCelebration={status === 'completed'}
          currentUsername={username}
          completedDates={completedDates}
        />
      </div>
    );
  }

  return null;
}
