'use client';

import { useEffect, useState } from 'react';

interface StreakCounterProps {
  streak: number;
}

function getStreakTier(streak: number) {
  if (streak >= 15) {
    return {
      emoji: '🔥🔥🔥',
      colorClass: 'text-amber-400',
      glowClass: 'drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]',
      sizeClass: 'text-xl',
      animate: 'animate-gold-pulse',
    };
  }
  if (streak >= 10) {
    return {
      emoji: '🔥🔥',
      colorClass: 'text-amber-400',
      glowClass: 'drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]',
      sizeClass: 'text-lg',
      animate: '',
    };
  }
  if (streak >= 5) {
    return {
      emoji: '🔥',
      colorClass: 'text-accent',
      glowClass: 'drop-shadow-[0_0_6px_var(--accent-glow)]',
      sizeClass: 'text-base',
      animate: '',
    };
  }
  return {
    emoji: '🔥',
    colorClass: 'text-ink-muted',
    glowClass: '',
    sizeClass: 'text-sm',
    animate: '',
  };
}

export function StreakCounter({ streak }: StreakCounterProps) {
  const [bouncing, setBouncing] = useState(false);
  const tier = getStreakTier(streak);

  useEffect(() => {
    if (streak > 0 && streak >= 5) {
      setBouncing(true);
      const timeout = setTimeout(() => setBouncing(false), 400);
      return () => clearTimeout(timeout);
    }
  }, [streak]);

  if (streak === 0) return null;

  return (
    <div
      className={`font-mono tabular-nums flex items-center gap-1 ${tier.colorClass} ${tier.sizeClass} ${tier.glowClass} ${tier.animate} ${bouncing ? 'animate-score-bounce' : ''}`}
    >
      <span>{tier.emoji}</span>
      <span className="font-semibold">{streak}</span>
    </div>
  );
}
