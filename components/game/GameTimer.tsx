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

  const sizeClass = variant === 'prominent' ? 'text-3xl sm:text-4xl' : 'text-xl';

  const colorStyle =
    state === 'critical' || state === 'urgent'
      ? { color: 'var(--feedback-wrong)' }
      : undefined;

  const colorClass = colorStyle ? '' : 'text-ink';

  const animClass = state === 'critical' ? 'animate-score-bounce' : '';

  return (
    <span
      className={`font-mono font-black tabular-nums tracking-tight ${sizeClass} ${colorClass} ${animClass} ${className}`}
      style={colorStyle}
    >
      {text}
    </span>
  );
}
