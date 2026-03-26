'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ExampleStep as ExampleStepType } from '@/types';

interface ExampleStepProps {
  step: ExampleStepType;
  onContinue: () => void;
}

export function ExampleStep({ step, onContinue }: ExampleStepProps) {
  const [revealedCount, setRevealedCount] = useState(0);
  const allRevealed = revealedCount >= step.revealSteps.length;

  const handleReveal = () => {
    if (!allRevealed) {
      setRevealedCount((c) => c + 1);
    }
  };

  return (
    <motion.div
      className="flex flex-col items-center gap-6 px-6 max-w-lg mx-auto"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.3 }}
    >
      <div className="text-[11px] tracking-[2px] text-ink-muted uppercase">Worked Example</div>

      <div className="font-mono text-3xl md:text-4xl text-ink tabular-nums">
        {step.problem}
      </div>

      <div className="w-full space-y-3 min-h-[120px]">
        <AnimatePresence>
          {step.revealSteps.slice(0, revealedCount).map((text, i) => (
            <motion.div
              key={i}
              className="flex items-start gap-3 px-4 py-3 border border-edge rounded-sm bg-card"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <span className="font-mono text-accent text-sm mt-0.5">{i + 1}</span>
              <span className="text-ink-secondary text-[15px]">{text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {allRevealed && (
        <motion.div
          className="font-mono text-4xl text-accent font-medium"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
        >
          = {step.finalAnswer}
        </motion.div>
      )}

      {!allRevealed ? (
        <motion.button
          onClick={handleReveal}
          className="w-full max-w-xs py-4 border border-edge text-ink-secondary text-sm font-semibold tracking-[1.5px] rounded-sm transition-colors hover:border-edge-strong hover:text-ink"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {revealedCount === 0 ? 'SHOW FIRST STEP' : 'NEXT STEP'}
        </motion.button>
      ) : (
        <motion.button
          onClick={onContinue}
          className="w-full max-w-xs py-4 bg-btn text-btn-text text-sm font-semibold tracking-[1.5px] rounded-sm transition-colors hover:bg-btn-hover"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          CONTINUE
        </motion.button>
      )}
    </motion.div>
  );
}
