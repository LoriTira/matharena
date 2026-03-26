'use client';

import { motion } from 'framer-motion';
import type { TeachStep as TeachStepType } from '@/types';

interface TeachStepProps {
  step: TeachStepType;
  onContinue: () => void;
}

export function TeachStep({ step, onContinue }: TeachStepProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center text-center gap-6 px-6 max-w-lg mx-auto"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.3 }}
    >
      {step.emoji && (
        <motion.div
          className="text-5xl"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
        >
          {step.emoji}
        </motion.div>
      )}

      {step.title && (
        <h2 className="font-serif text-2xl text-ink font-normal">{step.title}</h2>
      )}

      <p className="text-ink-secondary text-base leading-relaxed">{step.content}</p>

      {step.formula && (
        <motion.div
          className="font-mono text-lg text-accent bg-accent-glow border border-accent-subtle px-6 py-3 rounded-sm"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          {step.formula}
        </motion.div>
      )}

      <motion.button
        onClick={onContinue}
        className="mt-4 w-full max-w-xs py-4 bg-btn text-btn-text text-sm font-semibold tracking-[1.5px] rounded-sm transition-colors hover:bg-btn-hover"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        CONTINUE
      </motion.button>
    </motion.div>
  );
}
