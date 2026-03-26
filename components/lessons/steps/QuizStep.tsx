'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { QuizStep as QuizStepType } from '@/types';

interface QuizStepProps {
  step: QuizStepType;
  onCorrect: () => void;
  onWrong: () => void;
}

export function QuizStep({ step, onCorrect, onWrong }: QuizStepProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);

  const handleSelect = (index: number) => {
    if (answered) return;

    setSelected(index);
    setAnswered(true);

    if (index === step.correctIndex) {
      setTimeout(() => onCorrect(), 1000);
    } else {
      onWrong();
      setTimeout(() => {
        setSelected(null);
        setAnswered(false);
      }, 1500);
    }
  };

  const getOptionStyle = (index: number) => {
    if (!answered || selected === null) {
      return 'border-edge text-ink-secondary hover:border-edge-strong hover:text-ink';
    }
    if (index === step.correctIndex) {
      return 'border-[var(--feedback-correct)]/50 bg-[var(--feedback-correct)]/5 text-[var(--feedback-correct)]';
    }
    if (index === selected && index !== step.correctIndex) {
      return 'border-[var(--feedback-wrong)]/50 bg-[var(--feedback-wrong)]/5 text-[var(--feedback-wrong)] animate-shake';
    }
    return 'border-edge text-ink-muted opacity-50';
  };

  return (
    <motion.div
      className="flex flex-col items-center gap-6 px-6 max-w-lg mx-auto"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.3 }}
    >
      <p className="text-ink text-lg text-center font-medium">{step.question}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        {step.options.map((option, i) => (
          <motion.button
            key={i}
            onClick={() => handleSelect(i)}
            disabled={answered}
            className={`px-4 py-4 border rounded-sm text-left text-[15px] transition-all ${getOptionStyle(i)}`}
            whileTap={!answered ? { scale: 0.98 } : undefined}
          >
            <span className="font-mono text-xs text-ink-faint mr-2">{String.fromCharCode(65 + i)}</span>
            {option}
          </motion.button>
        ))}
      </div>

      {answered && step.explanation && (
        <motion.div
          className={`text-sm px-4 py-3 rounded-sm text-center border ${
            selected === step.correctIndex
              ? 'text-[var(--feedback-correct)] bg-[var(--feedback-correct)]/5 border-[var(--feedback-correct)]/20'
              : 'text-ink-muted bg-card border-edge'
          }`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {step.explanation}
        </motion.div>
      )}
    </motion.div>
  );
}
