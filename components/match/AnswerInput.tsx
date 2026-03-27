'use client';

import { useState, useRef, useEffect } from 'react';
import { GAME_CONFIG } from '@/lib/constants';

interface AnswerInputProps {
  onSubmit: (answer: number) => void;
  disabled?: boolean;
  feedbackRef?: React.MutableRefObject<((correct: boolean) => void) | null>;
}

export function AnswerInput({ onSubmit, disabled = false, feedbackRef }: AnswerInputProps) {
  const [value, setValue] = useState('');
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled && !locked) {
      inputRef.current?.focus();
    }
  }, [disabled, locked]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value || locked || disabled) return;

    const answer = parseFloat(value);
    if (isNaN(answer)) return;

    onSubmit(answer);
    setValue('');
  };

  // Exposed method to show feedback
  const showFeedback = (correct: boolean) => {
    setFeedback(correct ? 'correct' : 'wrong');

    if (!correct) {
      setLocked(true);
      setTimeout(() => {
        setLocked(false);
        setFeedback(null);
        inputRef.current?.focus();
      }, GAME_CONFIG.WRONG_ANSWER_PENALTY_MS);
    } else {
      setTimeout(() => setFeedback(null), 500);
    }
  };

  // Attach showFeedback via ref if provided, otherwise use global pattern
  useEffect(() => {
    if (feedbackRef) {
      feedbackRef.current = showFeedback;
      return () => { feedbackRef.current = null; };
    }
    (window as unknown as Record<string, unknown>).__answerInputFeedback = showFeedback;
    return () => {
      delete (window as unknown as Record<string, unknown>).__answerInputFeedback;
    };
  }, [feedbackRef]);

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3 max-w-md mx-auto">
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={locked || disabled}
          className={`w-full px-6 py-4 text-2xl font-mono text-center rounded-sm border bg-card text-ink focus:outline-none transition-colors
            ${feedback === 'correct' ? 'border-green-400/50 bg-green-400/5' : ''}
            ${feedback === 'wrong' || locked ? 'border-red-400/50 bg-red-400/5' : ''}
            ${!feedback && !locked ? 'border-edge focus:border-edge-strong focus:ring-1 focus:ring-edge' : ''}
          `}
          placeholder={locked ? `Wait ${Math.ceil(GAME_CONFIG.WRONG_ANSWER_PENALTY_MS / 1000)}s...` : 'Your answer'}
          autoComplete="off"
        />
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-400/5 rounded-sm">
            <span className="text-red-400/60 font-medium text-sm tracking-wide">Wrong — wait...</span>
          </div>
        )}
      </div>
      <button
        type="submit"
        disabled={locked || disabled || !value}
        className="px-8 py-4 bg-btn text-btn-text font-semibold text-xl rounded-sm transition-colors hover:bg-btn-hover disabled:opacity-30 disabled:cursor-not-allowed"
      >
        &rarr;
      </button>
    </form>
  );
}
