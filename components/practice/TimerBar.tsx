'use client';

import { motion } from 'framer-motion';

interface TimerBarProps {
  timeRemaining: number;
  totalDuration: number;
}

export function TimerBar({ timeRemaining, totalDuration }: TimerBarProps) {
  const progress = timeRemaining / totalDuration;
  const isUrgent = timeRemaining <= 10;
  const isCritical = timeRemaining <= 3;

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = Math.floor(timeRemaining % 60);
  const timeText = `${minutes}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span
          className={`font-mono text-sm tabular-nums transition-colors ${
            isCritical
              ? 'text-red-400 animate-score-bounce'
              : isUrgent
                ? 'text-red-400/80'
                : 'text-ink-muted'
          }`}
        >
          {timeText}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-shade overflow-hidden">
        <motion.div
          className="h-full rounded-full transition-colors duration-500"
          style={{
            width: `${progress * 100}%`,
            backgroundColor: isUrgent ? 'rgba(248, 113, 113, 0.8)' : 'var(--accent)',
          }}
          transition={{ duration: 0.1, ease: 'linear' }}
        />
      </div>
    </div>
  );
}
