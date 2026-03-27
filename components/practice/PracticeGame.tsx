'use client';

import { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProblemDisplay } from '@/components/match/ProblemDisplay';
import { AnswerInput } from '@/components/match/AnswerInput';
import { TimerBar } from './TimerBar';
import { StreakCounter } from './StreakCounter';
import type { Problem } from '@/types';

interface PracticeGameProps {
  currentProblem: Problem | null;
  problemCount: number;
  stats: { correct: number; wrong: number; streak: number };
  timeRemaining: number;
  totalDuration: number;
  onSubmitAnswer: (answer: number) => boolean;
}

const problemVariants = {
  enter: { x: 80, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -80, opacity: 0 },
};

export function PracticeGame({
  currentProblem,
  problemCount,
  stats,
  timeRemaining,
  totalDuration,
  onSubmitAnswer,
}: PracticeGameProps) {
  const feedbackRef = useRef<((correct: boolean) => void) | null>(null);
  const [shaking, setShaking] = useState(false);

  const accuracy = stats.correct + stats.wrong > 0
    ? Math.round((stats.correct / (stats.correct + stats.wrong)) * 100)
    : 100;

  const handleSubmit = useCallback((answer: number) => {
    const correct = onSubmitAnswer(answer);
    feedbackRef.current?.(correct);

    if (!correct) {
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    }
  }, [onSubmitAnswer]);

  return (
    <motion.div
      className="flex flex-col items-center gap-6 py-4 w-full max-w-lg mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      {/* Timer + Streak row */}
      <div className="w-full flex items-end gap-4">
        <div className="flex-1">
          <TimerBar timeRemaining={timeRemaining} totalDuration={totalDuration} />
        </div>
        <StreakCounter streak={stats.streak} />
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-8">
        <div className="text-center">
          <div className="text-[10px] tracking-[2px] text-ink-faint">CORRECT</div>
          <div className="font-mono text-xl text-green-500 tabular-nums">{stats.correct}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] tracking-[2px] text-ink-faint">WRONG</div>
          <div className="font-mono text-xl text-red-400/70 tabular-nums">{stats.wrong}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] tracking-[2px] text-ink-faint">ACCURACY</div>
          <div className="font-mono text-xl text-accent tabular-nums">{accuracy}%</div>
        </div>
      </div>

      {/* Problem display with slide transition */}
      <div className={shaking ? 'animate-shake' : ''}>
        <AnimatePresence mode="wait">
          {currentProblem && (
            <motion.div
              key={problemCount}
              variants={problemVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30, duration: 0.25 }}
            >
              <ProblemDisplay
                operand1={currentProblem.operand1}
                operand2={currentProblem.operand2}
                operation={currentProblem.operation}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Answer input */}
      <div className="w-full max-w-sm">
        <AnswerInput onSubmit={handleSubmit} feedbackRef={feedbackRef} />
      </div>
    </motion.div>
  );
}
