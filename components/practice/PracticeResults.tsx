'use client';

import { motion } from 'framer-motion';
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
        <div className="text-[11px] tracking-[2px] text-ink-muted mb-1">SESSION COMPLETE</div>
        <div className="font-mono text-6xl font-medium text-ink tabular-nums">
          <AnimatedNumber value={score} duration={1.0} />
        </div>
        <div className="text-[12px] tracking-[1px] text-accent mt-1">PROBLEMS SOLVED</div>
      </motion.div>

      {/* Personal best badge */}
      {isNewPersonalBest && (
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
      {previousBest !== null && (
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
      {sparklineData.length > 1 && (
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
      <motion.div
        className="flex items-center gap-3 mt-4"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
      >
        <button
          onClick={onPlayAgain}
          className="px-10 py-4 bg-btn text-btn-text font-semibold text-sm tracking-[2px] rounded-sm transition-colors hover:bg-btn-hover"
        >
          PLAY AGAIN
        </button>
        <button
          onClick={onSettings}
          className="px-6 py-3 border border-edge text-ink-tertiary text-xs tracking-[1.5px] rounded-sm transition-colors hover:border-edge-strong hover:text-ink-secondary"
        >
          SETTINGS
        </button>
      </motion.div>
    </motion.div>
  );
}
