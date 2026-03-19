'use client';

import { useState, useRef, useEffect } from 'react';
import { GAME_CONFIG } from '@/lib/constants';

interface AnswerInputProps {
  onSubmit: (answer: number) => void;
  disabled?: boolean;
}

export function AnswerInput({ onSubmit, disabled = false }: AnswerInputProps) {
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

  // Attach showFeedback to the component instance via a global ref pattern
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__answerInputFeedback = showFeedback;
    return () => {
      delete (window as unknown as Record<string, unknown>).__answerInputFeedback;
    };
  }, []);

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3 max-w-md mx-auto">
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={locked || disabled}
          className={`w-full px-6 py-4 text-2xl font-mono text-center rounded-xl border-2 bg-gray-800 text-white focus:outline-none transition-colors
            ${feedback === 'correct' ? 'border-green-500 bg-green-950' : ''}
            ${feedback === 'wrong' || locked ? 'border-red-500 bg-red-950' : ''}
            ${!feedback && !locked ? 'border-gray-600 focus:border-blue-500' : ''}
          `}
          placeholder={locked ? `Wait ${Math.ceil(GAME_CONFIG.WRONG_ANSWER_PENALTY_MS / 1000)}s...` : 'Your answer'}
          autoComplete="off"
        />
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-950/50 rounded-xl">
            <span className="text-red-400 font-semibold text-lg">Wrong! Wait...</span>
          </div>
        )}
      </div>
      <button
        type="submit"
        disabled={locked || disabled || !value}
        className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xl rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        →
      </button>
    </form>
  );
}
