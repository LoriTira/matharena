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
      <span className="text-2xl font-mono text-gray-300 tabular-nums">{formatted}</span>
    </div>
  );
}
