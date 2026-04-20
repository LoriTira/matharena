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
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!disabled && !locked) inputRef.current?.focus();
  }, [disabled, locked]);

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
    inputRef.current?.focus();
    requestAnimationFrame(() => {
      submittingRef.current = false;
    });
  };

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

  const borderColor =
    feedback === 'correct' ? 'var(--neon-lime)'
    : feedback === 'wrong' || locked ? 'var(--neon-magenta)'
    : 'var(--neon-cyan)';
  const bgTint =
    feedback === 'correct' ? 'rgba(166,255,77,0.06)'
    : feedback === 'wrong' || locked ? 'rgba(255,42,127,0.08)'
    : 'transparent';

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div
        className="relative flex items-center gap-3 px-4 md:px-5 py-3 md:py-4 border-2"
        style={{
          borderColor,
          background: `linear-gradient(180deg, ${bgTint}, var(--bg-panel))`,
          boxShadow: locked
            ? `0 0 24px rgba(255,42,127,0.25), inset 0 0 20px rgba(255,42,127,0.1)`
            : `0 0 24px ${borderColor}33, inset 0 0 20px ${borderColor}11`,
        }}
      >
        <span className="font-mono text-cyan text-[16px] md:text-[22px]">❯</span>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          pattern="[0-9.\-]*"
          enterKeyHint="go"
          value={value}
          onChange={(e) => {
            if (locked || disabled) return;
            setValue(e.target.value);
          }}
          readOnly={locked || disabled}
          aria-disabled={locked || disabled}
          className="flex-1 min-w-0 bg-transparent text-left font-display font-extrabold text-[24px] md:text-[40px] tracking-[-1px] text-gold placeholder:text-ink-faint placeholder:font-mono placeholder:text-[14px] placeholder:font-normal focus:outline-none"
          placeholder={locked ? '' : 'your answer'}
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={locked || disabled || !value}
          onMouseDown={(e) => e.preventDefault()}
          className="font-mono text-[10px] md:text-[11px] text-ink-tertiary uppercase tracking-[1.4px] disabled:opacity-30"
        >
          Enter ↵
        </button>

        {locked && (
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
          >
            <span className="font-mono text-magenta text-[13px] tracking-[1.2px] tabular-nums">
              WRONG — RETRY IN {remainingSeconds}S
            </span>
            <div className="absolute left-0 right-0 bottom-0 h-0.5">
              <div
                className="h-full transition-[width] duration-75 ease-linear"
                style={{ width: `${progressPct}%`, background: 'var(--neon-magenta)' }}
              />
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
