'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import Sparkline from '@/components/ui/Sparkline';
import type { Operation, PracticeSessionRecord } from '@/types';

interface PracticeResultsProps {
  score: number;
  correctCount: number;
  wrongCount: number;
  bestStreak: number;
  operationBreakdown: Partial<Record<Operation, { correct: number; wrong: number }>>;
  isNewPersonalBest: boolean;
  previousBest: number | null;
  personalBest: number | null;
  sessionHistory: PracticeSessionRecord[];
  onPlayAgain: () => void;
  onSettings: () => void;
  /** When true, replaces the action row with the "Sign in to keep your score" hero CTA. */
  isGuest?: boolean;
}

const OPERATION_LABELS: Record<Operation, { symbol: string; name: string }> = {
  '+': { symbol: '+', name: 'Addition' },
  '-': { symbol: '−', name: 'Subtraction' },
  '*': { symbol: '×', name: 'Multiplication' },
  '/': { symbol: '÷', name: 'Division' },
};

export function PracticeResults({
  score,
  correctCount,
  wrongCount,
  bestStreak,
  operationBreakdown,
  isNewPersonalBest,
  previousBest,
  personalBest,
  sessionHistory,
  onPlayAgain,
  onSettings,
  isGuest = false,
}: PracticeResultsProps) {
  const accuracy = correctCount + wrongCount > 0
    ? ((correctCount / (correctCount + wrongCount)) * 100).toFixed(1)
    : '100.0';

  const sparklineData = [...sessionHistory]
    .reverse()
    .map((s) => s.score);

  const operations = Object.entries(operationBreakdown) as [Operation, { correct: number; wrong: number }][];

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-[60vh] gap-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      {/* Score */}
      <motion.div
        className="text-center"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
      >
        <div className="text-[12px] tracking-[4px] font-black text-accent mb-2">
          {isGuest ? '▸ FINAL SCORE' : '▸ SESSION COMPLETE'}
        </div>
        <div className="font-serif text-8xl font-black text-ink tabular-nums leading-none tracking-tight">
          <AnimatedNumber value={score} duration={1.0} />
        </div>
        <div className="text-[12px] tracking-[3px] font-black text-ink-tertiary mt-3">PROBLEMS SOLVED</div>
      </motion.div>

      {/* Personal best badge */}
      {!isGuest && isNewPersonalBest && (
        <motion.div
          className="flex items-center gap-2"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, delay: 0.6 }}
        >
          <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-black text-[11px] font-bold px-3 py-1 rounded-full tracking-[1px] animate-gold-pulse">
            🏆 NEW PERSONAL BEST!
          </span>
        </motion.div>
      )}

      {/* Previous best comparison */}
      {!isGuest && previousBest !== null && (
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          {isNewPersonalBest ? (
            <div className="text-[12px] text-feedback-correct font-mono">
              Previous best: {previousBest} → {score} (+{score - previousBest})
            </div>
          ) : (
            <div className="text-[12px] text-ink-faint font-mono">
              Personal best: {personalBest}
              {personalBest !== null && score < personalBest && (
                <span className="text-ink-muted"> ({personalBest - score} away)</span>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Sparkline */}
      {!isGuest && sparklineData.length > 1 && (
        <motion.div
          className="w-full max-w-xs flex flex-col items-center gap-1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <div className="text-[9px] tracking-[1.5px] text-ink-faint">LAST {sparklineData.length} SESSIONS</div>
          <Sparkline data={sparklineData} width={280} height={40} />
        </motion.div>
      )}

      {/* Stats grid */}
      <motion.div
        className="grid grid-cols-4 gap-[1px] w-full max-w-sm bg-shade rounded-sm overflow-hidden"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
      >
        {[
          { label: 'CORRECT', value: String(correctCount), color: 'text-feedback-correct' },
          { label: 'WRONG', value: String(wrongCount), color: 'text-feedback-wrong' },
          { label: 'ACCURACY', value: `${accuracy}%`, color: 'text-accent' },
          { label: 'STREAK', value: `🔥 ${bestStreak}`, color: 'text-accent-muted' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            className="bg-page px-3 py-3 flex flex-col items-center gap-1"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 + i * 0.08 }}
          >
            <div className="text-[8px] tracking-[1.5px] text-ink-muted">{stat.label}</div>
            <div className={`font-mono text-[15px] tabular-nums ${stat.color}`}>{stat.value}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Per-operation breakdown */}
      {operations.length > 1 && (
        <motion.div
          className="w-full max-w-sm bg-card border border-edge-faint rounded-sm p-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
        >
          <div className="text-[9px] tracking-[1.5px] text-ink-faint mb-2">BREAKDOWN BY OPERATION</div>
          <div className="space-y-1.5">
            {operations.map(([op, data]) => {
              const total = data.correct + data.wrong;
              const pct = total > 0 ? Math.round((data.correct / total) * 100) : 0;
              const colorClass = pct >= 80 ? 'text-feedback-correct' : pct >= 60 ? 'text-ink-secondary' : 'text-feedback-wrong';

              return (
                <div key={op} className="flex items-center justify-between text-[13px]">
                  <span className="text-ink-secondary font-mono">
                    {OPERATION_LABELS[op].symbol} {OPERATION_LABELS[op].name}
                  </span>
                  <span className={`font-mono tabular-nums ${colorClass}`}>
                    {data.correct}/{total} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Actions */}
      {isGuest ? (
        <motion.div
          className="w-full max-w-md mt-4"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
        >
          <div className="relative rounded-xl border-[3px] border-accent bg-gradient-to-br from-accent-glow via-panel to-panel p-7 text-center shadow-[0_0_60px_var(--accent-glow)] overflow-hidden">
            <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/15 via-transparent to-transparent" />
            <div className="relative">
              <div className="text-[11px] tracking-[4px] font-black text-accent uppercase mb-3">
                ▸ YOUR SCORE IS UNSAVED
              </div>
              <div className="font-serif text-3xl font-black text-ink mb-3 tracking-tight leading-tight">
                Sign in to keep <em className="not-italic text-accent">{score}.</em>
              </div>
              <p className="text-[13px] font-medium text-ink-tertiary leading-relaxed mb-6 max-w-xs mx-auto">
                Track your PB, climb the global leaderboard, and unlock ranked duels — all free.
              </p>
              <Link
                href="/login?redirect=/practice%3Fsprint%3D120"
                className="inline-block px-8 py-3.5 bg-accent text-on-accent font-black text-[13px] tracking-[2.5px] rounded-md transition-all hover:scale-[1.02] shadow-[0_8px_30px_var(--accent-glow)]"
              >
                SIGN IN TO PLAY
              </Link>
              <button
                onClick={onPlayAgain}
                className="block mx-auto mt-5 text-[12px] tracking-[1.5px] font-semibold text-ink-muted hover:text-ink-secondary transition-colors"
              >
                or play again as guest →
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          className="flex items-center gap-3 mt-4"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
        >
          <button
            onClick={onPlayAgain}
            className="px-10 py-4 bg-btn text-btn-text font-black text-sm tracking-[2.5px] rounded-md transition-all hover:scale-[1.02] hover:bg-btn-hover"
          >
            PLAY AGAIN
          </button>
          <button
            onClick={onSettings}
            className="px-6 py-3 border-2 border-edge-strong text-ink-secondary text-xs font-bold tracking-[2px] rounded-md transition-colors hover:border-edge-bold hover:text-ink"
          >
            SETTINGS
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
