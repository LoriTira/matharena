'use client';

import { useState, useEffect, useRef } from 'react';

export function useTimer(startTime: string | null, isRunning: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!startTime || !isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const start = new Date(startTime).getTime();

    const tick = () => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startTime, isRunning]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return { elapsed, formatted };
}
