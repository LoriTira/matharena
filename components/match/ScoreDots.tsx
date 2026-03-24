'use client';

import { motion } from 'framer-motion';

interface ScoreDotsProps {
  score: number;
  targetScore: number;
  color?: 'gold' | 'white' | 'muted';
  size?: 'sm' | 'md';
}

const colorMap = {
  gold: { filled: 'bg-accent', empty: 'bg-shade' },
  white: { filled: 'bg-ink-secondary', empty: 'bg-shade' },
  muted: { filled: 'bg-ink-muted', empty: 'bg-shade' },
};

const sizeMap = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
};

export function ScoreDots({ score, targetScore, color = 'white', size = 'md' }: ScoreDotsProps) {
  const colors = colorMap[color];
  const dotSize = sizeMap[size];

  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: targetScore }).map((_, i) => (
        <motion.div
          key={i}
          className={`${dotSize} rounded-full ${i < score ? colors.filled : colors.empty}`}
          initial={false}
          animate={
            i === score - 1 && score > 0
              ? { scale: [1, 1.4, 1] }
              : { scale: 1 }
          }
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}
