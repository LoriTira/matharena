'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

interface LessonFailedProps {
  lessonTitle: string;
  stepsCompleted: number;
  totalSteps: number;
  onRetry: () => void;
}

export function LessonFailed({ lessonTitle, stepsCompleted, totalSteps, onRetry }: LessonFailedProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 px-6">
      <motion.div
        className="text-5xl"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        {'\uD83D\uDCAA'}
      </motion.div>

      <motion.div
        className="font-serif text-3xl font-normal text-ink-secondary text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        Don&apos;t give up!
      </motion.div>

      <motion.p
        className="text-ink-muted text-sm text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        You made it through {stepsCompleted} of {totalSteps} steps in {lessonTitle}.
      </motion.p>

      <motion.div
        className="flex flex-col items-center gap-3 mt-4 w-full max-w-xs"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <button
          onClick={onRetry}
          className="w-full py-4 bg-btn text-btn-text text-sm font-semibold tracking-[1.5px] rounded-sm transition-colors hover:bg-btn-hover"
        >
          TRY AGAIN
        </button>
        <Link
          href="/lessons"
          className="text-ink-muted text-sm underline underline-offset-2 decoration-edge hover:text-ink-secondary transition-colors"
        >
          Back to lessons
        </Link>
      </motion.div>
    </div>
  );
}
