'use client';

import { motion } from 'framer-motion';
import { GameTimer } from '@/components/game/GameTimer';

interface TimerBarProps {
  timeRemaining: number;
  totalDuration: number;
}

export function TimerBar({ timeRemaining, totalDuration }: TimerBarProps) {
  const progress = timeRemaining / totalDuration;
  const isUrgent = timeRemaining <= 10;
  const isCritical = timeRemaining <= 3;
  const state = isCritical ? 'critical' : isUrgent ? 'urgent' : 'normal';

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <GameTimer
          elapsedMs={Math.max(0, timeRemaining * 1000)}
          variant="compact"
          state={state}
        />
      </div>
      <div className="h-1.5 w-full rounded-full bg-shade overflow-hidden">
        <motion.div
          className="h-full rounded-full transition-colors duration-500"
          style={{
            width: `${progress * 100}%`,
            backgroundColor: isUrgent ? 'var(--feedback-wrong)' : 'var(--accent)',
          }}
          transition={{ duration: 0.1, ease: 'linear' }}
        />
      </div>
    </div>
  );
}
