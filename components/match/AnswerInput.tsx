'use client';

import { useState, useRef, useEffect } from 'react';
import { GAME_CONFIG } from '@/lib/constants';

interface AnswerInputProps {
  onSubmit: (answer: number) => void;
  disabled?: boolean;
  feedbackRef?: React.MutableRefObject<((correct: boolean) => void) | null>;
}

const PENALTY_MS = GAME_CONFIG.WRONG_ANSWER_PENALTY_MS;

export function AnswerInput({ onSubmit, disabled = false, feedbackRef }: AnswerInputProps) {
  const [value, setValue] = useState('');
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const lockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Guards against a rapid double-tap firing two submit events before React
  // re-renders with the cleared value — otherwise the same answer is sent twice.
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!disabled && !locked) {
      inputRef.current?.focus();
    }
  }, [disabled, locked]);

  // Clean up timers on unmount so we never tick after teardown
  useEffect(() => {
    return () => {
      if (lockTimeoutRef.current) clearTimeout(lockTimeoutRef.current);
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value || locked || disabled || submittingRef.current) return;

    const answer = parseFloat(value);
    if (isNaN(answer)) return;

    submittingRef.current = true;
    onSubmit(answer);
    setValue('');
    // Explicit refocus keeps the mobile soft keyboard up across the parent
    // re-render that swaps in the next problem.
    inputRef.current?.focus();
    requestAnimationFrame(() => {
      submittingRef.current = false;
    });
  };

  // Exposed method to show feedback
  const showFeedback = (correct: boolean) => {
    setFeedback(correct ? 'correct' : 'wrong');

    if (!correct) {
      setLocked(true);
      setRemainingMs(PENALTY_MS);

      const startedAt = Date.now();
      tickIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startedAt;
        const remaining = Math.max(0, PENALTY_MS - elapsed);
        setRemainingMs(remaining);
        if (remaining <= 0 && tickIntervalRef.current) {
          clearInterval(tickIntervalRef.current);
          tickIntervalRef.current = null;
        }
      }, 50);

      lockTimeoutRef.current = setTimeout(() => {
        if (tickIntervalRef.current) {
          clearInterval(tickIntervalRef.current);
          tickIntervalRef.current = null;
        }
        setLocked(false);
        setFeedback(null);
        setRemainingMs(0);
        inputRef.current?.focus();
      }, PENALTY_MS);
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

  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const progressPct = locked ? (remainingMs / PENALTY_MS) * 100 : 0;

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3 max-w-md mx-auto">
      <div className="relative flex-1">
        <input
          ref={inputRef}
          // text + inputMode="decimal" gets the mobile numeric keypad without
          // type="number"'s iOS blur-on-parent-rerender quirks.
          type="text"
          inputMode="decimal"
          pattern="[0-9.\-]*"
          enterKeyHint="go"
          value={value}
          onChange={(e) => {
            if (locked || disabled) return;
            setValue(e.target.value);
          }}
          // readOnly (not disabled) keeps the mobile keyboard up during lockout.
          readOnly={locked || disabled}
          aria-disabled={locked || disabled}
          className={`w-full px-6 py-4 text-2xl sm:text-3xl font-mono font-black text-center rounded-md border-2 bg-card text-ink focus:outline-none transition-colors
            ${feedback === 'correct' ? 'border-feedback-correct bg-feedback-correct/10' : ''}
            ${feedback === 'wrong' || locked ? 'border-feedback-wrong bg-feedback-wrong/10' : ''}
            ${!feedback && !locked ? 'border-edge-strong focus:border-accent focus:ring-2 focus:ring-accent' : ''}
          `}
          placeholder={locked ? '' : 'Your answer'}
          autoComplete="off"
        />
        {locked && (
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-0 flex items-center justify-center rounded-md pointer-events-none overflow-hidden"
            style={{ backgroundColor: 'color-mix(in srgb, var(--feedback-wrong) 10%, transparent)' }}
          >
            <span className="text-feedback-wrong font-black text-sm tracking-wide tabular-nums">
              Wrong — try again in {remainingSeconds}s
            </span>
            <div
              className="absolute left-0 right-0 bottom-0 h-1 rounded-b-md"
              style={{ backgroundColor: 'color-mix(in srgb, var(--feedback-wrong) 10%, transparent)' }}
            >
              <div
                className="h-full transition-[width] duration-75 ease-linear"
                style={{ width: `${progressPct}%`, backgroundColor: 'color-mix(in srgb, var(--feedback-wrong) 60%, transparent)' }}
              />
            </div>
          </div>
        )}
      </div>
      <button
        type="submit"
        disabled={locked || disabled || !value}
        onMouseDown={(e) => e.preventDefault()}
        className="px-6 sm:px-8 py-4 bg-accent text-on-accent font-black text-xl rounded-md transition-all hover:scale-[1.02] hover:bg-accent/90 shadow-[0_4px_20px_var(--accent-glow)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        &rarr;
      </button>
    </form>
  );
}
