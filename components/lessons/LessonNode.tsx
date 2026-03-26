'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { InteractiveLesson } from '@/types';
import type { LessonState } from '@/hooks/useLessonProgress';

interface LessonNodeProps {
  lesson: InteractiveLesson;
  state: LessonState;
  index: number;
}

export function LessonNode({ lesson, state, index }: LessonNodeProps) {
  const nodeContent = (
    <motion.div
      className="flex items-center gap-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      {/* Circle node */}
      <div
        className={`relative w-14 h-14 rounded-full flex items-center justify-center text-2xl shrink-0 border-2 transition-all
          ${state === 'completed' ? 'border-accent bg-accent-subtle' : ''}
          ${state === 'available' ? 'border-accent bg-accent-glow animate-gold-pulse' : ''}
          ${state === 'locked' ? 'border-edge bg-shade opacity-40' : ''}
        `}
      >
        {state === 'completed' ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <span className={state === 'locked' ? 'grayscale opacity-50' : ''}>
            {lesson.emoji}
          </span>
        )}
      </div>

      {/* Text */}
      <div className="min-w-0">
        <div className={`font-serif text-base leading-tight ${
          state === 'locked' ? 'text-ink-faint' : state === 'completed' ? 'text-ink-secondary' : 'text-ink'
        }`}>
          {lesson.title}
        </div>
        <div className={`text-[13px] mt-0.5 ${
          state === 'locked' ? 'text-ink-faint' : 'text-ink-muted'
        }`}>
          {lesson.description}
        </div>
        {state === 'completed' && (
          <div className="text-[11px] text-accent mt-1 tracking-wide font-mono">COMPLETED</div>
        )}
      </div>
    </motion.div>
  );

  if (state === 'locked') {
    return (
      <div className="cursor-not-allowed">
        {nodeContent}
      </div>
    );
  }

  return (
    <Link
      href={`/lessons/${lesson.slug}`}
      className="block group hover:opacity-90 transition-opacity"
    >
      {nodeContent}
    </Link>
  );
}
