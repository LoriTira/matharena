'use client';

import { useTimer } from '@/hooks/useTimer';

interface TimerProps {
  startTime: string | null;
  isRunning: boolean;
}

export function Timer({ startTime, isRunning }: TimerProps) {
  const { formatted } = useTimer(startTime, isRunning);

  return (
    <span className="font-mono font-bold text-[18px] md:text-[22px] text-gold tabular-nums">
      {formatted}
    </span>
  );
}
