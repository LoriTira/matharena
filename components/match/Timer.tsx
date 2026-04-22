'use client';

import { useTimer } from '@/hooks/useTimer';
import { GameTimer } from '@/components/game/GameTimer';

interface TimerProps {
  startTime: string | null;
  isRunning: boolean;
}

export function Timer({ startTime, isRunning }: TimerProps) {
  const { elapsed } = useTimer(startTime, isRunning);

  return (
    <div className="text-center">
      <GameTimer elapsedMs={elapsed * 1000} variant="compact" />
    </div>
  );
}
