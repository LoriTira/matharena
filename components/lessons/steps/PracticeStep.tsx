'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { PracticeStep as PracticeStepType } from '@/types';

interface PracticeStepProps {
  step: PracticeStepType;
  onCorrect: () => void;
  onWrong: () => void;
}

export function PracticeStep({ step, onCorrect, onWrong }: PracticeStepProps) {
  const [value, setValue] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value || feedback !== null) return;

    const answer = parseFloat(value);
    if (isNaN(answer)) return;

    if (answer === step.answer) {
      setFeedback('correct');
      setTimeout(() => onCorrect(), 800);
    } else {
      setFeedback('wrong');
      setAttempts((a) => a + 1);
      if (step.hint && attempts === 0) {
        setShowHint(true);
      }
      onWrong();
      setTimeout(() => {
        setFeedback(null);
        setValue('');
        inputRef.current?.focus();
      }, 600);
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
      <p className="text-ink-secondary text-base text-center">{step.prompt}</p>

      <div className="font-mono text-4xl md:text-5xl text-ink tabular-nums">
        {step.operand1} {step.operation} {step.operand2}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-3 w-full max-w-sm">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={feedback === 'correct'}
            className={`w-full px-6 py-4 text-2xl font-mono text-center rounded-sm border bg-card text-ink focus:outline-none transition-colors
              ${feedback === 'correct' ? 'border-[var(--feedback-correct)]/50 bg-[var(--feedback-correct)]/5' : ''}
              ${feedback === 'wrong' ? 'border-[var(--feedback-wrong)]/50 bg-[var(--feedback-wrong)]/5 animate-shake' : ''}
              ${!feedback ? 'border-edge focus:border-edge-strong focus:ring-1 focus:ring-edge' : ''}
            `}
            placeholder="Your answer"
            autoComplete="off"
          />
        </div>
        <button
          type="submit"
          disabled={!value || feedback === 'correct'}
          className="px-8 py-4 bg-btn text-btn-text font-semibold text-xl rounded-sm transition-colors hover:bg-btn-hover disabled:opacity-30 disabled:cursor-not-allowed"
        >
          &rarr;
        </button>
      </form>

      {showHint && (
        <motion.div
          className="text-sm text-ink-muted bg-accent-glow border border-accent-subtle px-4 py-3 rounded-sm text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="text-accent font-medium">Hint: </span>{step.hint}
        </motion.div>
      )}
    </motion.div>
  );
}
