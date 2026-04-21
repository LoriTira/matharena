'use client';

import { useTimer } from '@/hooks/useTimer';

interface TimerProps {
  startTime: string | null;
  isRunning: boolean;
}

export function Timer({ startTime, isRunning }: TimerProps) {
  const { formatted } = useTimer(startTime, isRunning);

  return (
    <div className="text-center">
      <span className="font-mono text-lg text-ink-muted tabular-nums">{formatted}</span>
    </div>
  );
}
