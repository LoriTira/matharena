'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { HeartsDisplay } from './HeartsDisplay';

interface LessonCompleteProps {
  lessonTitle: string;
  hearts: number;
  xpEarned: number;
  isPerfect: boolean;
}

function VictoryBurst() {
  const rays = 8;
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
      {Array.from({ length: rays }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-[2px] h-32 origin-bottom"
          style={{
            rotate: `${(360 / rays) * i}deg`,
            background: 'linear-gradient(to top, transparent, var(--accent-muted), transparent)',
          }}
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: [0, 1.5, 0], opacity: [0, 0.8, 0] }}
          transition={{ duration: 1.2, delay: 0.1 + i * 0.05, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

function AnimatedNumber({ value, duration = 1.0 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <>{display}</>;
}

export function LessonComplete({ lessonTitle, hearts, xpEarned, isPerfect }: LessonCompleteProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 relative px-6">
      <VictoryBurst />

      <motion.div
        className="font-serif text-4xl md:text-5xl font-normal text-accent text-center"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.3 }}
      >
        Lesson Complete!
      </motion.div>

      <motion.p
        className="text-ink-muted text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        {lessonTitle}
      </motion.p>

      {/* XP earned */}
      <motion.div
        className="flex flex-col items-center gap-1"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <div className="font-mono text-4xl text-accent tabular-nums">
          +<AnimatedNumber value={xpEarned} /> XP
        </div>
      </motion.div>

      {/* Hearts remaining */}
      <motion.div
        className="flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0 }}
      >
        <HeartsDisplay hearts={hearts} />
      </motion.div>

      {/* Perfect badge */}
      {isPerfect && (
        <motion.div
          className="px-6 py-3 rounded-sm border border-accent/30 bg-accent-glow flex items-center gap-2"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2, type: 'spring', stiffness: 200 }}
        >
          <span className="text-lg">{'\u2B50'}</span>
          <span className="text-[12px] tracking-[2px] text-accent font-semibold">PERFECT!</span>
        </motion.div>
      )}

      {/* Actions */}
      <motion.div
        className="flex flex-col items-center gap-3 mt-4 w-full max-w-xs"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4 }}
      >
        <Link
          href="/lessons"
          className="w-full py-4 bg-btn text-btn-text text-sm font-semibold tracking-[1.5px] rounded-sm transition-colors hover:bg-btn-hover text-center block"
        >
          CONTINUE
        </Link>
      </motion.div>
    </div>
  );
}
