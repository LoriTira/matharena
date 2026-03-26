'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface HeartsDisplayProps {
  hearts: number;
  maxHearts?: number;
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill={filled ? 'var(--feedback-wrong)' : 'var(--border-default)'}
      />
    </svg>
  );
}

export function HeartsDisplay({ hearts, maxHearts = 3 }: HeartsDisplayProps) {
  return (
    <div className="flex items-center gap-1">
      <AnimatePresence mode="popLayout">
        {Array.from({ length: maxHearts }).map((_, i) => (
          <motion.div
            key={i}
            animate={i < hearts ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0.4 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <Heart filled={i < hearts} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
