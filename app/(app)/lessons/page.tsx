'use client';

import { motion } from 'framer-motion';
import { LESSONS } from '@/lib/lessons';
import { useLessonProgress } from '@/hooks/useLessonProgress';
import { JourneyPath } from '@/components/lessons/JourneyPath';
import { Skeleton } from '@/components/ui/Skeleton';

export default function LessonsPage() {
  const { progress, totalXp, loading, getState } = useLessonProgress();

  const completedCount = progress.length;
  const totalCount = LESSONS.length;

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full max-w-xl mx-auto" />
        <div className="space-y-6 max-w-xl mx-auto">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <div className="text-[11px] tracking-[4px] font-black text-accent mb-2">▸ LEARN</div>
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-black text-ink leading-none tracking-tight">
          Lessons.
        </h1>
        <p className="text-ink-tertiary mt-3 text-[14px] font-medium">Master mental math, one trick at a time.</p>
      </div>

      {/* Progress summary */}
      <motion.div
        className="max-w-xl mx-auto border-2 border-edge-strong rounded-xl p-5 sm:p-6 bg-panel"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] tracking-[2.5px] font-black text-ink-tertiary uppercase">Progress</div>
            <div className="font-mono text-3xl font-black text-ink tabular-nums mt-1">
              {completedCount}<span className="text-ink-faint">/{totalCount}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] tracking-[2.5px] font-black text-ink-tertiary uppercase">Total XP</div>
            <div className="font-mono text-3xl font-black text-accent tabular-nums mt-1">
              {totalXp}
            </div>
          </div>
        </div>
        {/* Mini progress bar */}
        <div className="h-2 w-full rounded-full bg-shade overflow-hidden mt-4">
          <motion.div
            className="h-full rounded-full bg-accent shadow-[0_0_12px_var(--accent-glow)]"
            initial={{ width: 0 }}
            animate={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
          />
        </div>
      </motion.div>

      {/* Journey path */}
      <JourneyPath lessons={LESSONS} getState={getState} />
    </div>
  );
}
