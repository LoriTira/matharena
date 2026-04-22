'use client';

import { formatClockMMSS, formatElapsedWithTenths } from '@/lib/format/time';

interface GameTimerProps {
  elapsedMs: number;
  variant?: 'compact' | 'prominent';
  state?: 'normal' | 'urgent' | 'critical';
  className?: string;
}

export function GameTimer({
  elapsedMs,
  variant = 'compact',
  state = 'normal',
  className = '',
}: GameTimerProps) {
  const text =
    variant === 'prominent'
      ? formatElapsedWithTenths(elapsedMs)
      : formatClockMMSS(elapsedMs);

  const sizeClass = variant === 'prominent' ? 'text-2xl' : 'text-lg';

  const colorStyle =
    state === 'critical' || state === 'urgent'
      ? { color: 'var(--feedback-wrong)' }
      : undefined;

  const colorClass = colorStyle ? '' : 'text-ink-secondary';

  const animClass = state === 'critical' ? 'animate-score-bounce' : '';

  return (
    <span
      className={`font-mono tabular-nums ${sizeClass} ${colorClass} ${animClass} ${className}`}
      style={colorStyle}
    >
      {text}
    </span>
  );
}
